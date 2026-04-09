from pydantic import BaseModel
from typing import Optional


class RoadmapGenerateRequest(BaseModel):
    goal: Optional[str] = None
    duration_weeks: Optional[int] = 4
    branch: Optional[str] = None
    semester: Optional[int] = None


class NodeProgressUpdate(BaseModel):
    status: str  # complete | in_progress | pending


class GoalUpdateRequest(BaseModel):
    goal: str
    semester: Optional[int] = None
    branch: Optional[str] = None
