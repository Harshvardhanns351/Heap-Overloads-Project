from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    hashed_password: str = ""
    role: Optional[str] = Field(default=None, index=True)  # student / teacher / admin
    class_id: Optional[str] = Field(default=None, index=True)  # for students: e.g. CSE-A
    assigned_class_ids_json: str = "[]"  # for teachers: JSON list of class ids
    pending_nudge: Optional[str] = None  # warm nudge text shown to student
    is_verified: bool = Field(default=False, nullable=False)
    google_id: Optional[str] = Field(default=None, index=True, unique=True)
    avatar_url: Optional[str] = None
    oauth_provider: Optional[str] = None
    password_reset_version: int = Field(default=0, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

