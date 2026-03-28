from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional

class RiskScore(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="user.id")
    score: int
    level: str  # GREEN / YELLOW / RED
    created_at: datetime = Field(default_factory=datetime.utcnow)

