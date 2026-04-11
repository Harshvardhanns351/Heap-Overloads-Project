import sys
import os
from datetime import datetime, timedelta, date

sys.path.append(os.path.join(os.getcwd(), "backend", "server"))

from sqlmodel import Session, select, create_engine, SQLModel
from app.database import engine, create_db
from app.models import User, Mark, Roadmap, RoadmapNode, CodingProfile, Assignment, AssignmentSubmission
from app.models.risk_score import RiskScore
from app.models.teacher_alert import TeacherAlert
from app.models.attendance_record import AttendanceRecord
from app.models.monitoring_event import MonitoringEvent
from app.auth.security import hash_password


STUDENTS_CSE_A = [
    ("Rahul Sharma",   "rahul@college.edu"),
    ("Ananya Iyer",    "ananya@college.edu"),
    ("Karan Mehta",    "karan@college.edu"),
    ("Sneha Pillai",   "sneha@college.edu"),
    ("Dev Patel",      "dev@college.edu"),
]

STUDENTS_CSE_B = [
    ("Meera Nair",     "meera@college.edu"),
    ("Arjun Reddy",    "arjun@college.edu"),
    ("Pooja Singh",    "pooja@college.edu"),
]

now = datetime.utcnow()

ASSIGNMENTS_DATA = [
    {
        "title": "Assignment1",
        "subject": "ML",
        "description": "Write questions as well",
        "class_id": "CSE-A",
        "deadline": now - timedelta(days=362),  # overdue (past)
    },
    {
        "title": "css",
        "subject": "DSA",
        "description": "Style the given HTML page using CSS selectors and flexbox.",
        "class_id": "CSE-A",
        "deadline": now - timedelta(days=2),  # overdue
    },
    {
        "title": "assignment1",
        "subject": "DSA",
        "description": "Implement binary search and merge sort.",
        "class_id": "CSE-A",
        "deadline": now + timedelta(days=1),  # 1 day left
    },
    {
        "title": "OS Lab Report",
        "subject": "OS",
        "description": "Document the process scheduling experiment.",
        "class_id": "CSE-B",
        "deadline": now + timedelta(days=3),
    },
    {
        "title": "DBMS ER Diagram",
        "subject": "DBMS",
        "description": "Design an ER diagram for a hospital management system.",
        "class_id": "CSE-B",
        "deadline": now - timedelta(days=1),  # overdue
    },
]

# Which students submitted which assignments (index into ASSIGNMENTS_DATA)
# Format: (student_email, assignment_index, status)
SUBMISSIONS = [
    # Assignment1 ML (CSE-A) — nobody submitted (all at risk)
    # css DSA (CSE-A) — Ananya submitted late, rest missing
    ("ananya@college.edu", 1, "late"),
    # assignment1 DSA (CSE-A) — Rahul and Karan submitted on time
    ("rahul@college.edu",  2, "submitted"),
    ("karan@college.edu",  2, "submitted"),
    # OS Lab Report (CSE-B) — Meera and Arjun submitted
    ("meera@college.edu",  3, "submitted"),
    ("arjun@college.edu",  3, "submitted"),
    # DBMS ER Diagram (CSE-B) — Pooja submitted late, others missing
    ("pooja@college.edu",  4, "late"),
]


def get_or_create_user(session, name, email, role, class_id=None, assigned_class_ids_json="[]"):
    u = session.exec(select(User).where(User.email == email)).first()
    if not u:
        u = User(
            name=name,
            email=email,
            role=role,
            hashed_password=hash_password("password"),
            class_id=class_id,
            assigned_class_ids_json=assigned_class_ids_json,
            semester=6,
            branch="CSE",
        )
        session.add(u)
        session.commit()
        session.refresh(u)
    else:
        # Update class_id and assigned_class_ids if missing
        changed = False
        if class_id and u.class_id != class_id:
            u.class_id = class_id
            changed = True
        if assigned_class_ids_json != "[]" and u.assigned_class_ids_json != assigned_class_ids_json:
            u.assigned_class_ids_json = assigned_class_ids_json
            changed = True
        if changed:
            session.add(u)
            session.commit()
            session.refresh(u)
    return u


