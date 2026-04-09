from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class TeacherAlert(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: int = Field(foreign_key="user.id", index=True)
    student_id: int = Field(foreign_key="user.id", index=True)
    risk_score_id: Optional[int] = Field(default=None, index=True)
    severity: str = Field(index=True)  # red / yellow / green
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    read: bool = False

