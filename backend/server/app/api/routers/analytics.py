from typing import List, Dict, Any
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select, func

from app.database import get_session
from app.models import User, Mark
from app.auth.deps import get_current_user, role_required

router = APIRouter()


class SubjectRadar(BaseModel):
    name: str
    my_score: float
    class_avg: float
    percentile: float


class StudentRadarResponse(BaseModel):
    subjects: List[SubjectRadar]


class ClassAverageResponse(BaseModel):
    subject_averages: Dict[str, float]


@router.get(
    "/class-average/{class_id}",
    response_model=ClassAverageResponse,
    summary="Get class average per subject",
    description="Teacher only - returns anonymised average scores per subject for a class",
)
def get_class_average(
    class_id: str,
    current_user: User = Depends(role_required(["teacher", "admin"])),
    session=Depends(get_session),
):
    students = session.exec(
        select(User).where(User.class_id == class_id, User.role == "student")
    ).all()

    if not students:
        return ClassAverageResponse(subject_averages={})

    student_ids = [s.id for s in students]

    marks = session.exec(select(Mark).where(Mark.student_id.in_(student_ids))).all()

    subject_totals: Dict[str, tuple] = {}
    for mark in marks:
        if mark.score is None or mark.max_score is None:
            continue
        pct = (mark.score / mark.max_score) * 100
        if mark.subject not in subject_totals:
            subject_totals[mark.subject] = [0.0, 0]
        subject_totals[mark.subject][0] += pct
        subject_totals[mark.subject] = (
            subject_totals[mark.subject][0],
            subject_totals[mark.subject][1] + 1,
        )

    averages = {}
    for subject, (total, count) in subject_totals.items():
        averages[subject] = round(total / count, 2) if count > 0 else 0.0

    return ClassAverageResponse(subject_averages=averages)


@router.get(
    "/my-radar",
    response_model=StudentRadarResponse,
    summary="Get my radar with class comparison",
    description="Student gets their scores with class average and percentile",
)
def get_my_radar(
    current_user: User = Depends(role_required(["student"])),
    session=Depends(get_session),
):
    if not current_user.class_id:
        raise HTTPException(status_code=400, detail="No class assigned")

    students = session.exec(
        select(User).where(
            User.class_id == current_user.class_id, User.role == "student"
        )
    ).all()

    student_ids = [s.id for s in students]

    all_marks = session.exec(select(Mark).where(Mark.student_id.in_(student_ids))).all()

    subject_scores: Dict[str, List[float]] = {}
    for mark in all_marks:
        if mark.score is None or mark.max_score is None:
            continue
        pct = (mark.score / mark.max_score) * 100
        if mark.subject not in subject_scores:
            subject_scores[mark.subject] = []
        subject_scores[mark.subject].append(pct)

    my_marks = session.exec(
        select(Mark).where(Mark.student_id == current_user.id)
    ).all()

    my_subject_scores: Dict[str, float] = {}
    for mark in my_marks:
        if mark.score is not None and mark.max_score is not None:
            my_subject_scores[mark.subject] = (mark.score / mark.max_score) * 100

    result_subjects = []
    for subject, all_scores in subject_scores.items():
        my_score = my_subject_scores.get(subject, 0.0)
        class_avg = sum(all_scores) / len(all_scores) if all_scores else 0.0

        below_count = sum(1 for s in all_scores if s < my_score)
        percentile = (below_count / len(all_scores)) * 100 if all_scores else 0.0

        result_subjects.append(
            SubjectRadar(
                name=subject,
                my_score=round(my_score, 2),
                class_avg=round(class_avg, 2),
                percentile=round(percentile, 1),
            )
        )

    return StudentRadarResponse(subjects=result_subjects)
