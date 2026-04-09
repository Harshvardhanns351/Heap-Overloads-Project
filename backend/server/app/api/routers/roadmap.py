"""Veloris – Roadmap Router (feat/ai-roadmap)
Fully personalized — reads semester/branch/goal from User record, no hardcoded values.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, text
from datetime import datetime
from typing import Optional
import json

from app.database import get_session
from app.models.user import User
from app.models.roadmap import Roadmap, RoadmapNode
from app.models.mark import Mark
from app.schemas.roadmap import RoadmapGenerateRequest, NodeProgressUpdate, GoalUpdateRequest
from app.auth.deps import get_current_user, role_required
from ai_engine.roadmap_generator import generate_roadmap, generate_roadmap_fallback

router = APIRouter()


def _serialize_roadmap(roadmap: Roadmap, nodes) -> dict:
    return {
        "id": roadmap.id,
        "goal": roadmap.goal,
        "semester": roadmap.semester,
        "branch": roadmap.branch,
        "created_at": roadmap.created_at.isoformat(),
        "regenerated_at": roadmap.regenerated_at.isoformat() if roadmap.regenerated_at else None,
        "nodes": [
            {
                "id": n.id,
                "order_index": n.order_index,
                "title": n.title,
                "description": n.description,
                "hours": n.hours,
                "node_type": n.node_type,
                "status": n.status,
                "prereq_ids": json.loads(n.prereq_ids_json or "[]"),
                "resources": json.loads(n.resources_json or "[]"),
            }
            for n in nodes
        ],
    }


def _delete_roadmap_cascade(db: Session, roadmap_id: int):
    """Delete sprint → roadmapnode → roadmap in FK order."""
    db.exec(text(f"DELETE FROM sprint WHERE node_id IN (SELECT id FROM roadmapnode WHERE roadmap_id = {roadmap_id})"))
    db.exec(text(f"DELETE FROM roadmapnode WHERE roadmap_id = {roadmap_id}"))
    db.exec(text(f"DELETE FROM roadmap WHERE id = {roadmap_id}"))
    db.commit()


def _build_roadmap(db: Session, student_id: int, goal: str, semester: int, branch: str, nodes_data: list) -> tuple:
    roadmap = Roadmap(
        student_id=student_id, goal=goal, semester=semester, branch=branch,
        created_at=datetime.utcnow(), regenerated_at=datetime.utcnow(),
    )
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)

    node_objs = []
    for i, nd in enumerate(nodes_data):
        node = RoadmapNode(
            roadmap_id=roadmap.id,
            order_index=i,
            title=str(nd.get("title", f"Node {i+1}")),
            description=str(nd.get("description", "")),
            hours=int(nd.get("hours", nd.get("estimated_hours", 6)) or 6),
            node_type=str(nd.get("node_type", nd.get("type", "concept"))),
            status="in_progress" if i == 0 else "pending",
            prereq_ids_json=json.dumps(nd.get("prereq_ids", nd.get("prerequisites", []))),
            resources_json=json.dumps(nd.get("resources", [])),
        )
        db.add(node)
        node_objs.append(node)
    db.commit()
    for n in node_objs:
        db.refresh(n)
    return roadmap, node_objs


@router.get("/me", summary="Get current student's roadmap", status_code=status.HTTP_200_OK)
def get_my_roadmap(
    current_user: User = Depends(role_required(["student"])),
    db: Session = Depends(get_session),
):
    roadmap = db.exec(select(Roadmap).where(Roadmap.student_id == current_user.id)).first()
    if not roadmap:
        return {"roadmap": None, "nodes": []}
    nodes = db.exec(
        select(RoadmapNode).where(RoadmapNode.roadmap_id == roadmap.id)
        .order_by(RoadmapNode.order_index)
    ).all()
    # Also return flat nodes list for store compatibility
    result = _serialize_roadmap(roadmap, nodes)
    return {"roadmap": result, "nodes": result["nodes"]}


@router.post("/generate", summary="Generate a new roadmap", status_code=status.HTTP_201_CREATED)
def generate_my_roadmap(
    payload: RoadmapGenerateRequest,
    current_user: User = Depends(role_required(["student"])),
    db: Session = Depends(get_session),
):
    goal = payload.goal or current_user.goal or "crack placements"
    semester = payload.semester or current_user.semester or 6
    branch = payload.branch or current_user.branch or "CSE"
    duration_weeks = payload.duration_weeks or 4

    marks = db.exec(select(Mark).where(Mark.student_id == current_user.id)).all()
    marks_data = [{"subject": m.subject, "score": m.score, "max_score": m.max_score} for m in marks]

    existing = db.exec(select(Roadmap).where(Roadmap.student_id == current_user.id)).first()
    if existing:
        _delete_roadmap_cascade(db, existing.id)

    try:
        nodes_data = generate_roadmap(goal=goal, semester=semester, branch=branch,
                                      marks=marks_data, duration_weeks=duration_weeks)
    except Exception:
        nodes_data = generate_roadmap_fallback(goal=goal, branch=branch)

    roadmap, node_objs = _build_roadmap(db, current_user.id, goal, semester, branch, nodes_data)

    if goal != current_user.goal:
        current_user.goal = goal
        current_user.goal_changed_at = datetime.utcnow()
        db.add(current_user)
        db.commit()

    return {"roadmap": _serialize_roadmap(roadmap, node_objs)}


@router.post("/regenerate", summary="Regenerate roadmap with current goal", status_code=status.HTTP_200_OK)
def regenerate_roadmap(
    current_user: User = Depends(role_required(["student"])),
    db: Session = Depends(get_session),
):
    payload = RoadmapGenerateRequest(
        goal=current_user.goal,
        semester=current_user.semester,
        branch=current_user.branch,
    )
    return generate_my_roadmap(payload, current_user, db)


@router.patch("/nodes/{node_id}/progress", summary="Update node status", status_code=status.HTTP_200_OK)
def update_node_progress(
    node_id: int,
    payload: NodeProgressUpdate,
    current_user: User = Depends(role_required(["student"])),
    db: Session = Depends(get_session),
):
    node = db.get(RoadmapNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    roadmap = db.get(Roadmap, node.roadmap_id)
    if not roadmap or roadmap.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your roadmap")

    node.status = payload.status
    db.add(node)

    if payload.status == "complete":
        all_nodes = db.exec(
            select(RoadmapNode).where(RoadmapNode.roadmap_id == roadmap.id)
            .order_by(RoadmapNode.order_index)
        ).all()
        for n in all_nodes:
            if n.id != node_id and n.status == "pending":
                n.status = "in_progress"
                db.add(n)
                break
    db.commit()
    db.refresh(node)
    return {"node_id": node.id, "status": node.status}


# Keep old /nodes/{id} PATCH for backward compat
@router.patch("/nodes/{node_id}", status_code=status.HTTP_200_OK)
def update_node_compat(
    node_id: int,
    payload: NodeProgressUpdate,
    current_user: User = Depends(role_required(["student"])),
    db: Session = Depends(get_session),
):
    return update_node_progress(node_id, payload, current_user, db)


@router.patch("/goal", summary="Update student's learning goal", status_code=status.HTTP_200_OK)
def update_goal(
    payload: GoalUpdateRequest,
    current_user: User = Depends(role_required(["student"])),
    db: Session = Depends(get_session),
):
    old_goal = current_user.goal
    current_user.goal = payload.goal
    if payload.semester is not None:
        current_user.semester = payload.semester
    if payload.branch is not None:
        current_user.branch = payload.branch
    current_user.goal_changed_at = datetime.utcnow()
    db.add(current_user)
    db.commit()
    return {
        "goal": current_user.goal,
        "goal_changed": old_goal != payload.goal,
        "message": "Goal updated. Regenerate your roadmap to apply changes.",
    }


@router.get("/me/stats", summary="Get roadmap completion stats", status_code=status.HTTP_200_OK)
def get_roadmap_stats(
    current_user: User = Depends(role_required(["student"])),
    db: Session = Depends(get_session),
):
    roadmap = db.exec(select(Roadmap).where(Roadmap.student_id == current_user.id)).first()
    if not roadmap:
        return {"has_roadmap": False}
    nodes = db.exec(select(RoadmapNode).where(RoadmapNode.roadmap_id == roadmap.id)).all()
    completed = sum(1 for n in nodes if n.status == "complete")
    return {
        "has_roadmap": True,
        "total_nodes": len(nodes),
        "completed": completed,
        "in_progress": sum(1 for n in nodes if n.status == "in_progress"),
        "pending": sum(1 for n in nodes if n.status == "pending"),
        "completion_pct": round((completed / len(nodes)) * 100) if nodes else 0,
        "total_hours": sum(n.hours for n in nodes),
        "hours_remaining": sum(n.hours for n in nodes if n.status != "complete"),
    }
