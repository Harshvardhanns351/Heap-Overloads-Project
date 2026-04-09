from datetime import date, datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Exam(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    subject: str
    exam_date: date = Field(index=True)
    class_id: str = Field(index=True)
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
