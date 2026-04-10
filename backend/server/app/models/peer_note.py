from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class PeerNote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    class_id: str = Field(index=True)
    subject: str = Field(index=True)
    topic: str = Field(index=True)
    content: str
    upvotes: int = Field(default=0)
    is_approved: bool = Field(default=True)  # teacher moderates
    created_by: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
