"""
profile.py — Unified student profile router
GET  /api/profile/me                  → own full profile bundle
PATCH /api/profile/me                 → update editable fields
GET  /api/profile/student/{user_id}   → teacher/admin view any student
GET  /api/profile/students/list       → paginated student list
POST /api/profile/me/internships      → add internship
PATCH /api/profile/me/internships/{id}
DELETE /api/profile/me/internships/{id}
PATCH /api/profile/internship/{id}/verify  → teacher/admin verify
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlmodel import select
from sqlalchemy import func
from datetime import datetime, timezone, date
from typing import Optional
import json
import os
import shutil
import uuid

from pydantic import BaseModel

from app.database import get_session
from app.models import User, CodingProfile, AttendanceRecord
from app.models.internship import InternshipExperience
from app.auth.deps import get_current_user, role_required
from app.api.routers.coding import compute_veloris_score, _serialize as _serialize_coding

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    is_profile_public: Optional[bool] = None


class InternshipCreate(BaseModel):
    company: str
    role: str
    start_date: date
    end_date: Optional[date] = None
    description: Optional[str] = None
    tech_stack: Optional[str] = None


class InternshipUpdate(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None
    tech_stack: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _user_dict(u: User) -> dict:
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "department": u.department or u.branch or "",
        "branch": u.branch or "",
        "semester": u.semester,
        "year_of_study": u.year_of_study,
        "roll_number": u.roll_number,
        "batch": u.batch,
        "bio": u.bio or "",
        "avatar_url": u.avatar_url or "",
        "phone": u.phone or "",
        "linkedin_url": u.linkedin_url or "",
        "github_url": u.github_url or "",
        "is_profile_public": u.is_profile_public,
        "profile_views": u.profile_views or 0,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


def _internship_dict(i: InternshipExperience) -> dict:
    return {
        "id": i.id,
        "company": i.company,
        "role": i.role,
        "start_date": i.start_date.isoformat() if i.start_date else None,
        "end_date": i.end_date.isoformat() if i.end_date else None,
        "description": i.description or "",
        "tech_stack": i.tech_stack or "",
        "verified": i.verified,
        "verified_by": i.verified_by,
        "verified_at": i.verified_at.isoformat() if i.verified_at else None,
        "created_at": i.created_at.isoformat() if i.created_at else None,
    }


def _build_coding_bundle(session, student_id: int) -> dict:
    profiles = session.exec(
        select(CodingProfile).where(CodingProfile.student_id == student_id)
    ).all()
    score_data = compute_veloris_score(list(profiles))

    total_weekly_hours = sum(p.estimated_weekly_hours or 0 for p in profiles)
    total_problems = sum(
        (p.solved_total or 0) + (p.cf_problems_solved or 0) + (p.cc_problems_solved or 0)
        for p in profiles
    )
    last_activity = None
    all_recent = []
    for p in profiles:
        if p.last_activity_at:
            dt = p.last_activity_at
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            if last_activity is None or dt > last_activity:
                last_activity = dt
        subs = json.loads(p.recent_submissions_json or "[]")
        all_recent.extend(subs)
    all_recent.sort(key=lambda x: x.get("time") or "", reverse=True)

    days_since = (datetime.now(timezone.utc) - last_activity).days if last_activity else None

    return {
        **score_data,
        "platforms": [_serialize_coding(p) for p in profiles],
        "summary": {
            "total_problems_solved": total_problems,
            "total_weekly_hours": round(total_weekly_hours, 1),
            "last_activity_at": last_activity.isoformat() if last_activity else None,
            "days_since_activity": days_since,
            "recent_submissions": all_recent[:8],
        },
    }


def _build_attendance_bundle(session, student_id: int) -> dict:
    records = session.exec(
        select(AttendanceRecord).where(AttendanceRecord.student_id == student_id)
    ).all()
    if not records:
        return {"overall_percentage": None, "by_subject": [], "recent_absences": []}

    total = len(records)
    present = sum(1 for r in records if r.present)
    overall = round((present / total) * 100, 1) if total else None

    # Group by class_id (subject proxy)
    by_class: dict = {}
    for r in records:
        key = r.class_id
        if key not in by_class:
            by_class[key] = {"present": 0, "total": 0}
        by_class[key]["total"] += 1
        if r.present:
            by_class[key]["present"] += 1

    by_subject = [
        {
            "subject": k,
            "present": v["present"],
            "total": v["total"],
            "percentage": round((v["present"] / v["total"]) * 100, 1) if v["total"] else 0,
        }
        for k, v in by_class.items()
    ]
    by_subject.sort(key=lambda x: x["percentage"])

    recent_absences = [
        {"date": r.day.isoformat(), "subject": r.class_id}
        for r in sorted(records, key=lambda x: x.day, reverse=True)
        if not r.present
    ][:10]

    return {
        "overall_percentage": overall,
        "by_subject": by_subject,
        "recent_absences": recent_absences,
    }


def _build_leaderboard_rank(session, student_id: int) -> Optional[int]:
    students = session.exec(select(User).where(User.role == "student")).all()
    all_profiles = session.exec(select(CodingProfile)).all()
    by_student: dict = {}
    for p in all_profiles:
        by_student.setdefault(p.student_id, []).append(p)
    scores = []
    for s in students:
        profs = by_student.get(s.id, [])
        if profs:
            sc = compute_veloris_score(profs)["veloris_score"]
            scores.append((s.id, sc))
    scores.sort(key=lambda x: x[1], reverse=True)
    for rank, (sid, _) in enumerate(scores, 1):
        if sid == student_id:
            return rank
    return None


def _full_bundle(session, student: User) -> dict:
    coding = _build_coding_bundle(session, student.id)
    attendance = _build_attendance_bundle(session, student.id)
    internships = session.exec(
        select(InternshipExperience)
        .where(InternshipExperience.user_id == student.id)
        .order_by(InternshipExperience.start_date.desc())
    ).all()
    rank = _build_leaderboard_rank(session, student.id)
    return {
        "user": _user_dict(student),
        "coding": coding,
        "attendance": attendance,
        "academics": {"cgpa": None, "current_sgpa": None, "semesters": []},
        "internships": [_internship_dict(i) for i in internships],
        "leaderboard_rank": rank,
    }


# ── Own profile ───────────────────────────────────────────────────────────────

@router.get("/me")
def get_my_profile(
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    return _full_bundle(session, current_user)


@router.patch("/me")
def update_my_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    if payload.name is not None:
        stripped = payload.name.strip()
        if not stripped:
            raise HTTPException(status_code=422, detail="Name cannot be empty")
        current_user.name = stripped
    if payload.bio is not None:
        current_user.bio = payload.bio[:200]
    if payload.phone is not None:
        current_user.phone = payload.phone
    if payload.linkedin_url is not None:
        current_user.linkedin_url = payload.linkedin_url
    if payload.github_url is not None:
        current_user.github_url = payload.github_url
    if payload.is_profile_public is not None:
        current_user.is_profile_public = payload.is_profile_public
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return _user_dict(current_user)


# ── Avatar upload ─────────────────────────────────────────────────────────────

UPLOAD_DIR = "uploads"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5 MB

@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=422, detail="Only JPEG, PNG, WebP or GIF images are allowed")

    contents = await file.read()
    if len(contents) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="Image must be under 5 MB")

    ext = os.path.splitext(file.filename or "avatar.jpg")[1].lower() or ".jpg"
    filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"
    user_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)
    dest = os.path.join(user_dir, filename)

    with open(dest, "wb") as f:
        f.write(contents)

    current_user.avatar_url = f"/{dest.replace(os.sep, '/')}"
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return {"avatar_url": current_user.avatar_url}


# ── Internships ───────────────────────────────────────────────────────────────

@router.get("/me/internships")
def get_my_internships(
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    items = session.exec(
        select(InternshipExperience)
        .where(InternshipExperience.user_id == current_user.id)
        .order_by(InternshipExperience.start_date.desc())
    ).all()
    return [_internship_dict(i) for i in items]


@router.post("/me/internships", status_code=201)
def add_internship(
    payload: InternshipCreate,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    item = InternshipExperience(
        user_id=current_user.id,
        company=payload.company,
        role=payload.role,
        start_date=payload.start_date,
        end_date=payload.end_date,
        description=payload.description,
        tech_stack=payload.tech_stack,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return _internship_dict(item)


@router.patch("/me/internships/{item_id}")
def update_internship(
    item_id: int,
    payload: InternshipUpdate,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    item = session.get(InternshipExperience, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, val)
    session.add(item)
    session.commit()
    session.refresh(item)
    return _internship_dict(item)


@router.delete("/me/internships/{item_id}", status_code=204)
def delete_internship(
    item_id: int,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    item = session.get(InternshipExperience, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(item)
    session.commit()


# ── Teacher/Admin — view student ──────────────────────────────────────────────

@router.get("/student/{user_id}")
def get_student_profile(
    user_id: int,
    current_user: User = Depends(role_required(["teacher", "admin"])),
    session=Depends(get_session),
):
    student = session.get(User, user_id)
    if not student or student.role != "student":
        raise HTTPException(status_code=404, detail="Student not found")
    # Increment profile views
    student.profile_views = (student.profile_views or 0) + 1
    session.add(student)
    session.commit()
    bundle = _full_bundle(session, student)
    bundle["viewer_role"] = current_user.role
    return bundle


@router.get("/students/list")
def list_students(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    department: Optional[str] = None,
    year: Optional[int] = None,
    current_user: User = Depends(role_required(["teacher", "admin"])),
    session=Depends(get_session),
):
    query = select(User).where(User.role == "student")
    if department:
        query = query.where(User.branch == department)
    if year:
        query = query.where(User.year_of_study == year)
    students = session.exec(query.offset((page - 1) * limit).limit(limit)).all()

    all_profiles = session.exec(select(CodingProfile)).all()
    by_student: dict = {}
    for p in all_profiles:
        by_student.setdefault(p.student_id, []).append(p)

    rows = []
    for s in students:
        profs = by_student.get(s.id, [])
        score_data = compute_veloris_score(profs) if profs else {"veloris_score": 0, "tier": "Beginner", "tier_color": "#94a3b8"}
        att = _build_attendance_bundle(session, s.id)
        rows.append({
            "user_id": s.id,
            "name": s.name,
            "roll_number": s.roll_number or "",
            "department": s.branch or s.department or "",
            "year_of_study": s.year_of_study,
            "avatar_url": s.avatar_url or "",
            "veloris_score": score_data["veloris_score"],
            "tier": score_data["tier"],
            "tier_color": score_data["tier_color"],
            "problems_solved": sum((p.solved_total or 0) + (p.cf_problems_solved or 0) + (p.cc_problems_solved or 0) for p in profs),
            "attendance_percentage": att["overall_percentage"],
            "cgpa": None,
            "last_activity_at": None,
        })
    return {"students": rows, "page": page, "limit": limit, "total": len(rows)}


# ── Verify internship ─────────────────────────────────────────────────────────

@router.patch("/internship/{item_id}/verify")
def verify_internship(
    item_id: int,
    current_user: User = Depends(role_required(["teacher", "admin"])),
    session=Depends(get_session),
):
    item = session.get(InternshipExperience, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    item.verified = True
    item.verified_by = current_user.id
    item.verified_at = datetime.now(timezone.utc)
    session.add(item)
    session.commit()
    session.refresh(item)
    return _internship_dict(item)
