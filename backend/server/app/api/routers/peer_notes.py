from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.database import get_session
from app.models import User
from app.models.peer_note import PeerNote
from app.auth.deps import get_current_user, role_required

router = APIRouter()


class PeerNoteCreate(BaseModel):
    class_id: str
    subject: str
    topic: str
    content: str


class PeerNoteRead(BaseModel):
    id: int
    class_id: str
    subject: str
    topic: str
    content: str
    upvotes: int
    is_approved: bool
    created_by: int
    created_at: datetime


class PeerNoteVote(BaseModel):
    upvote: bool


@router.post(
    "/",
    response_model=PeerNoteRead,
    status_code=201,
    summary="Create peer note",
    description="Student posts anonymous note on a topic",
)
def create_note(
    payload: PeerNoteCreate,
    current_user: User = Depends(role_required(["student"])),
    session=Depends(get_session),
):
    note = PeerNote(
        class_id=payload.class_id,
        subject=payload.subject,
        topic=payload.topic,
        content=payload.content,
        created_by=current_user.id,
        is_approved=True,
    )
    session.add(note)
    session.commit()
    session.refresh(note)

    return PeerNoteRead(
        id=note.id,
        class_id=note.class_id,
        subject=note.subject,
        topic=note.topic,
        content=note.content,
        upvotes=note.upvotes,
        is_approved=note.is_approved,
        created_by=note.created_by,
        created_at=note.created_at,
    )


@router.get(
    "/",
    response_model=List[PeerNoteRead],
    summary="Get peer notes",
    description="Get approved notes for a class/subject/topic",
)
def get_notes(
    class_id: Optional[str] = None,
    subject: Optional[str] = None,
    topic: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    query = select(PeerNote).where(PeerNote.is_approved == True)

    if class_id:
        query = query.where(PeerNote.class_id == class_id)
    if subject:
        query = query.where(PeerNote.subject == subject)
    if topic:
        query = query.where(PeerNote.topic == topic)

    notes = session.exec(query.order_by(PeerNote.upvotes.desc())).all()

    return [
        PeerNoteRead(
            id=n.id,
            class_id=n.class_id,
            subject=n.subject,
            topic=n.topic,
            content=n.content,
            upvotes=n.upvotes,
            is_approved=n.is_approved,
            created_by=n.created_by,
            created_at=n.created_at,
        )
        for n in notes
    ]


@router.post(
    "/{note_id}/vote",
    response_model=PeerNoteRead,
    summary="Upvote a note",
    description="Student upvotes a peer note",
)
def vote_note(
    note_id: int,
    payload: PeerNoteVote,
    current_user: User = Depends(role_required(["student"])),
    session=Depends(get_session),
):
    note = session.get(PeerNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.upvotes += 1
    session.add(note)
    session.commit()
    session.refresh(note)

    return PeerNoteRead(
        id=note.id,
        class_id=note.class_id,
        subject=note.subject,
        topic=note.topic,
        content=note.content,
        upvotes=note.upvotes,
        is_approved=note.is_approved,
        created_by=note.created_by,
        created_at=note.created_at,
    )


@router.get(
    "/pending",
    response_model=List[PeerNoteRead],
    summary="Get pending notes (teacher)",
    description="Teacher views notes pending moderation",
)
def get_pending_notes(
    current_user: User = Depends(role_required(["teacher"])),
    session=Depends(get_session),
):
    notes = session.exec(
        select(PeerNote)
        .where(PeerNote.is_approved == False)
        .order_by(PeerNote.created_at.desc())
    ).all()

    return [
        PeerNoteRead(
            id=n.id,
            class_id=n.class_id,
            subject=n.subject,
            topic=n.topic,
            content=n.content,
            upvotes=n.upvotes,
            is_approved=n.is_approved,
            created_by=n.created_by,
            created_at=n.created_at,
        )
        for n in notes
    ]


@router.patch(
    "/{note_id}/moderate",
    response_model=PeerNoteRead,
    summary="Moderate note",
    description="Teacher approves or rejects a note",
)
def moderate_note(
    note_id: int,
    approved: bool,
    current_user: User = Depends(role_required(["teacher"])),
    session=Depends(get_session),
):
    note = session.get(PeerNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.is_approved = approved
    session.add(note)
    session.commit()
    session.refresh(note)

    return PeerNoteRead(
        id=note.id,
        class_id=note.class_id,
        subject=note.subject,
        topic=note.topic,
        content=note.content,
        upvotes=note.upvotes,
        is_approved=note.is_approved,
        created_by=note.created_by,
        created_at=note.created_at,
    )
