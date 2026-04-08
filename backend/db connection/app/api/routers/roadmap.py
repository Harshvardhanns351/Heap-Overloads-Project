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


StatusIn = Literal["complete", "in_progress", "pending"]


class UpdateNodeRequest(BaseModel):
    status: StatusIn


def _node_status_map(status: str) -> str:
    # Store using spec values in DB as well (simple).
    if status in ("pending", "in_progress", "complete"):
        return status
    return "pending"


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
        id=n.id,
        roadmap_id=n.roadmap_id,
        order_index=n.order_index,
        title=n.title,
        description=n.description,
        hours=n.hours,
        node_type=n.node_type,
        status=n.status,
        prereq_ids=prereq if isinstance(prereq, list) else [],
        resources=resources if isinstance(resources, list) else [],
    )


def _marks_for_student(session, student_id: int) -> List[Dict[str, Any]]:
    marks = session.exec(select(Mark).where(Mark.student_id == student_id)).all()
    out: List[Dict[str, Any]] = []
    for m in marks:
        pct = None
        try:
            pct = float(m.score) / float(m.max_score) * 100.0 if m.max_score else None
        except Exception:
            pct = None
        out.append(
            {
                "subject": m.subject,
                "score": float(m.score),
                "max_score": float(m.max_score),
                "semester": int(m.semester),
                "percentage": pct,
            }
        )
    return out


def _create_roadmap_from_generated(
    session,
    student: User,
    goal: str,
    semester: int,
    branch: str,
    generated: Dict[str, Any],
) -> Roadmap:
    roadmap = Roadmap(
        student_id=student.id, goal=goal, semester=semester, branch=branch
    )
    session.add(roadmap)
    session.commit()
    session.refresh(roadmap)

    nodes = generated.get("nodes") or []
    if not isinstance(nodes, list) or not nodes:
        raise HTTPException(
            status_code=500, detail="Roadmap generator returned no nodes"
        )

    for idx, node in enumerate(nodes):
        if not isinstance(node, dict):
            continue
        rn = RoadmapNode(
            roadmap_id=roadmap.id,
            order_index=idx,
            title=str(node.get("title", f"Node {idx + 1}")),
            description=str(node.get("description", "")),
            hours=int(node.get("estimated_hours", node.get("hours", 0)) or 0),
            node_type=str(node.get("type", node.get("node_type", "concept"))),
            status=_node_status_map(str(node.get("status", "pending"))),
            prereq_ids_json=json.dumps(node.get("prerequisites", [])),
            resources_json=json.dumps(node.get("resources", [])),
        )
        session.add(rn)

    session.commit()
    return roadmap


