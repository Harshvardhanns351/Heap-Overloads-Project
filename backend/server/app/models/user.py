from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    hashed_password: str
    role: str  # student / teacher / admin
    class_id: Optional[str] = Field(default=None, index=True)
    assigned_class_ids_json: str = "[]"
    pending_nudge: Optional[str] = None
    semester: Optional[int] = Field(default=None)
    branch: Optional[str] = Field(default=None)
    goal: Optional[str] = Field(default=None)
    goal_changed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Profile fields
    bio: Optional[str] = Field(default=None)
    avatar_url: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    linkedin_url: Optional[str] = Field(default=None)
    github_url: Optional[str] = Field(default=None)
    department: Optional[str] = Field(default=None)
    year_of_study: Optional[int] = Field(default=None)
    roll_number: Optional[str] = Field(default=None)
    batch: Optional[str] = Field(default=None)
    is_profile_public: bool = Field(default=True)
    profile_views: int = Field(default=0)
