import csv
import io
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import select, func

from app.database import get_session
from app.models import User
from app.models.attendance_record import AttendanceRecord
from app.auth.deps import get_current_user, role_required

router = APIRouter()


class AttendanceCreate(BaseModel):
    student_id: int
    class_id: str
    day: date
    present: bool


class AttendanceRead(BaseModel):
    id: int
    student_id: int
    class_id: str
    day: date
    present: bool


class BulkAttendanceUpload(BaseModel):
    class_id: str
    day: date
    records: List[dict]  # [{"student_id": 1, "present": true}, ...]


@router.post(
    "/bulk-upload",
    response_model=List[AttendanceRead],
    status_code=201,
    summary="Bulk upload attendance",
    description="Teacher uploads CSV with student_id,present columns",
)
def bulk_upload_attendance(
    payload: BulkAttendanceUpload,
    current_user: User = Depends(role_required(["teacher", "admin"])),
    session=Depends(get_session),
):
    created_records = []
    for record in payload.records:
        student_id = record.get("student_id")
        present = record.get("present", True)

        if not student_id:
            continue

        student = session.get(User, student_id)
        if not student or student.role != "student":
            continue

        existing = session.exec(
            select(AttendanceRecord).where(
                AttendanceRecord.student_id == student_id,
                AttendanceRecord.class_id == payload.class_id,
                AttendanceRecord.day == payload.day,
            )
        ).first()

        if existing:
            existing.present = present
            session.add(existing)
            created_records.append(existing)
        else:
            new_record = AttendanceRecord(
                student_id=student_id,
                class_id=payload.class_id,
                day=payload.day,
                present=present,
            )
            session.add(new_record)
            created_records.append(new_record)

    session.commit()
    for r in created_records:
        session.refresh(r)

    return [
        AttendanceRead(
            id=r.id,
            student_id=r.student_id,
            class_id=r.class_id,
            day=r.day,
            present=r.present,
        )
        for r in created_records
    ]


@router.get(
    "/class/{class_id}",
    response_model=List[AttendanceRead],
    summary="Get class attendance",
    description="Get attendance records for a class",
)
def get_class_attendance(
    class_id: str,
    day: Optional[date] = None,
    current_user: User = Depends(role_required(["teacher", "admin"])),
    session=Depends(get_session),
):
    query = select(AttendanceRecord).where(AttendanceRecord.class_id == class_id)
    if day:
        query = query.where(AttendanceRecord.day == day)

    records = session.exec(query.order_by(AttendanceRecord.day.desc())).all()

    return [
        AttendanceRead(
            id=r.id,
            student_id=r.student_id,
            class_id=r.class_id,
            day=r.day,
            present=r.present,
        )
        for r in records
    ]


@router.get(
    "/defaulters/{class_id}",
    response_model=List[dict],
    summary="Get defaulters",
    description="Get students with attendance below 75%",
)
def get_defaulters(
    class_id: str,
    current_user: User = Depends(role_required(["teacher", "admin"])),
    session=Depends(get_session),
):
    # Get all students in class
    students = session.exec(
        select(User).where(User.class_id == class_id, User.role == "student")
    ).all()

    if not students:
        return []

    defaulter_list = []
    for student in students:
        # Get total days attended
        total_days = (
            session.exec(
                select(func.count(AttendanceRecord.id)).where(
                    AttendanceRecord.student_id == student.id,
                    AttendanceRecord.class_id == class_id,
                )
            ).one()
            or 0
        )

        if total_days == 0:
            continue

        present_days = (
            session.exec(
                select(func.count(AttendanceRecord.id)).where(
                    AttendanceRecord.student_id == student.id,
                    AttendanceRecord.class_id == class_id,
                    AttendanceRecord.present == True,
                )
            ).one()
            or 0
        )

        attendance_pct = (present_days / total_days) * 100 if total_days > 0 else 0

        if attendance_pct < 75:
            defaulter_list.append(
                {
                    "student_id": student.id,
                    "student_name": student.name,
                    "roll_no": student.roll_no,
                    "present_days": present_days,
                    "total_days": total_days,
                    "attendance_percentage": round(attendance_pct, 2),
                }
            )

    return defaulter_list


@router.get(
    "/export/{class_id}",
    summary="Export attendance CSV",
    description="Export attendance as CSV",
)
def export_attendance(
    class_id: str,
    current_user: User = Depends(role_required(["teacher", "admin"])),
    session=Depends(get_session),
):
    records = session.exec(
        select(AttendanceRecord)
        .where(AttendanceRecord.class_id == class_id)
        .order_by(AttendanceRecord.day)
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["student_id", "class_id", "day", "present"])

    for r in records:
        writer.writerow([r.student_id, r.class_id, r.day, r.present])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=attendance_{class_id}.csv"
        },
    )
