from typing import Optional

from sqlmodel import SQLModel


class MarkBase(SQLModel):
    student_id: int
    subject: str
    score: float
    max_score: float
    semester: int


class MarkCreate(MarkBase):
    pass


class MarkUpdate(SQLModel):
    student_id: Optional[int] = None
    subject: Optional[str] = None
    score: Optional[float] = None
    max_score: Optional[float] = None
    semester: Optional[int] = None


class MarkRead(MarkBase):
    id: int

