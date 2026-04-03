from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Roadmap(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="user.id", index=True, unique=True)
    goal: str = "crack placements"
    semester: int = 0
    branch: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    regenerated_at: Optional[datetime] = None


class RoadmapNode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    roadmap_id: int = Field(foreign_key="roadmap.id", index=True)
    order_index: int = Field(index=True)
    title: str
    description: str
    hours: int = 0
    node_type: str = Field(index=True)  # concept / practice / project
    status: str = Field(default="upcoming", index=True)  # upcoming / current / completed
    prereq_ids_json: str = "[]"
    resources_json: str = "[]"

