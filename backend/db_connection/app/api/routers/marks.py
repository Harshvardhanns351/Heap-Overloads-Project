from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select

from app.database import get_session
from app.models import Mark
from app.schemas.mark import MarkCreate, MarkRead, MarkUpdate

router = APIRouter()


def _to_mark_read(m: Mark) -> MarkRead:
    return MarkRead(
        id=m.id,
        student_id=m.student_id,
        subject=m.subject,
        score=m.score,
        max_score=m.max_score,
        semester=m.semester,
    )


@router.get("/", response_model=List[MarkRead])
def list_marks(
    student_id: Optional[int] = Query(default=None),
    semester: Optional[int] = Query(default=None),
    limit: int = 100,
    offset: int = 0,
    session=Depends(get_session),
):
    statement = select(Mark)
    if student_id is not None:
        statement = statement.where(Mark.student_id == student_id)
    if semester is not None:
        statement = statement.where(Mark.semester == semester)

    marks = session.exec(statement.offset(offset).limit(limit)).all()
    return [_to_mark_read(m) for m in marks]


@router.get("/{mark_id}", response_model=MarkRead)
def get_mark(mark_id: int, session=Depends(get_session)):
    mark = session.get(Mark, mark_id)
    if not mark:
        raise HTTPException(status_code=404, detail="Mark not found")
    return _to_mark_read(mark)


@router.post("/", response_model=MarkRead, status_code=201)
def create_mark(payload: MarkCreate, session=Depends(get_session)):
    mark = Mark(
        student_id=payload.student_id,
        subject=payload.subject,
        score=payload.score,
        max_score=payload.max_score,
        semester=payload.semester,
    )
    session.add(mark)
    session.commit()
    session.refresh(mark)
    return _to_mark_read(mark)


@router.put("/{mark_id}", response_model=MarkRead)
def update_mark(mark_id: int, payload: MarkUpdate, session=Depends(get_session)):
    mark = session.get(Mark, mark_id)
    if not mark:
        raise HTTPException(status_code=404, detail="Mark not found")

    try:
        update_data = payload.model_dump(exclude_unset=True)
    except AttributeError:
        update_data = payload.dict(exclude_unset=True)

    if "student_id" in update_data:
        mark.student_id = update_data["student_id"]
    if "subject" in update_data:
        mark.subject = update_data["subject"]
    if "score" in update_data:
        mark.score = update_data["score"]
    if "max_score" in update_data:
        mark.max_score = update_data["max_score"]
    if "semester" in update_data:
        mark.semester = update_data["semester"]

    session.add(mark)
    session.commit()
    session.refresh(mark)
    return _to_mark_read(mark)


@router.delete("/{mark_id}", status_code=204)
def delete_mark(mark_id: int, session=Depends(get_session)):
    mark = session.get(Mark, mark_id)
    if not mark:
        raise HTTPException(status_code=404, detail="Mark not found")

    session.delete(mark)
    session.commit()
    return None

