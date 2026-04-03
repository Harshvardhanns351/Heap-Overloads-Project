import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlmodel import select

from app.database import get_session
from app.models import Document, Mark, User
from app.auth.deps import get_current_user, role_required
from ai_engine.ocr_extractor import extract_marks

router = APIRouter()


class OCRMark(BaseModel):
    subject: str
    marks_obtained: float
    max_marks: float
    semester: int


class UploadDocResponse(BaseModel):
    doc_id: int
    ocr_preview: List[OCRMark]


class ConfirmOCRRequest(BaseModel):
    doc_id: int
    confirmed_marks: List[OCRMark]


class ConfirmOCRResponse(BaseModel):
    saved: int


class DocumentOut(BaseModel):
    id: int
    student_id: int
    name: str
    doc_type: str
    size_bytes: int
    storage_path: str
    has_ocr: bool
    ocr_confirmed: bool
    uploaded_at: datetime


def _ensure_upload_dir(student_id: int) -> str:
    base = os.path.join("uploads", str(student_id))
    os.makedirs(base, exist_ok=True)
    return base


@router.post(
    "/upload-doc",
    response_model=UploadDocResponse,
    dependencies=[Depends(role_required(["student", "admin"]))],
)
async def upload_doc(
    file: UploadFile = File(...),
    student_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    if current_user.role == "student" and student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot upload for another student")

    upload_dir = _ensure_upload_dir(student_id)
    safe_name = os.path.basename(file.filename or f"upload_{int(datetime.utcnow().timestamp())}")
    path = os.path.join(upload_dir, safe_name)

    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)

    doc = Document(
        student_id=student_id,
        name=safe_name,
        doc_type="Marksheet",
        size_bytes=len(content),
        storage_path=path.replace("\\", "/"),
        has_ocr=True,
        ocr_confirmed=False,
    )
    session.add(doc)
    session.commit()
    session.refresh(doc)

    preview_raw = extract_marks(path)
    preview = [OCRMark(**m) for m in preview_raw]

    return UploadDocResponse(doc_id=doc.id, ocr_preview=preview)


@router.post(
    "/confirm-ocr",
    response_model=ConfirmOCRResponse,
    dependencies=[Depends(role_required(["student", "admin"]))],
)
def confirm_ocr(
    payload: ConfirmOCRRequest,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    doc = session.get(Document, payload.doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if current_user.role == "student" and doc.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot confirm another student's document")

    saved = 0
    for item in payload.confirmed_marks:
        mark = Mark(
            student_id=doc.student_id,
            subject=item.subject,
            score=float(item.marks_obtained),
            max_score=float(item.max_marks),
            semester=int(item.semester),
        )
        session.add(mark)
        saved += 1

    doc.ocr_confirmed = True
    session.add(doc)
    session.commit()
    return ConfirmOCRResponse(saved=saved)


@router.get(
    "/documents",
    response_model=List[DocumentOut],
    dependencies=[Depends(role_required(["student", "teacher", "admin"]))],
)
def list_documents(
    student_id: int,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    if current_user.role == "student" and student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot view another student's documents")

    docs = session.exec(
        select(Document)
        .where(Document.student_id == student_id)
        .order_by(Document.uploaded_at.desc())
    ).all()
    return [
        DocumentOut(
            id=d.id,
            student_id=d.student_id,
            name=d.name,
            doc_type=d.doc_type,
            size_bytes=d.size_bytes,
            storage_path=d.storage_path,
            has_ocr=d.has_ocr,
            ocr_confirmed=d.ocr_confirmed,
            uploaded_at=d.uploaded_at,
        )
        for d in docs
    ]

