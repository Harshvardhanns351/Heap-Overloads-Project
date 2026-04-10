from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple


@dataclass
class Signal:
    key: str
    weight: str  # low / medium / high
    triggered: bool
    detail: str


def _weight_points(weight: str) -> int:
    return {"low": 10, "medium": 20, "high": 30}.get(weight, 10)


def compute_risk_score(
    now: datetime,
    last_activity_at: Optional[datetime],
    attendance_percent: Optional[float],
    late_night_submissions_week: int,
    marks_trend_decline_percent: Optional[float],
) -> Tuple[int, str, List[Signal]]:
    """
    Pure rule-based wellbeing inference.
    Returns (score 0-100, level, signals list).
    """
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    signals: List[Signal] = []
    score = 0

    # Days since last activity
    if last_activity_at:
        if last_activity_at.tzinfo is None:
            last_activity_at = last_activity_at.replace(tzinfo=timezone.utc)
        days = (now - last_activity_at).days
        trig = days > 3
        signals.append(Signal("days_since_activity", "high", trig, f"{days} days"))
        if trig:
            score += _weight_points("high")
    else:
        signals.append(Signal("days_since_activity", "high", True, "no activity recorded"))
        score += _weight_points("high")

    # Attendance
    if attendance_percent is not None:
        trig = attendance_percent < 75
        signals.append(Signal("attendance", "high", trig, f"{attendance_percent:.0f}%"))
        if trig:
            score += _weight_points("high")

    # Marks trend
    if marks_trend_decline_percent is not None:
        trig = marks_trend_decline_percent > 15
        signals.append(Signal("marks_trend", "medium", trig, f"decline {marks_trend_decline_percent:.0f}%"))
        if trig:
            score += _weight_points("medium")

    # Late-night submissions
    trig = late_night_submissions_week >= 3
    signals.append(Signal("late_night_submissions", "low", trig, f"{late_night_submissions_week} in last 7d"))
    if trig:
        score += _weight_points("low")

    score = max(0, min(100, score))
    if score <= 40:
        level = "GREEN"
    elif score <= 70:
        level = "YELLOW"
    else:
        level = "RED"

    return score, level, signals

