from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    hashed_password: str
    role: str  # student / teacher / admin
    class_id: Optional[str] = Field(
        default=None, index=True
    )  # for students: e.g. CSE-A
    assigned_class_ids_json: str = "[]"  # for teachers: JSON list of class ids
    pending_nudge: Optional[str] = None  # warm nudge text shown to student
    semester: Optional[int] = Field(default=None)  # e.g. 6
    branch: Optional[str] = Field(default=None)  # e.g. CSE
    goal: Optional[str] = Field(default=None)  # e.g. "crack placements"
    goal_changed_at: Optional[datetime] = None  # track goal mutations
    created_at: datetime = Field(default_factory=datetime.utcnow)
