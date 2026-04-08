import json
import os
from datetime import date, timedelta
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.database import get_session
from app.models import User, Mark
from app.models.exam import Exam
from app.auth.deps import get_current_user, role_required

router = APIRouter()


class ExamCreate(BaseModel):
    subject: str
    exam_date: date
    class_id: str


class ExamRead(BaseModel):
    id: int
    subject: str
    exam_date: date
    class_id: str
    created_by: int
    created_at: datetime


class RevisionTask(BaseModel):
    day: str
    date: str
    topic: str
    duration_hours: float


class RevisionPlanResponse(BaseModel):
    exam_subject: str
    exam_date: date
    days_until_exam: int
    tasks: List[RevisionTask]


@router.post(
    "/",
    response_model=ExamRead,
    status_code=201,
    summary="Create exam",
    description="Teacher creates an exam date for a class",
)
def create_exam(
    payload: ExamCreate,
    current_user: User = Depends(role_required(["teacher", "admin"])),
    session=Depends(get_session),
):
    exam = Exam(
        subject=payload.subject,
        exam_date=payload.exam_date,
        class_id=payload.class_id,
        created_by=current_user.id,
    )
    session.add(exam)
    session.commit()
    session.refresh(exam)

    return ExamRead(
        id=exam.id,
        subject=exam.subject,
        exam_date=exam.exam_date,
        class_id=exam.class_id,
        created_by=exam.created_by,
        created_at=exam.created_at,
    )


@router.get(
    "/",
    response_model=List[ExamRead],
    summary="List exams",
    description="Get exams for a class or all exams for teacher",
)
def list_exams(
    class_id: Optional[str] = None,
    current_user: User = Depends(role_required(["teacher", "admin", "student"])),
    session=Depends(get_session),
):
    if current_user.role == "student" and not current_user.class_id:
        return []

    if current_user.role == "student":
        query = select(Exam).where(Exam.class_id == current_user.class_id)
    elif current_user.role == "teacher":
        if class_id:
            query = select(Exam).where(Exam.class_id == class_id)
        else:
            import json as json_lib

            try:
                assigned = json_lib.loads(current_user.assigned_class_ids_json or "[]")
            except:
                assigned = []
            if assigned:
                query = select(Exam).where(Exam.class_id.in_(assigned))
            else:
                query = select(Exam)
    else:
        query = select(Exam)
        if class_id:
            query = query.where(Exam.class_id == class_id)

    exams = session.exec(query.order_by(Exam.exam_date.asc())).all()

    return [
        ExamRead(
            id=e.id,
            subject=e.subject,
            exam_date=e.exam_date,
            class_id=e.class_id,
            created_by=e.created_by,
            created_at=e.created_at,
        )
        for e in exams
    ]


@router.get(
    "/revision-plan",
    response_model=RevisionPlanResponse,
    summary="Get revision plan",
    description="AI-generated day-by-day revision plan based on weak subjects and exam date",
)
def get_revision_plan(
    exam_id: Optional[int] = None,
    subject: Optional[str] = None,
    exam_date: Optional[date] = None,
    current_user: User = Depends(role_required(["student"])),
    session=Depends(get_session),
):
    if not exam_id and not (subject and exam_date):
        raise HTTPException(
            status_code=400, detail="Provide exam_id or subject + exam_date"
        )

    if exam_id:
        exam = session.get(Exam, exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        target_date = exam.exam_date
        target_subject = exam.subject
    else:
        target_date = exam_date
        target_subject = subject

    today = date.today()
    days_until = (target_date - today).days

    if days_until < 1:
        raise HTTPException(status_code=400, detail="Exam date must be in the future")

    marks = session.exec(select(Mark).where(Mark.student_id == current_user.id)).all()

    weak_subjects = []
    for m in marks:
        if m.score is not None and m.max_score is not None:
            pct = (m.score / m.max_score) * 100
            if pct < 60:
                weak_subjects.append(m.subject)

    weak_subjects = list(set(weak_subjects)) if weak_subjects else [target_subject]

    api_key = os.getenv("GROQ_API_KEY")
    if api_key and days_until <= 30:
        try:
            prompt = f"""Create a day-by-day revision plan for {target_subject} exam on {target_date}.
Student has {days_until} days until exam.
Weak subjects/topics: {", ".join(weak_subjects)}.
Return a JSON array with objects containing: day (e.g. "Day 1"), date (YYYY-MM-DD), topic, duration_hours (1-3).
Focus on weak areas first. Balance conceptual and practice time.
Total study time should be 2-4 hours per day.
Return ONLY valid JSON array, no other text."""

            messages = [
                {
                    "role": "system",
                    "content": "You are an expert academic advisor for engineering students.",
                },
                {"role": "user", "content": prompt},
            ]

            with httpx.Client(timeout=30) as client:
                resp = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "llama3-70b-8192",
                        "temperature": 0.3,
                        "messages": messages,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    tasks = json.loads(content)
                    return RevisionPlanResponse(
                        exam_subject=target_subject,
                        exam_date=target_date,
                        days_until_exam=days_until,
                        tasks=[RevisionTask(**t) for t in tasks[:days_until]],
                    )
        except Exception:
            pass

    fallback_tasks = []
    topics = weak_subjects[: min(5, len(weak_subjects))]
    for i in range(min(days_until, 7)):
        day_date = today + timedelta(days=i)
        task_day = i + 1
        fallback_tasks.append(
            RevisionTask(
                day=f"Day {task_day}",
                date=str(day_date),
                topic=f"Study {topics[i % len(topics)]} concepts + practice problems",
                duration_hours=2.5,
            )
        )

    return RevisionPlanResponse(
        exam_subject=target_subject,
        exam_date=target_date,
        days_until_exam=days_until,
        tasks=fallback_tasks,
    )
