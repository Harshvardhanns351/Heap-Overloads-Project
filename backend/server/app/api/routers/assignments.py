import json
import os
import shutil
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from sqlmodel import select

from app.auth.deps import get_current_user, role_required
from app.database import get_session
from app.models import Assignment, AssignmentSubmission, User

router = APIRouter()


class AssignmentCreate(BaseModel):
    title: str
    description: str = ""
    deadline: datetime
    subject: str
    class_id: str


class AssignmentUpdate(BaseModel):
    title: str
    description: str = ""
    deadline: datetime
    subject: str
    class_id: str


class AssignmentOut(BaseModel):
    id: int
    teacher_id: int
    class_id: str
    subject: str
    title: str
    description: str
    deadline: datetime
    created_at: datetime
    submission_status: Optional[str] = None  # student view


class SubmissionOut(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    student_name: Optional[str] = None
    submitted_at: datetime
    status: str
    file_path: Optional[str] = None
    text: Optional[str] = None


def _teacher_allowed_class_ids(teacher: User) -> List[str]:
    try:
        ids = json.loads(teacher.assigned_class_ids_json or "[]")
        if isinstance(ids, list):
            return [str(x) for x in ids]
    except Exception:
        pass
    return []


def _ensure_submission_dir(assignment_id: int, student_id: int) -> str:
    base = os.path.join("uploads", "assignments", str(assignment_id), str(student_id))
    os.makedirs(base, exist_ok=True)
    return base


def _assignment_upload_dir(assignment_id: int) -> str:
    return os.path.join("uploads", "assignments", str(assignment_id))


def _ensure_teacher_can_manage_assignment(current_user: User, assignment: Assignment) -> None:
    if current_user.role != "teacher":
        return

    allowed = _teacher_allowed_class_ids(current_user)
    if allowed and assignment.class_id not in allowed:
        raise HTTPException(status_code=403, detail="Teacher not assigned to this class")
    if assignment.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")


@router.post(
    "",
    response_model=AssignmentOut,
    status_code=201,
    dependencies=[Depends(role_required(["teacher", "admin"]))],
)
def create_assignment(
    payload: AssignmentCreate,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    if current_user.role == "teacher":
        allowed = _teacher_allowed_class_ids(current_user)
        if allowed and payload.class_id not in allowed:
            raise HTTPException(status_code=403, detail="Teacher not assigned to this class")

    a = Assignment(
        teacher_id=current_user.id,
        class_id=payload.class_id,
        subject=payload.subject,
        title=payload.title,
        description=payload.description or "",
        deadline=payload.deadline,
    )
    session.add(a)
    session.commit()
    session.refresh(a)
    return AssignmentOut(
        id=a.id,
        teacher_id=a.teacher_id,
        class_id=a.class_id,
        subject=a.subject,
        title=a.title,
        description=a.description,
        deadline=a.deadline,
        created_at=a.created_at,
        submission_status=None,
    )


@router.get(
    "",
    response_model=List[AssignmentOut],
    dependencies=[Depends(role_required(["student", "teacher", "admin"]))],
)
def list_assignments(
    class_id: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    # Student: force to own class_id if present
    if current_user.role == "student":
        if not current_user.class_id:
            raise HTTPException(status_code=400, detail="Student has no class_id assigned")
        class_id = current_user.class_id

    if current_user.role == "teacher":
        allowed = _teacher_allowed_class_ids(current_user)
        if class_id and allowed and class_id not in allowed:
            raise HTTPException(status_code=403, detail="Teacher not assigned to this class")

    stmt = select(Assignment)
    if class_id:
        stmt = stmt.where(Assignment.class_id == class_id)
    stmt = stmt.order_by(Assignment.deadline.asc())
    items = session.exec(stmt).all()

    # Attach submission status for student
    if current_user.role == "student":
        out: List[AssignmentOut] = []
        for a in items:
            sub = session.exec(
                select(AssignmentSubmission)
                .where(AssignmentSubmission.assignment_id == a.id)
                .where(AssignmentSubmission.student_id == current_user.id)
                .order_by(AssignmentSubmission.submitted_at.desc())
                .limit(1)
            ).first()
            out.append(
                AssignmentOut(
                    id=a.id,
                    teacher_id=a.teacher_id,
                    class_id=a.class_id,
                    subject=a.subject,
                    title=a.title,
                    description=a.description,
                    deadline=a.deadline,
                    created_at=a.created_at,
                    submission_status=sub.status if sub else "not_submitted",
                )
            )
        return out

    return [
        AssignmentOut(
            id=a.id,
            teacher_id=a.teacher_id,
            class_id=a.class_id,
            subject=a.subject,
            title=a.title,
            description=a.description,
            deadline=a.deadline,
            created_at=a.created_at,
            submission_status=None,
        )
        for a in items
    ]


@router.patch(
    "/{assignment_id}",
    response_model=AssignmentOut,
    dependencies=[Depends(role_required(["teacher", "admin"]))],
)
def update_assignment(
    assignment_id: int,
    payload: AssignmentUpdate,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    _ensure_teacher_can_manage_assignment(current_user, assignment)

    if current_user.role == "teacher":
        allowed = _teacher_allowed_class_ids(current_user)
        if allowed and payload.class_id not in allowed:
            raise HTTPException(status_code=403, detail="Teacher not assigned to this class")

    assignment.title = payload.title
    assignment.description = payload.description or ""
    assignment.deadline = payload.deadline
    assignment.subject = payload.subject
    assignment.class_id = payload.class_id

    session.add(assignment)
    session.commit()
    session.refresh(assignment)

    return AssignmentOut(
        id=assignment.id,
        teacher_id=assignment.teacher_id,
        class_id=assignment.class_id,
        subject=assignment.subject,
        title=assignment.title,
        description=assignment.description,
        deadline=assignment.deadline,
        created_at=assignment.created_at,
        submission_status=None,
    )


@router.delete(
    "/{assignment_id}",
    status_code=204,
    dependencies=[Depends(role_required(["teacher", "admin"]))],
)
def delete_assignment(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    _ensure_teacher_can_manage_assignment(current_user, assignment)

    submissions = session.exec(
        select(AssignmentSubmission).where(AssignmentSubmission.assignment_id == assignment_id)
    ).all()
    for submission in submissions:
        session.delete(submission)

    session.delete(assignment)
    session.commit()

    upload_dir = _assignment_upload_dir(assignment_id)
    if os.path.isdir(upload_dir):
        shutil.rmtree(upload_dir, ignore_errors=True)


@router.post(
    "/{assignment_id}/submit",
    response_model=SubmissionOut,
    status_code=201,
    dependencies=[Depends(role_required(["student"]))],
)
async def submit_assignment(
    assignment_id: int,
    file: Optional[UploadFile] = File(default=None),
    text_response: Optional[str] = Form(default=None),
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if not file and not (text_response or "").strip():
        raise HTTPException(status_code=400, detail="Provide file or text_response")

    # Determine late/submitted
    now = datetime.utcnow()
    status = "submitted"
    try:
        deadline = assignment.deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=None)
        if now > deadline.replace(tzinfo=None):
            status = "late"
    except Exception:
        pass

    saved_file_path = None
    if file:
        base = _ensure_submission_dir(assignment_id, current_user.id)
        safe_name = os.path.basename(file.filename or f"submission_{int(now.timestamp())}")
        path = os.path.join(base, safe_name)
        content = await file.read()
        with open(path, "wb") as f:
            f.write(content)
        saved_file_path = path.replace("\\", "/")

    sub = AssignmentSubmission(
        assignment_id=assignment_id,
        student_id=current_user.id,
        submitted_at=now,
        status=status,
        file_path=saved_file_path,
        text=(text_response or "").strip() or None,
    )
    session.add(sub)
    session.commit()
    session.refresh(sub)

    return SubmissionOut(
        id=sub.id,
        assignment_id=sub.assignment_id,
        student_id=sub.student_id,
        student_name=None,
        submitted_at=sub.submitted_at,
        status=sub.status,
        file_path=sub.file_path,
        text=sub.text,
    )


@router.get(
    "/{assignment_id}/submissions",
    response_model=List[SubmissionOut],
    dependencies=[Depends(role_required(["teacher", "admin"]))],
)
def list_submissions(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    _ensure_teacher_can_manage_assignment(current_user, assignment)

    subs = session.exec(
        select(AssignmentSubmission)
        .where(AssignmentSubmission.assignment_id == assignment_id)
        .order_by(AssignmentSubmission.submitted_at.desc())
    ).all()

    # Map user names
    student_ids = list({s.student_id for s in subs})
    users = session.exec(select(User).where(User.id.in_(student_ids))).all() if student_ids else []
    name_by_id = {u.id: u.name for u in users}

    return [
        SubmissionOut(
            id=s.id,
            assignment_id=s.assignment_id,
            student_id=s.student_id,
            student_name=name_by_id.get(s.student_id),
            submitted_at=s.submitted_at,
            status=s.status,
            file_path=s.file_path,
            text=s.text,
        )
        for s in subs
    ]

