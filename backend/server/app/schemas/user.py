from typing import Optional
from datetime import datetime

from sqlmodel import SQLModel


class UserBase(SQLModel):
    name: str
    email: str
    role: str  # student / teacher / admin


class UserCreate(UserBase):
    # Stored as plain text currently; in production you should hash passwords.
    hashed_password: str = ""


class UserUpdate(SQLModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    hashed_password: Optional[str] = None


class UserRead(SQLModel):
    id: int
    name: str
    email: str
    role: str
    created_at: datetime

