import json
from datetime import datetime
from typing import List, Optional, Literal, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.database import get_session
from app.models import Roadmap, RoadmapNode, Mark, User
from app.auth.deps import get_current_user, role_required
from ai_engine.roadmap_generator import generate as generate_roadmap

router = APIRouter()


class RoadmapNodeOut(BaseModel):
    id: int
    roadmap_id: int
    order_index: int
    title: str
    description: str
    hours: int
    node_type: str
    status: str
    prereq_ids: List[int]
    resources: List[str]


class RoadmapOut(BaseModel):
    id: int
    student_id: int
    goal: str
    semester: int
    branch: str
    title: str
    created_at: datetime
    regenerated_at: Optional[datetime]
    nodes: List[RoadmapNodeOut]


class UpdateNodeRequest(BaseModel):
    status: Literal["complete", "in_progress", "pending"]


class GoalUpdate(BaseModel):
    goal: str
    semester: Optional[int] = None
    branch: Optional[str] = None


def _node_from_db(n: RoadmapNode) -> RoadmapNodeOut:
    try:
        prereq = json.loads(n.prereq_ids_json or "[]")
    except Exception:
        prereq = []
    try:
        resources = json.loads(n.resources_json or "[]")
    except Exception:
        resources = []
    return RoadmapNodeOut(
        id=n.id, roadmap_id=n.roadmap_id, order_index=n.order_index,
        title=n.title, description=n.description, hours=n.hours,
        node_type=n.node_type, status=n.status,
        prereq_ids=prereq if isinstance(prereq, list) else [],
        resources=resources if isinstance(resources, list) else [],
    )


def _marks_for_student(session, student_id: int) -> List[Dict[str, Any]]:
    marks = session.exec(select(Mark).where(Mark.student_id == student_id)).all()
    out = []
    for m in marks:
        try:
            pct = float(m.score) / float(m.max_score) * 100.0 if m.max_score else None
        except Exception:
            pct = None
        out.append({"subject": m.subject, "score": float(m.score),
                    "max_score": float(m.max_score), "semester": int(m.semester), "percentage": pct})
    return out


def _build_nodes(session, roadmap_id: int, generated: Dict[str, Any], first_status: str = "in_progress"):
    nodes = generated.get("nodes") or []
    if not isinstance(nodes, list) or not nodes:
        raise HTTPException(status_code=500, detail="Roadmap generator returned no nodes")
    for idx, node in enumerate(nodes):
        if not isinstance(node, dict):
            continue
        status = first_status if idx == 0 else "pending"
        rn = RoadmapNode(
            roadmap_id=roadmap_id, order_index=idx,
            title=str(node.get("title", f"Node {idx + 1}")),
            description=str(node.get("description", "")),
            hours=int(node.get("estimated_hours", node.get("hours", 0)) or 0),
            node_type=str(node.get("type", node.get("node_type", "concept"))),
            status=status,
            prereq_ids_json=json.dumps(node.get("prerequisites", [])),
            resources_json=json.dumps(node.get("resources", [])),
        )
        session.add(rn)
    session.commit()


def _roadmap_out(roadmap: Roadmap, nodes) -> RoadmapOut:
    return RoadmapOut(
        id=roadmap.id, student_id=roadmap.student_id,
        goal=roadmap.goal, semester=roadmap.semester, branch=roadmap.branch,
        title=f"{roadmap.branch} Sem {roadmap.semester} — {roadmap.goal}",
        created_at=roadmap.created_at, regenerated_at=roadmap.regenerated_at,
        nodes=[_node_from_db(n) for n in nodes],
    )


