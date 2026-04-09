"""Veloris – Roadmap Router
Multi-roadmap: up to 3 active roadmaps per student. Switch between them. 
New generation blocked until all 3 are completed.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, text
from datetime import datetime
import json

from app.database import get_session
from app.models.user import User
from app.models.roadmap import Roadmap, RoadmapNode
from app.models.mark import Mark
from app.schemas.roadmap import RoadmapGenerateRequest, NodeProgressUpdate, GoalUpdateRequest
from app.auth.deps import get_current_user, role_required
from ai_engine.roadmap_generator import generate_roadmap, generate_roadmap_fallback

router = APIRouter()
MAX_ROADMAPS = 3


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize(roadmap: Roadmap, nodes) -> dict:
    completed = sum(1 for n in nodes if n.status == "complete")
    total = len(nodes)
    return {
        "id": roadmap.id,
        "goal": roadmap.goal,
        "semester": roadmap.semester,
        "branch": roadmap.branch,
        "difficulty": roadmap.difficulty,
        "timeframe_days": roadmap.timeframe_days,
        "is_active": roadmap.is_active,
        "is_completed": roadmap.is_completed,
        "completion_pct": round((completed / total) * 100) if total else 0,
        "completed_nodes": completed,
        "total_nodes": total,
        "created_at": roadmap.created_at.isoformat(),
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


def _cascade_delete(db: Session, roadmap_id: int):
    db.exec(text(f"DELETE FROM sprint WHERE node_id IN (SELECT id FROM roadmapnode WHERE roadmap_id = {roadmap_id})"))
    db.exec(text(f"DELETE FROM roadmapnode WHERE roadmap_id = {roadmap_id}"))
    db.exec(text(f"DELETE FROM roadmap WHERE id = {roadmap_id}"))
    db.commit()


def _get_nodes(db: Session, roadmap_id: int):
    return db.exec(
        select(RoadmapNode).where(RoadmapNode.roadmap_id == roadmap_id)
        .order_by(RoadmapNode.order_index)
    ).all()


def _check_completed(nodes) -> bool:
    return len(nodes) > 0 and all(n.status == "complete" for n in nodes)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/list", summary="List all student roadmaps", status_code=status.HTTP_200_OK)
def list_roadmaps(
    current_user: User = Depends(role_required(["student"])),
    db: Session = Depends(get_session),
):
    roadmaps = db.exec(
        select(Roadmap).where(Roadmap.student_id == current_user.id)
        .order_by(Roadmap.created_at.desc())
    ).all()

    result = []
    for rm in roadmaps:
        nodes = _get_nodes(db, rm.id)
        # Auto-mark completed if all nodes done
        if not rm.is_completed and _check_completed(nodes):
            rm.is_completed = True
            db.add(rm)
            db.commit()
        result.append(_serialize(rm, nodes))

    active_count = sum(1 for r in result if not r["is_completed"])
    all_completed = active_count == 0 and len(result) >= MAX_ROADMAPS
    can_generate = len(result) < MAX_ROADMAPS or all_completed

    return {
        "roadmaps": result,
        "count": len(result),
        "can_generate": can_generate,
        "slots_used": len(result),
        "max_slots": MAX_ROADMAPS,
        "all_completed": all_completed,
    }


@router.get("/me", summary="Get active roadmap", status_code=status.HTTP_200_OK)
def get_active_roadmap(
    current_user: User = Depends(role_required(["student"])),
    db: Session = Depends(get_session),
):
    # Return the active roadmap, or most recent if none marked active
    roadmap = db.exec(
        select(Roadmap)
        .where(Roadmap.student_id == current_user.id)
        .where(Roadmap.is_active == True)
    ).first()

    if not roadmap:
        roadmap = db.exec(
            select(Roadmap).where(Roadmap.student_id == current_user.id)
            .order_by(Roadmap.created_at.desc())
        ).first()

    if not roadmap:
        return {"roadmap": None, "nodes": []}

    nodes = _get_nodes(db, roadmap.id)
    result = _serialize(roadmap, nodes)
    return {"roadmap": result, "nodes": result["nodes"]}


@router.post("/activate/{roadmap_id}", summary="Switch active roadmap", status_code=status.HTTP_200_OK)
def activate_roadmap(
    roadmap_id: int,
    current_user: User = Depends(role_required(["student"])),
    db: Session = Depends(get_session),
):
    # Deactivate all
    all_roadmaps = db.exec(select(Roadmap).where(Roadmap.student_id == current_user.id)).all()
    for rm in all_roadmaps:
        rm.is_active = False
        db.add(rm)

    # Activate target
    target = db.get(Roadmap, roadmap_id)
    if not target or target.student_id != current_user.id:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    target.is_active = True
    db.add(target)
    db.commit()

    nodes = _get_nodes(db, target.id)
    return {"roadmap": _serialize(target, nodes)}


@router.post("/generate", summary="Generate a new roadmap", status_code=status.HTTP_201_CREATED)
def generate_my_roadmap(
    payload: RoadmapGenerateRequest,
    current_user: User = Depends(role_required(["student"])),
    db: Session = Depends(get_session),
):
    existing = db.exec(select(Roadmap).where(Roadmap.student_id == current_user.id)).all()

    # Check slot limit
    if len(existing) >= MAX_ROADMAPS:
        # Allow only if ALL existing are completed
        all_nodes_per_rm = [_get_nodes(db, rm.id) for rm in existing]
        all_done = all(_check_completed(nodes) for nodes in all_nodes_per_rm)
        if not all_done:
            incomplete = sum(1 for nodes in all_nodes_per_rm if not _check_completed(nodes))
            raise HTTPException(
                status_code=400,
                detail=f"You have {MAX_ROADMAPS} roadmaps. Complete all {incomplete} incomplete roadmap(s) before generating new ones."
            )
        # All done — wipe them all and start fresh
        for rm in existing:
            _cascade_delete(db, rm.id)

    goal = payload.goal or current_user.goal or "crack placements"
    semester = payload.semester or current_user.semester or 6
    branch = payload.branch or current_user.branch or "CSE"
    difficulty = payload.difficulty or "intermediate"
    timeframe_days = payload.timeframe_days or 30

    marks = db.exec(select(Mark).where(Mark.student_id == current_user.id)).all()
    marks_data = [{"subject": m.subject, "score": m.score, "max_score": m.max_score} for m in marks]

    try:
        nodes_data = generate_roadmap(
            goal=goal, semester=semester, branch=branch,
            marks=marks_data, difficulty=difficulty, timeframe_days=timeframe_days,
        )
    except Exception:
        nodes_data = generate_roadmap_fallback(goal=goal, branch=branch)

    # Deactivate all existing, new one will be active
    for rm in db.exec(select(Roadmap).where(Roadmap.student_id == current_user.id)).all():
        rm.is_active = False
        db.add(rm)
    db.commit()

    roadmap = Roadmap(
        student_id=current_user.id, goal=goal, semester=semester, branch=branch,
        difficulty=difficulty, timeframe_days=timeframe_days,
        is_active=True, is_completed=False,
        created_at=datetime.utcnow(),
    )
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)

    node_objs = []
    for i, nd in enumerate(nodes_data):
        node = RoadmapNode(
            roadmap_id=roadmap.id, order_index=i,
            title=str(nd.get("title", f"Node {i+1}")),
            description=str(nd.get("description", "")),
            hours=int(nd.get("hours", nd.get("estimated_hours", 6)) or 6),
            node_type=str(nd.get("node_type", nd.get("type", "concept"))),
            status="in_progress" if i == 0 else "pending",
            prereq_ids_json=json.dumps(nd.get("prereq_ids", [])),
            resources_json=json.dumps(nd.get("resources", [])),
        )
        db.add(node)
        node_objs.append(node)
    db.commit()
    for n in node_objs:
        db.refresh(n)

    if goal != current_user.goal:
        current_user.goal = goal
        current_user.goal_changed_at = datetime.utcnow()
        db.add(current_user)
        db.commit()

    return {"roadmap": _serialize(roadmap, node_objs)}


@router.delete("/{roadmap_id}", summary="Delete a roadmap", status_code=status.HTTP_200_OK)
def delete_roadmap(
    roadmap_id: int,
    current_user: User = Depends(role_required(["student"])),
    db: Session = Depends(get_session),
):
    rm = db.get(Roadmap, roadmap_id)
    if not rm or rm.student_id != current_user.id:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    _cascade_delete(db, roadmap_id)
    return {"deleted": roadmap_id}


@router.patch("/nodes/{node_id}/progress", status_code=status.HTTP_200_OK)
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
        all_nodes = _get_nodes(db, roadmap.id)
        for n in all_nodes:
            if n.id != node_id and n.status == "pending":
                n.status = "in_progress"
                db.add(n)
                break
        # Auto-complete roadmap if all nodes done
        updated_nodes = _get_nodes(db, roadmap.id)
        if _check_completed(updated_nodes):
            roadmap.is_completed = True
            db.add(roadmap)

    db.commit()
    db.refresh(node)
    return {"node_id": node.id, "status": node.status}


@router.patch("/nodes/{node_id}", status_code=status.HTTP_200_OK)
def update_node_compat(
    node_id: int, payload: NodeProgressUpdate,
    current_user: User = Depends(role_required(["student"])),
    db: Session = Depends(get_session),
):
    return update_node_progress(node_id, payload, current_user, db)


@router.patch("/goal", status_code=status.HTTP_200_OK)
def update_goal(
    payload: GoalUpdateRequest,
    current_user: User = Depends(role_required(["student"])),
    db: Session = Depends(get_session),
):
    current_user.goal = payload.goal
    if payload.semester is not None:
        current_user.semester = payload.semester
    if payload.branch is not None:
        current_user.branch = payload.branch
    current_user.goal_changed_at = datetime.utcnow()
    db.add(current_user)
    db.commit()
    return {"goal": current_user.goal, "message": "Goal updated."}


@router.get("/me/stats", status_code=status.HTTP_200_OK)
def get_roadmap_stats(
    current_user: User = Depends(role_required(["student"])),
    db: Session = Depends(get_session),
):
    roadmap = db.exec(
        select(Roadmap).where(Roadmap.student_id == current_user.id).where(Roadmap.is_active == True)
    ).first()
    if not roadmap:
        return {"has_roadmap": False}
    nodes = _get_nodes(db, roadmap.id)
    completed = sum(1 for n in nodes if n.status == "complete")
    return {
        "has_roadmap": True,
        "total_nodes": len(nodes),
        "completed": completed,
        "completion_pct": round((completed / len(nodes)) * 100) if nodes else 0,
        "hours_remaining": sum(n.hours for n in nodes if n.status != "complete"),
    }
