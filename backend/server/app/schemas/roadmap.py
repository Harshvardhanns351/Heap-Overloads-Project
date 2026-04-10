from pydantic import BaseModel
from typing import Optional, Literal


class RoadmapGenerateRequest(BaseModel):
    goal: Optional[str] = None
    difficulty: Literal["beginner", "intermediate", "advanced"] = "intermediate"
    timeframe_days: Literal[1, 5, 10, 15, 30] = 30
    branch: Optional[str] = None
    semester: Optional[int] = None


class NodeProgressUpdate(BaseModel):
    status: str  # complete | in_progress | pending


class GoalUpdateRequest(BaseModel):
    goal: str
    semester: Optional[int] = None
    branch: Optional[str] = None
