from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Dispute(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="user.id", index=True)
    category: str = Field(index=True)  # Infrastructure / Academic / Administrative
    title: str
    description: str
    status: str = Field(default="OPEN", index=True)  # OPEN / IN_REVIEW / RESOLVED
    resolution: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)

