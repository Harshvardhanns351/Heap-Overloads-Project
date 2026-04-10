from datetime import date, datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class InternshipExperience(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    company: str
    role: str
    start_date: date
    end_date: Optional[date] = Field(default=None)  # None = currently working
    description: Optional[str] = Field(default=None)
    tech_stack: Optional[str] = Field(default=None)  # comma-separated
    verified: bool = Field(default=False)
    verified_by: Optional[int] = Field(default=None)  # teacher/admin user id
    verified_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
