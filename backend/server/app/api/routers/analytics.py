from typing import List, Dict, Any, Optional
import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import select, func

from app.database import get_session
from app.models import User, Mark, Assignment, AssignmentSubmission, CodingProfile
from app.auth.deps import get_current_user, role_required
from app.api.routers.coding import compute_veloris_score

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


class StudentPerformance(BaseModel):
    student_id: int
    name: str
    email: str
    class_id: Optional[str]
    score: float
    rank: int
    details: Dict[str, Any]


class TopStudentsResponse(BaseModel):
    students: List[StudentPerformance]
    metric: str
    period: str


@router.get(
    "/top-students",
    response_model=TopStudentsResponse,
    summary="Get top N students by performance metric",
)
def get_top_students(
    metric: str = Query(default="combined", description="assignments|attendance|coding|combined"),
    top_n: int = Query(default=10, ge=1, le=50),
    class_id: Optional[str] = Query(default=None),
    period: str = Query(default="this_month", description="this_month|last_month|all_time"),
    current_user: User = Depends(role_required(["teacher", "admin"])),
    session=Depends(get_session),
):
    # Date range
    now = datetime.utcnow()
    if period == "this_month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "last_month":
        first_this = now.replace(day=1)
        start = (first_this - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        now = first_this - timedelta(seconds=1)
    else:
        start = datetime(2000, 1, 1)

    # Get students
    stmt = select(User).where(User.role == "student")
    if class_id:
        stmt = stmt.where(User.class_id == class_id)
    students = session.exec(stmt).all()
    if not students:
        return TopStudentsResponse(students=[], metric=metric, period=period)

    student_ids = [s.id for s in students]
    student_map = {s.id: s for s in students}

    scores: Dict[int, Dict[str, Any]] = {s.id: {"assignment": 0.0, "attendance": 0.0, "coding": 0.0} for s in students}

    # ── Assignment score: submission rate in period ──────────────────────────
    if metric in ("assignments", "combined"):
        assignments = session.exec(
            select(Assignment).where(Assignment.deadline >= start, Assignment.deadline <= now)
        ).all()
        if class_id:
            assignments = [a for a in assignments if a.class_id == class_id]

        for sid in student_ids:
            student = student_map[sid]
            student_assignments = [a for a in assignments if a.class_id == student.class_id]
            if not student_assignments:
                continue
            subs = session.exec(
                select(AssignmentSubmission)
                .where(AssignmentSubmission.student_id == sid)
                .where(AssignmentSubmission.assignment_id.in_([a.id for a in student_assignments]))
            ).all()
            submitted_ids = {s.assignment_id for s in subs}
            rate = len(submitted_ids) / len(student_assignments) * 100
            scores[sid]["assignment"] = round(rate, 1)
            scores[sid]["assignments_submitted"] = len(submitted_ids)
            scores[sid]["assignments_total"] = len(student_assignments)

    # ── Coding score: veloris score from coding profiles ────────────────────
    if metric in ("coding", "combined"):
        all_profiles = session.exec(
            select(CodingProfile).where(CodingProfile.student_id.in_(student_ids))
        ).all()
        by_student: Dict[int, list] = {}
        for p in all_profiles:
            by_student.setdefault(p.student_id, []).append(p)
        for sid in student_ids:
            profs = by_student.get(sid, [])
            vscore = compute_veloris_score(profs)["veloris_score"] if profs else 0
            scores[sid]["coding"] = float(vscore)

    # ── Combined score ───────────────────────────────────────────────────────
    def compute_final(sid: int) -> float:
        s = scores[sid]
        if metric == "assignments":
            return s["assignment"]
        if metric == "coding":
            return s["coding"]
        if metric == "attendance":
            return s.get("attendance", 0.0)
        # combined: assignments 40% (0-100), coding 40% (0-1000 → normalized to 0-100), attendance 20%
        coding_norm = s["coding"] / 10.0  # normalize 0-1000 to 0-100
        return round(s["assignment"] * 0.4 + coding_norm * 0.4 + s.get("attendance", 0) * 0.2, 1)

    ranked = sorted(student_ids, key=lambda sid: compute_final(sid), reverse=True)[:top_n]

    result = []
    for rank, sid in enumerate(ranked, 1):
        s = student_map[sid]
        final = compute_final(sid)
        details = {k: v for k, v in scores[sid].items()}
        details["final_score"] = final
        result.append(StudentPerformance(
            student_id=sid,
            name=s.name or "",
            email=s.email or "",
            class_id=s.class_id,
            score=final,
            rank=rank,
            details=details,
        ))

    return TopStudentsResponse(students=result, metric=metric, period=period)


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