def seed():
    create_db()

    with Session(engine) as session:
        # ── Users ──────────────────────────────────────────────────────────
        teacher = get_or_create_user(
            session, "Dr. Priya Menon", "priya@college.edu", "teacher",
            assigned_class_ids_json='["CSE-A", "CSE-B"]',
        )
        get_or_create_user(session, "Admin", "admin@college.edu", "admin")

        students_a = [
            get_or_create_user(session, name, email, "student", class_id="CSE-A")
            for name, email in STUDENTS_CSE_A
        ]
        students_b = [
            get_or_create_user(session, name, email, "student", class_id="CSE-B")
            for name, email in STUDENTS_CSE_B
        ]
        all_students = students_a + students_b
        by_email = {u.email: u for u in all_students}

        rahul = by_email["rahul@college.edu"]

        # ── Marks for Rahul ────────────────────────────────────────────────
        marks = [("DSA", 72), ("OS", 58), ("DBMS", 81), ("CN", 63), ("ML", 45)]
        for sub, sc in marks:
            if not session.exec(select(Mark).where(Mark.student_id == rahul.id, Mark.subject == sub)).first():
                session.add(Mark(student_id=rahul.id, subject=sub, score=sc, max_score=100, semester=6))

        # ── Roadmap for Rahul ──────────────────────────────────────────────
        if not session.exec(select(Roadmap).where(Roadmap.student_id == rahul.id)).first():
            rm = Roadmap(student_id=rahul.id, goal="crack placements", semester=6, branch="CSE")
            session.add(rm)
            session.commit()
            session.refresh(rm)
            for idx, title, desc, hrs, stat in [
                (0, "Arrays & Strings",    "Master array manipulation", 8,  "completed"),
                (1, "Linked Lists",        "Singly, doubly, circular",  6,  "completed"),
                (2, "Binary Search Trees", "BST operations",            8,  "current"),
                (3, "Graph Fundamentals",  "BFS, DFS, cycle detection", 12, "upcoming"),
            ]:
                session.add(RoadmapNode(
                    roadmap_id=rm.id, order_index=idx, title=title,
                    description=desc, hours=hrs, node_type="concept", status=stat,
                    prereq_ids_json="[]", resources_json="[]",
                ))

        # ── Coding profile for Rahul ───────────────────────────────────────
        if not session.exec(select(CodingProfile).where(CodingProfile.student_id == rahul.id)).first():
            session.add(CodingProfile(
                student_id=rahul.id, platform="leetcode",
                username="rahul_sharma_dev", solved_total=87, easy=52, medium=30, hard=5,
            ))

        session.commit()

        # ── Assignments ────────────────────────────────────────────────────
        assignment_objs = []
        for a in ASSIGNMENTS_DATA:
            existing = session.exec(
                select(Assignment)
                .where(Assignment.title == a["title"])
                .where(Assignment.class_id == a["class_id"])
                .where(Assignment.subject == a["subject"])
            ).first()
            if not existing:
                obj = Assignment(
                    teacher_id=teacher.id,
                    class_id=a["class_id"],
                    subject=a["subject"],
                    title=a["title"],
                    description=a["description"],
                    deadline=a["deadline"],
                )
                session.add(obj)
                session.commit()
                session.refresh(obj)
                assignment_objs.append(obj)
            else:
                assignment_objs.append(existing)

        # ── Submissions ────────────────────────────────────────────────────
        for email, a_idx, status in SUBMISSIONS:
            student = by_email.get(email)
            assignment = assignment_objs[a_idx]
            if not student or not assignment:
                continue
            existing_sub = session.exec(
                select(AssignmentSubmission)
                .where(AssignmentSubmission.assignment_id == assignment.id)
                .where(AssignmentSubmission.student_id == student.id)
            ).first()
            if not existing_sub:
                sub_time = assignment.deadline - timedelta(hours=2) if status == "submitted" else assignment.deadline + timedelta(hours=3)
                session.add(AssignmentSubmission(
                    assignment_id=assignment.id,
                    student_id=student.id,
                    submitted_at=sub_time,
                    status=status,
                    text=f"Submission by {student.name}",
                ))

        session.commit()
        print("✓ Seeded: 8 students (5 CSE-A, 3 CSE-B), 5 assignments, realistic submissions.")
        print("  Login: rahul@college.edu / priya@college.edu / admin@college.edu — password: password")

        # ── Risk Score History (8 weeks, declining for 3 students) ─────────
        # Sneha: steady decline GREEN → YELLOW → RED (burnout pattern)
        # Karan: mid-semester dip, recovering
        # Arjun: sudden drop last 2 weeks
        sneha = by_email["sneha@college.edu"]
        karan = by_email["karan@college.edu"]
        arjun = by_email["arjun@college.edu"]

        RISK_HISTORIES = {
            sneha.id: [
                # (weeks_ago, score, level)
                (8, 78, "GREEN"),
                (7, 72, "GREEN"),
                (6, 65, "GREEN"),
                (5, 58, "YELLOW"),
                (4, 51, "YELLOW"),
                (3, 44, "YELLOW"),
                (2, 36, "RED"),
                (1, 29, "RED"),
                (0, 24, "RED"),
            ],
            karan.id: [
                (8, 80, "GREEN"),
                (7, 75, "GREEN"),
                (6, 60, "YELLOW"),
                (5, 48, "YELLOW"),
                (4, 42, "RED"),
                (3, 55, "YELLOW"),
                (2, 63, "GREEN"),
                (1, 70, "GREEN"),
                (0, 74, "GREEN"),
            ],
            arjun.id: [
                (8, 82, "GREEN"),
                (7, 80, "GREEN"),
                (6, 79, "GREEN"),
                (5, 77, "GREEN"),
                (4, 75, "GREEN"),
                (3, 68, "GREEN"),
                (2, 45, "YELLOW"),
                (1, 31, "RED"),
                (0, 28, "RED"),
            ],
        }

        for student_id, history in RISK_HISTORIES.items():
            # Clear old risk scores for this student
            old = session.exec(select(RiskScore).where(RiskScore.student_id == student_id)).all()
            for r in old:
                session.delete(r)
            session.commit()
            for weeks_ago, score, level in history:
                ts = datetime.utcnow() - timedelta(weeks=weeks_ago)
                session.add(RiskScore(student_id=student_id, score=score, level=level, created_at=ts))
        session.commit()

        # ── Attendance Records (last 30 days, declining for at-risk students) ─
        # Sneha: present first 2 weeks, then starts missing
        # Arjun: present first 3 weeks, absent last week
        # Others: mostly present
        today = date.today()
        ATTENDANCE_PATTERNS = {
            sneha.id: {
                # day_offset: present
                **{i: True for i in range(30, 14, -1)},   # days 30-15 ago: present
                **{i: (i % 3 != 0) for i in range(14, 7, -1)},  # days 14-8: sporadic
                **{i: False for i in range(7, 0, -1)},    # last 7 days: absent
            },
            arjun.id: {
                **{i: True for i in range(30, 8, -1)},
                **{i: False for i in range(7, 0, -1)},
            },
            karan.id: {
                **{i: (i % 5 != 0) for i in range(30, 0, -1)},  # mostly present, occasional miss
            },
        }
        # Add all other students as mostly present
        for s in all_students:
            if s.id not in ATTENDANCE_PATTERNS:
                ATTENDANCE_PATTERNS[s.id] = {i: (i % 7 != 0) for i in range(30, 0, -1)}

        for student_id, pattern in ATTENDANCE_PATTERNS.items():
            student = next((s for s in all_students if s.id == student_id), None)
            if not student:
                continue
            for days_ago, present in pattern.items():
                day = today - timedelta(days=days_ago)
                existing = session.exec(
                    select(AttendanceRecord).where(
                        AttendanceRecord.student_id == student_id,
                        AttendanceRecord.day == day,
                        AttendanceRecord.class_id == student.class_id,
                    )
                ).first()
                if not existing:
                    session.add(AttendanceRecord(
                        student_id=student_id,
                        class_id=student.class_id,
                        day=day,
                        present=present,
                    ))
        session.commit()

        # ── Monitoring Events (activity gaps for at-risk students) ──────────
        # Sneha: active 4 weeks ago, then nothing
        # Arjun: active 2 weeks ago, then nothing
        # Karan: regular activity throughout
        MONITORING_PATTERNS = {
            sneha.id: [
                # (days_ago, event_type)
                (30, "login"), (29, "roadmap_opened"), (28, "assignment_viewed"),
                (27, "login"), (26, "assignment_submitted"), (25, "login"),
                (22, "login"), (21, "roadmap_opened"),
                # gap — no activity for 3 weeks
            ],
            arjun.id: [
                (30, "login"), (28, "assignment_submitted"), (25, "login"),
                (22, "roadmap_opened"), (20, "login"), (18, "assignment_viewed"),
                (15, "login"), (14, "assignment_submitted"),
                # gap — no activity for 2 weeks
            ],
            karan.id: [
                (30, "login"), (28, "roadmap_opened"), (25, "assignment_submitted"),
                (22, "login"), (20, "roadmap_opened"), (18, "assignment_viewed"),
                (15, "login"), (12, "assignment_submitted"), (10, "roadmap_opened"),
                (7, "login"), (5, "assignment_submitted"), (3, "login"), (1, "roadmap_opened"),
            ],
        }

        for student_id, events in MONITORING_PATTERNS.items():
            old_events = session.exec(select(MonitoringEvent).where(MonitoringEvent.student_id == student_id)).all()
            for e in old_events:
                session.delete(e)
            session.commit()
            for days_ago, event_type in events:
                ts = datetime.utcnow() - timedelta(days=days_ago)
                session.add(MonitoringEvent(student_id=student_id, event_type=event_type, created_at=ts))
        session.commit()

        # ── Teacher Alerts ──────────────────────────────────────────────────
        old_alerts = session.exec(select(TeacherAlert).where(TeacherAlert.teacher_id == teacher.id)).all()
        for a in old_alerts:
            session.delete(a)
        session.commit()

        ALERTS = [
            (sneha.id, "red",    "Sneha Pillai has missed 7 consecutive classes and has no platform activity in 3 weeks. Risk score dropped to 24."),
            (sneha.id, "yellow", "Sneha Pillai missed 3 assignments this month. Submission rate dropped to 20%."),
            (arjun.id, "red",    "Arjun Reddy has been absent for 7 days straight. Risk score fell from 75 to 28 in 2 weeks."),
            (arjun.id, "yellow", "Arjun Reddy has not logged in for 14 days. Possible disengagement."),
            (karan.id, "yellow", "Karan Mehta had a mid-semester dip (risk score 42) but is recovering — now at 74."),
        ]
        for student_id, severity, message in ALERTS:
            session.add(TeacherAlert(
                teacher_id=teacher.id,
                student_id=student_id,
                severity=severity,
                message=message,
                read=False,
            ))
        session.commit()

        print("✓ Seeded: risk histories, attendance records, monitoring events, and teacher alerts.")
        print("  Burnout students: Sneha Pillai (RED), Arjun Reddy (RED), Karan Mehta (recovering)")



if __name__ == "__main__":
    seed()
