from datetime import datetime
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import select

from app.database import get_session
from app.models import MonitoringEvent
from app.auth.deps import role_required

router = APIRouter()

EventType = Literal[
    "assignment_viewed",
    "assignment_submitted",
    "roadmap_opened",
    "mentor_opened",
    "login",
    "document_uploaded",
]


class MonitoringEventIn(BaseModel):
    event_type: EventType
    student_id: int
    timestamp: Optional[datetime] = None


class MonitoringEventOut(BaseModel):
    id: int
    student_id: int
    event_type: str
    created_at: datetime


@router.post("/events", response_model=MonitoringEventOut, status_code=201)
def create_event(payload: MonitoringEventIn, session=Depends(get_session)):
    created_at = payload.timestamp or datetime.utcnow()
    evt = MonitoringEvent(
        student_id=payload.student_id,
        event_type=payload.event_type,
        created_at=created_at,
    )
    session.add(evt)
    session.commit()
    session.refresh(evt)
    return MonitoringEventOut(
        id=evt.id,
        student_id=evt.student_id,
        event_type=evt.event_type,
        created_at=evt.created_at,
    )


@router.get(
    "/events",
    response_model=List[MonitoringEventOut],
    dependencies=[Depends(role_required(["teacher", "admin"]))],
)
def list_events(
    student_id: int = Query(...),
    limit: int = 200,
    offset: int = 0,
    session=Depends(get_session),
):
    if limit > 1000:
        raise HTTPException(status_code=400, detail="limit too large")

    events = session.exec(
        select(MonitoringEvent)
        .where(MonitoringEvent.student_id == student_id)
        .order_by(MonitoringEvent.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    return [
        MonitoringEventOut(
            id=e.id,
            student_id=e.student_id,
            event_type=e.event_type,
            created_at=e.created_at,
        )
        for e in events
    ]

