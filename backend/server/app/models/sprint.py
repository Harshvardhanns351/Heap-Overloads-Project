from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Sprint(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="user.id", index=True)
    node_id: int = Field(foreign_key="roadmapnode.id", index=True)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    duration_minutes: int = 25
    status: str = Field(default="active")  # active / completed / cancelled
