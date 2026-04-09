"""
coding.py — Coding profile router
Supports: LeetCode, GitHub, Codeforces, CodeChef
Each platform is a separate CodingProfile row per student.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from datetime import datetime, timezone
import json

from app.database import get_session
from app.models import CodingProfile, User
from app.auth.deps import get_current_user
from ai_engine.leetcode_fetcher import fetch_leetcode_stats
from ai_engine.platform_fetchers import (
    fetch_github_stats,
    fetch_codeforces_stats,
    fetch_codechef_stats,
)

router = APIRouter()


def _get_or_create(session, student_id: int, platform: str, username: str) -> CodingProfile:
    profile = session.exec(
        select(CodingProfile)
        .where(CodingProfile.student_id == student_id)
        .where(CodingProfile.platform == platform)
    ).first()
    if not profile:
        profile = CodingProfile(student_id=student_id, platform=platform, username=username)
    else:
        profile.username = username
    return profile


def _merge_last_activity(profile: CodingProfile, new_dt: datetime | None):
    """Keep the most recent last_activity_at across syncs."""
    if new_dt is None:
        return
    if new_dt.tzinfo is None:
        new_dt = new_dt.replace(tzinfo=timezone.utc)
    if profile.last_activity_at is None:
        profile.last_activity_at = new_dt
    else:
        existing = profile.last_activity_at
        if existing.tzinfo is None:
            existing = existing.replace(tzinfo=timezone.utc)
        if new_dt > existing:
            profile.last_activity_at = new_dt


# ── LeetCode ──────────────────────────────────────────────────────────────────

@router.get("/leetcode/{username}")
async def sync_leetcode(
    username: str,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    stats = await fetch_leetcode_stats(username)
    if not stats:
        raise HTTPException(status_code=404, detail="LeetCode user not found")

    profile = _get_or_create(session, current_user.id, "leetcode", username)
    profile.solved_total = stats["solved_total"]
    profile.easy = stats["easy"]
    profile.medium = stats["medium"]
    profile.hard = stats["hard"]
    profile.last_synced_at = datetime.utcnow()
    # LeetCode doesn't expose last submission time publicly — use sync time as proxy
    _merge_last_activity(profile, datetime.now(timezone.utc))

    session.add(profile)
    session.commit()
    session.refresh(profile)
    return _serialize(profile)


# ── GitHub ────────────────────────────────────────────────────────────────────

@router.get("/github/{username}")
async def sync_github(
    username: str,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    stats = await fetch_github_stats(username)
    if not stats:
        raise HTTPException(status_code=404, detail="GitHub user not found")

    profile = _get_or_create(session, current_user.id, "github", username)
    profile.public_repos = stats["public_repos"]
    profile.total_commits_year = stats["total_commits_year"]
    profile.top_language = stats["top_language"]
    profile.estimated_weekly_hours = stats["estimated_weekly_hours"]
    profile.recent_submissions_json = json.dumps(stats["recent_submissions"])
    _merge_last_activity(profile, stats["last_activity_at"])
    profile.last_synced_at = datetime.utcnow()

    session.add(profile)
    session.commit()
    session.refresh(profile)
    return _serialize(profile)


# ── Codeforces ────────────────────────────────────────────────────────────────

@router.get("/codeforces/{handle}")
async def sync_codeforces(
    handle: str,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    stats = await fetch_codeforces_stats(handle)
    if not stats:
        raise HTTPException(status_code=404, detail="Codeforces handle not found")

    profile = _get_or_create(session, current_user.id, "codeforces", handle)
    profile.cf_rating = stats["cf_rating"]
    profile.cf_rank = stats["cf_rank"]
    profile.cf_problems_solved = stats["cf_problems_solved"]
    profile.estimated_weekly_hours = stats["estimated_weekly_hours"]
    profile.recent_submissions_json = json.dumps(stats["recent_submissions"])
    _merge_last_activity(profile, stats["last_activity_at"])
    profile.last_synced_at = datetime.utcnow()

    session.add(profile)
    session.commit()
    session.refresh(profile)
    return _serialize(profile)


# ── CodeChef ──────────────────────────────────────────────────────────────────

@router.get("/codechef/{username}")
async def sync_codechef(
    username: str,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    stats = await fetch_codechef_stats(username)
    if not stats:
        raise HTTPException(status_code=404, detail="CodeChef user not found or API unavailable")

    profile = _get_or_create(session, current_user.id, "codechef", username)
    profile.cc_rating = stats["cc_rating"]
    profile.cc_stars = stats["cc_stars"]
    profile.cc_problems_solved = stats["cc_problems_solved"]
    profile.estimated_weekly_hours = stats["estimated_weekly_hours"]
    profile.recent_submissions_json = json.dumps(stats["recent_submissions"])
    _merge_last_activity(profile, stats["last_activity_at"])
    profile.last_synced_at = datetime.utcnow()

    session.add(profile)
    session.commit()
    session.refresh(profile)
    return _serialize(profile)


# ── Summary (dashboard) ───────────────────────────────────────────────────────

@router.get("/me")
def get_my_coding_profiles(
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    profiles = session.exec(
        select(CodingProfile).where(CodingProfile.student_id == current_user.id)
    ).all()
    return [_serialize(p) for p in profiles]


@router.get("/me/summary")
def get_coding_summary(
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    """Aggregated stats across all platforms — used by dashboard."""
    profiles = session.exec(
        select(CodingProfile).where(CodingProfile.student_id == current_user.id)
    ).all()

    total_weekly_hours = sum(p.estimated_weekly_hours or 0 for p in profiles)
    total_problems = sum(
        (p.solved_total or 0) + (p.cf_problems_solved or 0) + (p.cc_problems_solved or 0)
        for p in profiles
    )

    # Most recent activity across all platforms
    last_activity = None
    for p in profiles:
        if p.last_activity_at:
            dt = p.last_activity_at
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            if last_activity is None or dt > last_activity:
                last_activity = dt

    # Merge recent submissions from all platforms, sorted by time
    all_recent = []
    for p in profiles:
        subs = json.loads(p.recent_submissions_json or "[]")
        all_recent.extend(subs)
    all_recent.sort(key=lambda x: x.get("time") or "", reverse=True)

    days_since_activity = None
    if last_activity:
        days_since_activity = (datetime.now(timezone.utc) - last_activity).days

    return {
        "total_weekly_hours": round(total_weekly_hours, 1),
        "total_problems_solved": total_problems,
        "last_activity_at": last_activity.isoformat() if last_activity else None,
        "days_since_activity": days_since_activity,
        "recent_submissions": all_recent[:8],
        "platforms": [_serialize(p) for p in profiles],
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize(p: CodingProfile) -> dict:
    return {
        "id": p.id,
        "platform": p.platform,
        "username": p.username,
        "solved_total": p.solved_total,
        "easy": p.easy,
        "medium": p.medium,
        "hard": p.hard,
        "streak": p.streak,
        "public_repos": p.public_repos,
        "total_commits_year": p.total_commits_year,
        "top_language": p.top_language,
        "cf_rating": p.cf_rating,
        "cf_rank": p.cf_rank,
        "cf_problems_solved": p.cf_problems_solved,
        "cc_rating": p.cc_rating,
        "cc_stars": p.cc_stars,
        "cc_problems_solved": p.cc_problems_solved,
        "last_activity_at": p.last_activity_at.isoformat() if p.last_activity_at else None,
        "recent_submissions": json.loads(p.recent_submissions_json or "[]"),
        "estimated_weekly_hours": p.estimated_weekly_hours or 0,
        "last_synced_at": p.last_synced_at.isoformat() if p.last_synced_at else None,
    }
