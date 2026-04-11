"""Seed burnout data: attendance, monitoring events, teacher alerts."""
import sys, os
sys.path.append(os.path.join(os.getcwd(), "backend", "server"))

from datetime import datetime, timedelta, date
from sqlmodel import Session, select
from app.database import engine
from app.models.user import User
from app.models.teacher_alert import TeacherAlert
from app.models.attendance_record import AttendanceRecord
from app.models.monitoring_event import MonitoringEvent

with Session(engine) as s:
    by_email = {u.email: u for u in s.exec(select(User).where(User.role == "student")).all()}
    teacher = s.exec(select(User).where(User.email == "priya@college.edu")).first()
    sneha = by_email["sneha@college.edu"]
    karan = by_email["karan@college.edu"]
    arjun = by_email["arjun@college.edu"]
    all_students = list(by_email.values())
    today = date.today()

    # ── Attendance ──────────────────────────────────────────────────────────
    PATTERNS = {
        sneha.id: {**{i: True for i in range(30, 14, -1)},
                   **{i: (i % 3 != 0) for i in range(14, 7, -1)},
                   **{i: False for i in range(7, 0, -1)}},
        arjun.id: {**{i: True for i in range(30, 8, -1)},
                   **{i: False for i in range(7, 0, -1)}},
        karan.id: {i: (i % 5 != 0) for i in range(30, 0, -1)},
    }
    for st in all_students:
        if st.id not in PATTERNS:
            PATTERNS[st.id] = {i: (i % 7 != 0) for i in range(30, 0, -1)}

    for student_id, pattern in PATTERNS.items():
        student = next((st for st in all_students if st.id == student_id), None)
        if not student:
            continue
        for days_ago, present in pattern.items():
            day = today - timedelta(days=days_ago)
            exists = s.exec(select(AttendanceRecord).where(
                AttendanceRecord.student_id == student_id,
                AttendanceRecord.day == day,
                AttendanceRecord.class_id == student.class_id,
            )).first()
            if not exists:
                s.add(AttendanceRecord(student_id=student_id, class_id=student.class_id, day=day, present=present))
    s.commit()
    print("✓ Attendance seeded")

    # ── Monitoring Events ───────────────────────────────────────────────────
    ME_PATTERNS = {
        sneha.id: [(30,"login"),(29,"roadmap_opened"),(28,"assignment_viewed"),
                   (27,"login"),(26,"assignment_submitted"),(25,"login"),
                   (22,"login"),(21,"roadmap_opened")],
        arjun.id: [(30,"login"),(28,"assignment_submitted"),(25,"login"),
                   (22,"roadmap_opened"),(20,"login"),(18,"assignment_viewed"),
                   (15,"login"),(14,"assignment_submitted")],
        karan.id: [(30,"login"),(28,"roadmap_opened"),(25,"assignment_submitted"),
                   (22,"login"),(20,"roadmap_opened"),(18,"assignment_viewed"),
                   (15,"login"),(12,"assignment_submitted"),(10,"roadmap_opened"),
                   (7,"login"),(5,"assignment_submitted"),(3,"login"),(1,"roadmap_opened")],
    }
    for student_id, events in ME_PATTERNS.items():
        old = s.exec(select(MonitoringEvent).where(MonitoringEvent.student_id == student_id)).all()
        for e in old:
            s.delete(e)
        s.commit()
        for days_ago, event_type in events:
            s.add(MonitoringEvent(
                student_id=student_id,
                event_type=event_type,
                created_at=datetime.utcnow() - timedelta(days=days_ago),
            ))
    s.commit()
    print("✓ Monitoring events seeded")

    # ── Teacher Alerts ──────────────────────────────────────────────────────
    old = s.exec(select(TeacherAlert).where(TeacherAlert.teacher_id == teacher.id)).all()
    for a in old:
        s.delete(a)
    s.commit()
    ALERTS = [
        (sneha.id, "red",    "Sneha Pillai has missed 7 consecutive classes and has no platform activity in 3 weeks. Risk score dropped to 24."),
        (sneha.id, "yellow", "Sneha Pillai missed 3 assignments this month. Submission rate dropped to 20%."),
        (arjun.id, "red",    "Arjun Reddy has been absent for 7 days straight. Risk score fell from 75 to 28 in 2 weeks."),
        (arjun.id, "yellow", "Arjun Reddy has not logged in for 14 days. Possible disengagement."),
        (karan.id, "yellow", "Karan Mehta had a mid-semester dip (risk score 42) but is recovering — now at 74."),
    ]
    for student_id, severity, message in ALERTS:
        s.add(TeacherAlert(teacher_id=teacher.id, student_id=student_id, severity=severity, message=message, read=False))
    s.commit()
    print("✓ Teacher alerts seeded")
    print("All done.")