@router.get(
    "/me",
    response_model=RoadmapOut,
    dependencies=[Depends(role_required(["student"]))],
)
def get_my_roadmap(
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    roadmap = session.exec(
        select(Roadmap).where(Roadmap.student_id == current_user.id)
    ).first()

    semester = current_user.semester or 6
    branch = current_user.branch or "CSE"
    goal = current_user.goal or "crack placements"

    if not roadmap:
        marks = _marks_for_student(session, current_user.id)
        generated = generate_roadmap(
            goal=goal, semester=semester, branch=branch, marks=marks
        )
        roadmap = _create_roadmap_from_generated(
            session, current_user, goal, semester, branch, generated
        )
    elif (
        roadmap.goal != goal or roadmap.semester != semester or roadmap.branch != branch
    ):
        marks = _marks_for_student(session, current_user.id)
        generated = generate_roadmap(
            goal=goal, semester=semester, branch=branch, marks=marks
        )
        nodes = session.exec(
            select(RoadmapNode).where(RoadmapNode.roadmap_id == roadmap.id)
        ).all()
        for n in nodes:
            session.delete(n)
        roadmap.goal = goal
        roadmap.semester = semester
        roadmap.branch = branch
        roadmap.regenerated_at = datetime.utcnow()

        nodes = generated.get("nodes") or []
        for idx, node in enumerate(nodes):
            if not isinstance(node, dict):
                continue
            rn = RoadmapNode(
                roadmap_id=roadmap.id,
                order_index=idx,
                title=str(node.get("title", f"Node {idx + 1}")),
                description=str(node.get("description", "")),
                hours=int(node.get("estimated_hours", node.get("hours", 0)) or 0),
                node_type=str(node.get("type", node.get("node_type", "concept"))),
                status="pending",
                prereq_ids_json=json.dumps(node.get("prerequisites", [])),
                resources_json=json.dumps(node.get("resources", [])),
            )
            session.add(rn)
        session.add(roadmap)
        session.commit()

    nodes = session.exec(
        select(RoadmapNode)
        .where(RoadmapNode.roadmap_id == roadmap.id)
        .order_by(RoadmapNode.order_index.asc())
    ).all()

    title = f"{roadmap.branch} Semester {roadmap.semester} Roadmap"
    return RoadmapOut(
        id=roadmap.id,
        student_id=roadmap.student_id,
        goal=roadmap.goal,
        semester=roadmap.semester,
        branch=roadmap.branch,
        title=title,
        created_at=roadmap.created_at,
        regenerated_at=roadmap.regenerated_at,
        nodes=[_node_from_db(n) for n in nodes],
    )


@router.patch(
    "/nodes/{node_id}",
    response_model=RoadmapNodeOut,
    dependencies=[Depends(role_required(["student"]))],
)
def update_node(
    node_id: int,
    payload: UpdateNodeRequest,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    node = session.get(RoadmapNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    roadmap = session.get(Roadmap, node.roadmap_id)
    if not roadmap or roadmap.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    new_status = payload.status
    if new_status == "complete":
        node.status = "complete"
        # Set next pending node to in_progress automatically
        next_node = session.exec(
            select(RoadmapNode)
            .where(RoadmapNode.roadmap_id == node.roadmap_id)
            .where(RoadmapNode.order_index > node.order_index)
            .order_by(RoadmapNode.order_index.asc())
        ).first()
        if next_node and next_node.status == "pending":
            next_node.status = "in_progress"
            session.add(next_node)
    else:
        node.status = new_status

    session.add(node)
    session.commit()
    session.refresh(node)
    return _node_from_db(node)


@router.post(
    "/regenerate",
    response_model=RoadmapOut,
    dependencies=[Depends(role_required(["student"]))],
)
def regenerate(
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    existing = session.exec(
        select(Roadmap).where(Roadmap.student_id == current_user.id)
    ).first()
    if existing:
        nodes = session.exec(
            select(RoadmapNode).where(RoadmapNode.roadmap_id == existing.id)
        ).all()
        for n in nodes:
            session.delete(n)
        session.delete(existing)
        session.commit()

    marks = _marks_for_student(session, current_user.id)
    semester = current_user.semester or 6
    branch = current_user.branch or "CSE"
    goal = current_user.goal or "crack placements"
    generated = generate_roadmap(
        goal=goal, semester=semester, branch=branch, marks=marks
    )
    roadmap = _create_roadmap_from_generated(
        session, current_user, goal, semester, branch, generated
    )
    roadmap.regenerated_at = datetime.utcnow()
    session.add(roadmap)
    session.commit()
    session.refresh(roadmap)

    nodes = session.exec(
        select(RoadmapNode)
        .where(RoadmapNode.roadmap_id == roadmap.id)
        .order_by(RoadmapNode.order_index.asc())
    ).all()

    title = f"{roadmap.branch} Semester {roadmap.semester} Roadmap"
    return RoadmapOut(
        id=roadmap.id,
        student_id=roadmap.student_id,
        goal=roadmap.goal,
        semester=roadmap.semester,
        branch=roadmap.branch,
        title=title,
        created_at=roadmap.created_at,
        regenerated_at=roadmap.regenerated_at,
        nodes=[_node_from_db(n) for n in nodes],
    )


class GoalUpdate(BaseModel):
    goal: str
    semester: int | None = None
    branch: str | None = None


@router.patch(
    "/goal",
    response_model=RoadmapOut,
    dependencies=[Depends(role_required(["student"]))],
)
def update_goal(
    payload: GoalUpdate,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    current_user.goal = payload.goal
    if payload.semester is not None:
        current_user.semester = payload.semester
    if payload.branch is not None:
        current_user.branch = payload.branch
    current_user.goal_changed_at = datetime.utcnow()
    session.add(current_user)
    session.commit()

    roadmap = session.exec(
        select(Roadmap).where(Roadmap.student_id == current_user.id)
    ).first()
    if roadmap:
        nodes = session.exec(
            select(RoadmapNode).where(RoadmapNode.roadmap_id == roadmap.id)
        ).all()
        for n in nodes:
            session.delete(n)
        roadmap.goal = payload.goal
        roadmap.semester = current_user.semester or 6
        roadmap.branch = current_user.branch or "CSE"
        roadmap.regenerated_at = datetime.utcnow()
        session.add(roadmap)

        marks = _marks_for_student(session, current_user.id)
        generated = generate_roadmap(
            goal=payload.goal,
            semester=roadmap.semester,
            branch=roadmap.branch,
            marks=marks,
        )

        nodes = generated.get("nodes") or []
        for idx, node in enumerate(nodes):
            if not isinstance(node, dict):
                continue
            rn = RoadmapNode(
                roadmap_id=roadmap.id,
                order_index=idx,
                title=str(node.get("title", f"Node {idx + 1}")),
                description=str(node.get("description", "")),
                hours=int(node.get("estimated_hours", node.get("hours", 0)) or 0),
                node_type=str(node.get("type", node.get("node_type", "concept"))),
                status="pending",
                prereq_ids_json=json.dumps(node.get("prerequisites", [])),
                resources_json=json.dumps(node.get("resources", [])),
            )
            session.add(rn)

        session.commit()

        nodes = session.exec(
            select(RoadmapNode)
            .where(RoadmapNode.roadmap_id == roadmap.id)
            .order_by(RoadmapNode.order_index.asc())
        ).all()

        title = f"{roadmap.branch} Semester {roadmap.semester} Roadmap"
        return RoadmapOut(
            id=roadmap.id,
            student_id=roadmap.student_id,
            goal=roadmap.goal,
            semester=roadmap.semester,
            branch=roadmap.branch,
            title=title,
            created_at=roadmap.created_at,
            regenerated_at=roadmap.regenerated_at,
            nodes=[_node_from_db(n) for n in nodes],
        )

    return {"detail": "Goal updated. Generate roadmap to see changes."}


def regenerate(
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    existing = session.exec(
        select(Roadmap).where(Roadmap.student_id == current_user.id)
    ).first()
    if existing:
        nodes = session.exec(
            select(RoadmapNode).where(RoadmapNode.roadmap_id == existing.id)
        ).all()
        for n in nodes:
            session.delete(n)
        session.delete(existing)
        session.commit()

    marks = _marks_for_student(session, current_user.id)
    semester = 6
    branch = "CSE"
    goal = "crack placements"
    generated = generate_roadmap(
        goal=goal, semester=semester, branch=branch, marks=marks
    )
    roadmap = _create_roadmap_from_generated(
        session, current_user, goal, semester, branch, generated
    )
    roadmap.regenerated_at = datetime.utcnow()
    session.add(roadmap)
    session.commit()
    session.refresh(roadmap)

    nodes = session.exec(
        select(RoadmapNode)
        .where(RoadmapNode.roadmap_id == roadmap.id)
        .order_by(RoadmapNode.order_index.asc())
    ).all()

    title = f"{roadmap.branch} Semester {roadmap.semester} Roadmap"
    return RoadmapOut(
        id=roadmap.id,
        student_id=roadmap.student_id,
        goal=roadmap.goal,
        semester=roadmap.semester,
        branch=roadmap.branch,
        title=title,
        created_at=roadmap.created_at,
        regenerated_at=roadmap.regenerated_at,
        nodes=[_node_from_db(n) for n in nodes],
    )
