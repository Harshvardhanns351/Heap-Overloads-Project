from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class MonitoringEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="user.id", index=True)
    event_type: str = Field(index=True)
    metadata_json: Optional[str] = None  # JSON string for hackathon simplicity
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

