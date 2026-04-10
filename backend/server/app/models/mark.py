from sqlmodel import SQLModel, Field
from typing import Optional

class Mark(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="user.id")
    subject: str
    score: float
    max_score: float
    semester: int
