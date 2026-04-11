import json
import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy import func
from sqlmodel import select

from app.database import get_session
from app.models import User
from app.models.risk_score import RiskScore
from app.models.teacher_alert import TeacherAlert
from app.models.attendance_record import AttendanceRecord
from app.models.assignment import AssignmentSubmission
from app.models.monitoring_event import MonitoringEvent
from app.models.roadmap import Roadmap, RoadmapNode
from app.models.coding_profile import CodingProfile
from ai_engine.wellbeing.detector import compute_risk_score

logger = logging.getLogger(__name__)


async def run_wellbeing_check():
    """Nightly job: compute risk scores for all active students and create alerts if RED."""
    from app.database import engine
    from sqlmodel import Session

    logger.info("Starting nightly wellbeing check...")

    with Session(engine) as session:
        students = session.exec(select(User).where(User.role == "student")).all()

        for student in students:
            try:
                await process_student_wellbeing(session, student)
            except Exception as e:
                logger.error(f"Error processing student {student.id}: {e}")

        session.commit()

    logger.info("Nightly wellbeing check completed.")


async def process_student_wellbeing(session, student: User):
    """Compute risk for a single student and create alert if needed."""
    now = datetime.now(timezone.utc)

    last_activity = session.exec(
        select(MonitoringEvent)
        .where(MonitoringEvent.student_id == student.id)
        .order_by(MonitoringEvent.created_at.desc())
    ).first()

    last_activity_at = None
    if last_activity and last_activity.created_at:
        dt = last_activity.created_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        last_activity_at = dt

    # Also check coding platform activity — more reliable signal
    coding_profiles = session.exec(
        select(CodingProfile).where(CodingProfile.student_id == student.id)
    ).all()
    for cp in coding_profiles:
        if cp.last_activity_at:
            dt = cp.last_activity_at
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            if last_activity_at is None or dt > last_activity_at:
                last_activity_at = dt

    attendance_percent = get_student_attendance(session, student.id)

    late_night_count = get_late_night_submissions(session, student.id)

    marks_trend = get_marks_trend(session, student.id)

    score, level, signals = compute_risk_score(
        now=now,
        last_activity_at=last_activity_at,
        attendance_percent=attendance_percent,
        late_night_submissions_week=late_night_count,
        marks_trend_decline_percent=marks_trend,
    )

    # Coding inactivity / engagement adjustment
    coding_delta = 0.0
    if coding_profiles:
        # Find most recent coding activity
        coding_last = None
        for cp in coding_profiles:
            if cp.last_activity_at:
                dt = cp.last_activity_at
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if coding_last is None or dt > coding_last:
                    coding_last = dt

        if coding_last:
            days_inactive = (now - coding_last).days
            if days_inactive <= 3:    coding_delta += 0.0
            elif days_inactive <= 7:  coding_delta += 0.1
            elif days_inactive <= 14: coding_delta += 0.2
            else:                     coding_delta += 0.3

        # Engagement bonus from Veloris score (import inline to avoid circular)
        try:
            from app.api.routers.coding import compute_veloris_score
            vs = compute_veloris_score(list(coding_profiles))
            vs_score = vs.get("veloris_score", 0)
            if vs_score > 600:   coding_delta -= 0.1
            elif vs_score > 400: coding_delta -= 0.05
        except Exception:
            pass

    # Apply coding delta to score (scale: score is 0-100, delta is fraction)
    adjusted_score = max(0, min(100, round(score + coding_delta * 20)))

    risk = RiskScore(
        student_id=student.id,
        score=adjusted_score,
        level=level,
    )
    session.add(risk)

    signal_messages = [s.detail for s in signals if s.triggered]

    if level == "RED":
        create_teacher_alert(session, student, signal_messages)

    logger.info(
        f"Student {student.id}: score={score}, level={level}, signals={signal_messages}"
    )


def get_student_attendance(session, student_id: int) -> float | None:
    """Calculate attendance percentage for a student."""
    total = (
        session.scalar(
            select(func.count(AttendanceRecord.id)).where(
                AttendanceRecord.student_id == student_id
            )
        )
        or 0
    )

    if total == 0:
        return None

    present = (
        session.scalar(
            select(func.count(AttendanceRecord.id)).where(
                AttendanceRecord.student_id == student_id,
                AttendanceRecord.present == True,
            )
        )
        or 0
    )

    return (present / total) * 100


def get_late_night_submissions(session, student_id: int) -> int:
    """Count submissions after midnight in the last 7 days."""
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    submissions = session.exec(
        select(AssignmentSubmission).where(
            AssignmentSubmission.student_id == student_id,
            AssignmentSubmission.submitted_at >= week_ago,
        )
    ).all()

    late_night = 0
    for sub in submissions:
        if sub.submitted_at and sub.submitted_at.hour < 5:
            late_night += 1

    return late_night


def get_marks_trend(session, student_id: int) -> float | None:
    """Calculate percentage decline in marks (last 5 vs previous 5)."""
    from app.models.mark import Mark

    marks = session.exec(
        select(Mark)
        .where(Mark.student_id == student_id)
        .order_by(Mark.created_at.desc())
    ).all()

    if len(marks) < 10:
        return None

    recent = [m.marks_obtained for m in marks[:5] if m.marks_obtained is not None]
    older = [m.marks_obtained for m in marks[5:10] if m.marks_obtained is not None]

    if not recent or not older:
        return None

    avg_recent = sum(recent) / len(recent)
    avg_older = sum(older) / len(older)

    if avg_older == 0:
        return None

    decline = ((avg_older - avg_recent) / avg_older) * 100
    return max(0, decline)


def create_teacher_alert(session, student: User, facts: list):
    """Create a teacher alert with observable facts only, no diagnosis."""
    if not student.class_id:
        return

    teachers = session.exec(select(User).where(User.role == "teacher")).all()

    alert_message = (
        f"Student {student.name} ({student.roll_no or student.email}): "
        + "; ".join(facts[:3])
    )

    for teacher in teachers:
        existing_recent = session.exec(
            select(TeacherAlert)
            .where(
                TeacherAlert.student_id == student.id,
                TeacherAlert.teacher_id == teacher.id,
                TeacherAlert.severity == "red",
            )
            .order_by(TeacherAlert.created_at.desc())
        ).first()

        if (
            existing_recent
            and (datetime.now(timezone.utc) - existing_recent.created_at).days < 1
        ):
            continue

        alert = TeacherAlert(
            teacher_id=teacher.id,
            student_id=student.id,
            severity="red",
            message=alert_message,
        )
        session.add(alert)
