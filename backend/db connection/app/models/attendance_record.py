from datetime import date, datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class AttendanceRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="user.id", index=True)
    class_id: str = Field(index=True)  # e.g. CSE-A
    day: date = Field(index=True)
    present: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