@router.get("/me", response_model=RoadmapOut, dependencies=[Depends(role_required(["student"]))])
def get_my_roadmap(current_user: User = Depends(get_current_user), session=Depends(get_session)):
    roadmap = session.exec(select(Roadmap).where(Roadmap.student_id == current_user.id)).first()
    semester = current_user.semester or 6
    branch = current_user.branch or "CSE"
    goal = current_user.goal or "crack placements"

    if not roadmap:
        marks = _marks_for_student(session, current_user.id)
        generated = generate_roadmap(goal=goal, semester=semester, branch=branch, marks=marks)
        roadmap = Roadmap(student_id=current_user.id, goal=goal, semester=semester, branch=branch)
        session.add(roadmap)
        session.commit()
        session.refresh(roadmap)
        _build_nodes(session, roadmap.id, generated)

    nodes = session.exec(
        select(RoadmapNode).where(RoadmapNode.roadmap_id == roadmap.id)
        .order_by(RoadmapNode.order_index.asc())
    ).all()
    return _roadmap_out(roadmap, nodes)


@router.post("/regenerate", response_model=RoadmapOut, dependencies=[Depends(role_required(["student"]))])
def regenerate(current_user: User = Depends(get_current_user), session=Depends(get_session)):
    existing = session.exec(select(Roadmap).where(Roadmap.student_id == current_user.id)).first()
    if existing:
        from sqlmodel import text
        roadmap_id = existing.id
        session.exec(text(f"DELETE FROM sprint WHERE node_id IN (SELECT id FROM roadmapnode WHERE roadmap_id = {roadmap_id})"))
        session.exec(text(f"DELETE FROM roadmapnode WHERE roadmap_id = {roadmap_id}"))
        session.exec(text(f"DELETE FROM roadmap WHERE id = {roadmap_id}"))
        session.commit()

    semester = current_user.semester or 6
    branch = current_user.branch or "CSE"
    goal = current_user.goal or "crack placements"
    marks = _marks_for_student(session, current_user.id)
    generated = generate_roadmap(goal=goal, semester=semester, branch=branch, marks=marks)

    roadmap = Roadmap(student_id=current_user.id, goal=goal, semester=semester, branch=branch,
                      regenerated_at=datetime.utcnow())
    session.add(roadmap)
    session.commit()
    session.refresh(roadmap)
    _build_nodes(session, roadmap.id, generated)

    nodes = session.exec(
        select(RoadmapNode).where(RoadmapNode.roadmap_id == roadmap.id)
        .order_by(RoadmapNode.order_index.asc())
    ).all()
    return _roadmap_out(roadmap, nodes)


@router.patch("/nodes/{node_id}", response_model=RoadmapNodeOut, dependencies=[Depends(role_required(["student"]))])
def update_node(node_id: int, payload: UpdateNodeRequest,
                current_user: User = Depends(get_current_user), session=Depends(get_session)):
    node = session.get(RoadmapNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    roadmap = session.get(Roadmap, node.roadmap_id)
    if not roadmap or roadmap.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    node.status = "completed" if payload.status == "complete" else payload.status
    if payload.status == "complete":
        next_node = session.exec(
            select(RoadmapNode).where(RoadmapNode.roadmap_id == node.roadmap_id)
            .where(RoadmapNode.order_index > node.order_index)
            .order_by(RoadmapNode.order_index.asc())
        ).first()
        if next_node and next_node.status == "pending":
            next_node.status = "in_progress"
            session.add(next_node)

    session.add(node)
    session.commit()
    session.refresh(node)
    return _node_from_db(node)


@router.patch("/goal", dependencies=[Depends(role_required(["student"]))])
def update_goal(payload: GoalUpdate, current_user: User = Depends(get_current_user),
                session=Depends(get_session)):
    current_user.goal = payload.goal
    if payload.semester is not None:
        current_user.semester = payload.semester
    if payload.branch is not None:
        current_user.branch = payload.branch
    current_user.goal_changed_at = datetime.utcnow()
    session.add(current_user)
    session.commit()
    return {"detail": "Goal updated", "goal": current_user.goal,
            "semester": current_user.semester, "branch": current_user.branch}
