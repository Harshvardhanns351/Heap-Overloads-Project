import json
import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.database import get_session
from app.models import User
from app.models.attendance_record import AttendanceRecord
from app.models.assignment import Assignment
from app.models.teacher_alert import TeacherAlert
from app.auth.deps import get_current_user, role_required

router = APIRouter()


class ClassDigestResponse(BaseModel):
    class_id: str
    generated_at: datetime
    html_content: str


@router.get(
    "/digest/{class_id}",
    response_model=ClassDigestResponse,
    summary="Get weekly class digest",
    description="Auto-generated HTML summary for teachers every Monday",
)
def get_weekly_digest(
    class_id: str,
    current_user: User = Depends(role_required(["teacher", "admin"])),
    session=Depends(get_session),
):
    students = session.exec(
        select(User).where(User.class_id == class_id, User.role == "student")
    ).all()

    if not students:
        raise HTTPException(status_code=404, detail="Class not found")

    student_ids = [s.id for s in students]

    # Attendance stats
    total_attendance = session.exec(
        select(AttendanceRecord).where(AttendanceRecord.student_id.in_(student_ids))
    ).all()
    present_count = sum(1 for a in total_attendance if a.present)
    total_count = len(total_attendance)
    attendance_pct = (
        round((present_count / total_count) * 100, 1) if total_count > 0 else 0
    )

    # Top performers (highest marks)
    from app.models.mark import Mark

    all_marks = session.exec(select(Mark).where(Mark.student_id.in_(student_ids))).all()

    student_avg = {}
    for m in all_marks:
        if m.score is not None and m.max_score is not None and m.max_score > 0:
            pct = (m.score / m.max_score) * 100
            if m.student_id not in student_avg:
                student_avg[m.student_id] = []
            student_avg[m.student_id].append(pct)

    averages = [
        (sid, sum(scores) / len(scores))
        for sid, scores in student_avg.items()
        if scores
    ]
    averages.sort(key=lambda x: x[1], reverse=True)
    top_5 = averages[:5]

    top_performers = []
    for sid, avg in top_5:
        student = session.get(User, sid)
        if student:
            top_performers.append({"name": student.name, "avg": round(avg, 1)})

    # At-risk students (from alerts)
    alerts = session.exec(
        select(TeacherAlert).where(TeacherAlert.student_id.in_(student_ids))
    ).all()

    at_risk_students = []
    for s in students:
        student_alerts = [
            a for a in alerts if a.student_id == s.id and a.severity == "red"
        ]
        if student_alerts:
            at_risk_students.append(
                {"name": s.name, "alert": student_alerts[0].message[:60] + "..."}
            )

    # Assignment completion
    assignments = session.exec(
        select(Assignment).where(Assignment.class_id == class_id)
    ).all()

    assignment_completion = (
        len([a for a in assignments if a.status == "submitted"])
        / len(assignments)
        * 100
        if assignments
        else 0
    )

    # Generate HTML
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0F0F14; color: #f8fafc; }}
            .header {{ background: linear-gradient(135deg, #534AB7, #8b5cf6); padding: 20px; border-radius: 12px; margin-bottom: 20px; }}
            .section {{ background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; margin-bottom: 16px; }}
            .stat {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }}
            .stat:last-child {{ border-bottom: none; }}
            .label {{ color: #94a3b8; }}
            .value {{ font-weight: 600; }}
            .green {{ color: #22c55e; }}
            .red {{ color: #ef4444; }}
            .yellow {{ color: #f59e0b; }}
            .student-row {{ display: flex; justify-content: space-between; padding: 6px 0; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h2 style="margin: 0;">📊 Weekly Class Digest - {class_id}</h2>
            <p style="margin: 4px 0 0 0; opacity: 0.8;">Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}</p>
        </div>
        
        <div class="section">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #94a3b8; text-transform: uppercase;">Attendance</h3>
            <div class="stat">
                <span class="label">Overall Attendance</span>
                <span class="value {"green" if attendance_pct >= 75 else "yellow" if attendance_pct >= 60 else "red"}">{attendance_pct}%</span>
            </div>
            <div class="stat">
                <span class="label">Present</span>
                <span class="value">{present_count} / {total_count} days</span>
            </div>
        </div>
        
        <div class="section">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #94a3b8; text-transform: uppercase;">Top Performers</h3>
            {"".join([f'<div class="student-row"><span>{i + 1}. {p["name"]}</span><span class="value green">{p["avg"]}%</span></div>' for i, p in enumerate(top_performers)]) or '<p style="color:#64748b">No data</p>'}
        </div>
        
        <div class="section">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #94a3b8; text-transform: uppercase;">At Risk Students</h3>
            {"".join([f'<div class="student-row"><span>{p["name"]}</span><span class="value red">⚠️</span></div>' for p in at_risk_students]) or '<p style="color:#64748b">No at-risk students 🎉</p>'}
        </div>
        
        <div class="section">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #94a3b8; text-transform: uppercase;">Assignment Completion</h3>
            <div class="stat">
                <span class="label">Completion Rate</span>
                <span class="value {"green" if assignment_completion >= 70 else "yellow" if assignment_completion >= 50 else "red"}">{round(assignment_completion, 1)}%</span>
            </div>
        </div>
        
        <p style="text-align:center; color:#64748b; font-size:12px; margin-top:20px;">
            Generated by Veloris · Behavioral Intelligence Platform
        </p>
    </body>
    </html>
    """

    return ClassDigestResponse(
        class_id=class_id,
        generated_at=datetime.utcnow(),
        html_content=html,
    )
