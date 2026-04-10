from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Document(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="user.id", index=True)
    name: str
    doc_type: str = Field(index=True)  # Marksheet / Certificate / etc.
    size_bytes: int = 0
    storage_path: str
    has_ocr: bool = False
    ocr_confirmed: bool = False
    uploaded_at: datetime = Field(default_factory=datetime.utcnow, index=True)

