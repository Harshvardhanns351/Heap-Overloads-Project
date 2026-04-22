from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select

from app.database import get_session
from app.models import RiskScore
from app.schemas.risk_score import RiskScoreCreate, RiskScoreRead, RiskScoreUpdate
from app.auth.deps import get_current_user
from app.models import User

router = APIRouter()


def _to_risk_score_read(r: RiskScore) -> RiskScoreRead:
    return RiskScoreRead(
        id=r.id,
        student_id=r.student_id,
        score=r.score,
        level=r.level,
        created_at=r.created_at,
    )


@router.get("/burnout/{class_id}", response_model=List[dict])
def get_class_burnout(
    class_id: str,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    """Return students with declining risk scores in the given class."""
    students = session.exec(
        select(User).where(User.class_id == class_id, User.role == "student")
    ).all()

    result = []
    for student in students:
        history = session.exec(
            select(RiskScore)
            .where(RiskScore.student_id == student.id)
            .order_by(RiskScore.created_at.asc())
        ).all()
        if not history:
            continue
        latest = history[-1]
        # Only include students with RED or YELLOW, or declining trend
        scores = [r.score for r in history]
        is_declining = len(scores) >= 3 and scores[-1] < scores[-3]
        if latest.level in ("RED", "YELLOW") or is_declining:
            result.append({
                "student_id": student.id,
                "student_name": student.name,
                "current_score": latest.score,
                "current_level": latest.level,
                "history": [
                    {"score": r.score, "level": r.level, "created_at": r.created_at.isoformat()}
                    for r in history
                ],
            })
    result.sort(key=lambda x: x["current_score"])
    return result



def get_risk_history(
    student_id: int,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    items = session.exec(
        select(RiskScore)
        .where(RiskScore.student_id == student_id)
        .order_by(RiskScore.created_at.asc())
    ).all()
    return [_to_risk_score_read(r) for r in items]



def get_my_risk_score(
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    item = session.exec(
        select(RiskScore)
        .where(RiskScore.student_id == current_user.id)
        .order_by(RiskScore.created_at.desc())
        .limit(1)
    ).first()
    if not item:
        return None
    return _to_risk_score_read(item)


@router.get("/", response_model=List[RiskScoreRead])
def list_risk_scores(
    student_id: Optional[int] = Query(default=None),
    level: Optional[str] = Query(default=None),
    limit: int = 100,
    offset: int = 0,
    session=Depends(get_session),
):
    statement = select(RiskScore)
    if student_id is not None:
        statement = statement.where(RiskScore.student_id == student_id)
    if level is not None:
        statement = statement.where(RiskScore.level == level)

    items = session.exec(statement.offset(offset).limit(limit)).all()
    return [_to_risk_score_read(r) for r in items]


@router.get("/{risk_score_id}", response_model=RiskScoreRead)
def get_risk_score(risk_score_id: int, session=Depends(get_session)):
    item = session.get(RiskScore, risk_score_id)
    if not item:
        raise HTTPException(status_code=404, detail="RiskScore not found")
    return _to_risk_score_read(item)


@router.post("/", response_model=RiskScoreRead, status_code=201)
def create_risk_score(payload: RiskScoreCreate, session=Depends(get_session)):
    item = RiskScore(
        student_id=payload.student_id,
        score=payload.score,
        level=payload.level,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return _to_risk_score_read(item)


@router.put("/{risk_score_id}", response_model=RiskScoreRead)
def update_risk_score(risk_score_id: int, payload: RiskScoreUpdate, session=Depends(get_session)):
    item = session.get(RiskScore, risk_score_id)
    if not item:
        raise HTTPException(status_code=404, detail="RiskScore not found")

    try:
        update_data = payload.model_dump(exclude_unset=True)
    except AttributeError:
        update_data = payload.dict(exclude_unset=True)

    if "student_id" in update_data:
        item.student_id = update_data["student_id"]
    if "score" in update_data:
        item.score = update_data["score"]
    if "level" in update_data:
        item.level = update_data["level"]

    session.add(item)
    session.commit()
    session.refresh(item)
    return _to_risk_score_read(item)


@router.delete("/{risk_score_id}", status_code=204)
def delete_risk_score(risk_score_id: int, session=Depends(get_session)):
    item = session.get(RiskScore, risk_score_id)
    if not item:
        raise HTTPException(status_code=404, detail="RiskScore not found")

    session.delete(item)
    session.commit()
    return None

