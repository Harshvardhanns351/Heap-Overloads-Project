from typing import Optional
from datetime import datetime

from sqlmodel import SQLModel


class RiskScoreBase(SQLModel):
    student_id: int
    score: int
    level: str  # GREEN / YELLOW / RED


class RiskScoreCreate(RiskScoreBase):
    pass


class RiskScoreUpdate(SQLModel):
    student_id: Optional[int] = None
    score: Optional[int] = None
    level: Optional[str] = None


class RiskScoreRead(RiskScoreBase):
    id: int
    created_at: datetime

