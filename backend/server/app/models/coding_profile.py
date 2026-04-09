from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class CodingProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="user.id", index=True)
    platform: str = Field(default="leetcode", index=True)
    username: str = Field(index=True)
    solved_total: int = 0
    easy: int = 0
    medium: int = 0
    hard: int = 0
    streak: int = 0
    last_synced_at: datetime = Field(default_factory=datetime.utcnow, index=True)

