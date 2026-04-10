from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.database import get_session
from app.models import User, RoadmapNode
from app.models.sprint import Sprint
from app.models.monitoring_event import MonitoringEvent
from app.auth.deps import get_current_user, role_required

router = APIRouter()


class SprintStartRequest(BaseModel):
    node_id: int


class SprintStartResponse(BaseModel):
    id: int
    node_id: int
    started_at: datetime
    duration_minutes: int
    status: str


class SprintCompleteResponse(BaseModel):
    id: int
    node_id: int
    started_at: datetime
    completed_at: datetime
    duration_minutes: int
    status: str


class SprintStatsResponse(BaseModel):
    total_sprints: int
    completed_sprints: int
    total_minutes: int
    this_week_minutes: int


@router.post(
    "/start",
    response_model=SprintStartResponse,
    status_code=201,
    summary="Start a 25-min sprint",
    description="Student starts a Pomodoro sprint on a roadmap node",
)
def start_sprint(
    payload: SprintStartRequest,
    current_user: User = Depends(role_required(["student"])),
    session=Depends(get_session),
):
    node = session.get(RoadmapNode, payload.node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Roadmap node not found")

    existing_active = session.exec(
        select(Sprint).where(
            Sprint.student_id == current_user.id, Sprint.status == "active"
        )
    ).first()

    if existing_active:
        raise HTTPException(status_code=400, detail="You already have an active sprint")

    sprint = Sprint(
        student_id=current_user.id,
        node_id=payload.node_id,
        started_at=datetime.utcnow(),
        duration_minutes=25,
        status="active",
    )
    session.add(sprint)
    session.commit()
    session.refresh(sprint)

    event = MonitoringEvent(
        student_id=current_user.id,
        event_type="sprint_started",
        details_json=f'{{"node_id": {payload.node_id}, "sprint_id": {sprint.id}}}',
    )
    session.add(event)
    session.commit()

    return SprintStartResponse(
        id=sprint.id,
        node_id=sprint.node_id,
        started_at=sprint.started_at,
        duration_minutes=sprint.duration_minutes,
        status=sprint.status,
    )


@router.post(
    "/{sprint_id}/complete",
    response_model=SprintCompleteResponse,
    summary="Complete a sprint",
    description="Marks sprint as completed and logs monitoring event",
)
def complete_sprint(
    sprint_id: int,
    current_user: User = Depends(role_required(["student"])),
    session=Depends(get_session),
):
    sprint = session.get(Sprint, sprint_id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    if sprint.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your sprint")

    if sprint.status != "active":
        raise HTTPException(status_code=400, detail="Sprint is not active")

    sprint.completed_at = datetime.utcnow()
    sprint.status = "completed"
    session.add(sprint)

    event = MonitoringEvent(
        student_id=current_user.id,
        event_type="sprint_completed",
        details_json=f'{{"node_id": {sprint.node_id}, "sprint_id": {sprint.id}, "duration": {sprint.duration_minutes}}}',
    )
    session.add(event)
    session.commit()
    session.refresh(sprint)

    return SprintCompleteResponse(
        id=sprint.id,
        node_id=sprint.node_id,
        started_at=sprint.started_at,
        completed_at=sprint.completed_at,
        duration_minutes=sprint.duration_minutes,
        status=sprint.status,
    )


@router.get(
    "/active",
    response_model=Optional[SprintStartResponse],
    summary="Get active sprint",
    description="Returns current active sprint if exists",
)
def get_active_sprint(
    current_user: User = Depends(role_required(["student"])),
    session=Depends(get_session),
):
    sprint = session.exec(
        select(Sprint).where(
            Sprint.student_id == current_user.id, Sprint.status == "active"
        )
    ).first()

    if not sprint:
        return None

    return SprintStartResponse(
        id=sprint.id,
        node_id=sprint.node_id,
        started_at=sprint.started_at,
        duration_minutes=sprint.duration_minutes,
        status=sprint.status,
    )


@router.get(
    "/stats",
    response_model=SprintStatsResponse,
    summary="Get sprint statistics",
    description="Returns total and weekly sprint stats",
)
def get_sprint_stats(
    current_user: User = Depends(role_required(["student"])),
    session=Depends(get_session),
):
    from datetime import timedelta
    from sqlmodel import func

    all_sprints = session.exec(
        select(Sprint).where(
            Sprint.student_id == current_user.id, Sprint.status == "completed"
        )
    ).all()

    total_sprints = len(all_sprints)
    total_minutes = sum(s.duration_minutes for s in all_sprints if s.completed_at)

    week_ago = datetime.utcnow() - timedelta(days=7)
    this_week_sprints = [
        s for s in all_sprints if s.completed_at and s.completed_at >= week_ago
    ]
    this_week_minutes = sum(s.duration_minutes for s in this_week_sprints)

    return SprintStatsResponse(
        total_sprints=total_sprints,
        completed_sprints=total_sprints,
        total_minutes=total_minutes,
        this_week_minutes=this_week_minutes,
    )
