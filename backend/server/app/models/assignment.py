from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Assignment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: int = Field(foreign_key="user.id", index=True)
    class_id: str = Field(index=True)
    subject: str = Field(index=True)
    title: str
    description: str = ""
    deadline: datetime = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class AssignmentSubmission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assignment_id: int = Field(foreign_key="assignment.id", index=True)
    student_id: int = Field(foreign_key="user.id", index=True)
    submitted_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    status: str = Field(default="submitted", index=True)  # submitted / late
    file_path: Optional[str] = None
    text: Optional[str] = None

