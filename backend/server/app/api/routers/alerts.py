from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.database import get_session
from app.models import User
from app.models.teacher_alert import TeacherAlert
from app.auth.deps import get_current_user, role_required

router = APIRouter()


class AlertRead(BaseModel):
    id: int
    teacher_id: int
    student_id: int
    risk_score_id: Optional[int]
    severity: str
    message: str
    created_at: datetime
    read: bool


@router.get(
    "/mine",
    response_model=List[AlertRead],
    summary="Get my alerts",
    description="Teacher sees alerts for their assigned classes",
)
def get_my_alerts(
    current_user: User = Depends(role_required(["teacher"])),
    session=Depends(get_session),
):
    import json

    try:
        assigned_classes = json.loads(current_user.assigned_class_ids_json)
    except:
        assigned_classes = []

    if not assigned_classes:
        return []

    # Get students in teacher's classes
    students = session.exec(
        select(User).where(User.class_id.in_(assigned_classes), User.role == "student")
    ).all()
    student_ids = [s.id for s in students]

    if not student_ids:
        return []

    # Get alerts for these students
    alerts = session.exec(
        select(TeacherAlert)
        .where(TeacherAlert.student_id.in_(student_ids))
        .order_by(TeacherAlert.created_at.desc())
    ).all()

    return [
        AlertRead(
            id=a.id,
            teacher_id=a.teacher_id,
            student_id=a.student_id,
            risk_score_id=a.risk_score_id,
            severity=a.severity,
            message=a.message,
            created_at=a.created_at,
            read=a.read,
        )
        for a in alerts
    ]


@router.patch(
    "/{alert_id}/read",
    response_model=AlertRead,
    summary="Mark alert as read",
    description="Teacher marks an alert as read",
)
def mark_alert_read(
    alert_id: int,
    current_user: User = Depends(role_required(["teacher"])),
    session=Depends(get_session),
):
    alert = session.get(TeacherAlert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.read = True
    session.add(alert)
    session.commit()
    session.refresh(alert)

    return AlertRead(
        id=alert.id,
        teacher_id=alert.teacher_id,
        student_id=alert.student_id,
        risk_score_id=alert.risk_score_id,
        severity=alert.severity,
        message=alert.message,
        created_at=alert.created_at,
        read=alert.read,
    )
