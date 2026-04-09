from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.database import get_session
from app.models import User
from app.models.dispute import Dispute
from app.auth.deps import get_current_user

router = APIRouter()


class DisputeCreate(BaseModel):
    category: str
    title: str
    description: str


class DisputeRead(BaseModel):
    id: int
    student_id: int
    category: str
    title: str
    description: str
    status: str
    resolution: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DisputeStatusUpdate(BaseModel):
    status: str
    resolution: Optional[str] = None


@router.post(
    "/",
    response_model=DisputeRead,
    status_code=201,
    summary="Create a new dispute",
    description="Students create a new dispute",
)
def create_dispute(
    payload: DisputeCreate,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can create disputes")

    dispute = Dispute(
        student_id=current_user.id,
        category=payload.category,
        title=payload.title,
        description=payload.description,
        status="OPEN",
    )
    session.add(dispute)
    session.commit()
    session.refresh(dispute)
    return DisputeRead(
        id=dispute.id,
        student_id=dispute.student_id,
        category=dispute.category,
        title=dispute.title,
        description=dispute.description,
        status=dispute.status,
        resolution=dispute.resolution,
        created_at=dispute.created_at,
        updated_at=dispute.updated_at,
    )


@router.get(
    "/mine",
    response_model=List[DisputeRead],
    summary="List my disputes",
    description="Get all disputes for the current student",
)
def get_my_disputes(
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=403, detail="Only students can view their disputes"
        )

    disputes = session.exec(
        select(Dispute)
        .where(Dispute.student_id == current_user.id)
        .order_by(Dispute.created_at.desc())
    ).all()

    return [
        DisputeRead(
            id=d.id,
            student_id=d.student_id,
            category=d.category,
            title=d.title,
            description=d.description,
            status=d.status,
            resolution=d.resolution,
            created_at=d.created_at,
            updated_at=d.updated_at,
        )
        for d in disputes
    ]


@router.get(
    "/",
    response_model=List[DisputeRead],
    summary="List all disputes (admin)",
    description="Admin views all disputes with optional status filter",
)
def list_disputes(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can list all disputes")

    query = select(Dispute).order_by(Dispute.created_at.desc())
    if status:
        query = query.where(Dispute.status == status.upper())

    disputes = session.exec(query).all()

    return [
        DisputeRead(
            id=d.id,
            student_id=d.student_id,
            category=d.category,
            title=d.title,
            description=d.description,
            status=d.status,
            resolution=d.resolution,
            created_at=d.created_at,
            updated_at=d.updated_at,
        )
        for d in disputes
    ]


@router.patch(
    "/{dispute_id}/status",
    response_model=DisputeRead,
    summary="Update dispute status",
    description="Admin updates dispute status and adds resolution",
)
def update_dispute_status(
    dispute_id: int,
    payload: DisputeStatusUpdate,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Only admins can update dispute status"
        )

    dispute = session.get(Dispute, dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    valid_statuses = ["OPEN", "IN_REVIEW", "RESOLVED"]
    if payload.status.upper() not in valid_statuses:
        raise HTTPException(
            status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}"
        )

    dispute.status = payload.status.upper()
    if payload.resolution:
        dispute.resolution = payload.resolution
    dispute.updated_at = datetime.utcnow()

    session.add(dispute)
    session.commit()
    session.refresh(dispute)

    return DisputeRead(
        id=dispute.id,
        student_id=dispute.student_id,
        category=dispute.category,
        title=dispute.title,
        description=dispute.description,
        status=dispute.status,
        resolution=dispute.resolution,
        created_at=dispute.created_at,
        updated_at=dispute.updated_at,
    )
