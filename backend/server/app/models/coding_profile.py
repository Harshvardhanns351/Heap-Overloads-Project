from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class CodingProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="user.id", index=True)
    platform: str = Field(default="leetcode", index=True)  # leetcode | github | codeforces | codechef
    username: str = Field(index=True)

    # LeetCode
    solved_total: int = 0
    easy: int = 0
    medium: int = 0
    hard: int = 0
    streak: int = 0

    # GitHub
    public_repos: int = 0
    total_commits_year: int = 0   # contributions in last year
    top_language: str = ""

    # Codeforces
    cf_rating: int = 0
    cf_rank: str = ""
    cf_problems_solved: int = 0

    # CodeChef
    cc_rating: int = 0
    cc_stars: str = ""
    cc_problems_solved: int = 0

    # Activity tracking (all platforms)
    last_activity_at: Optional[datetime] = Field(default=None, index=True)
    recent_submissions_json: str = "[]"   # last 5 submissions/commits [{title, url, time, platform}]
    estimated_weekly_hours: float = 0.0   # derived from submission frequency

    last_synced_at: datetime = Field(default_factory=datetime.utcnow, index=True)

