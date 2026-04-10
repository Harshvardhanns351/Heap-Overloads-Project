"""
coding.py — Coding profile router
Supports: LeetCode, GitHub, Codeforces, CodeChef
Each platform is a separate CodingProfile row per student.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from datetime import datetime, timezone
import json
import os

from app.database import get_session
from app.models import CodingProfile, User
from app.auth.deps import get_current_user, role_required
from ai_engine.leetcode_fetcher import fetch_leetcode_stats
from ai_engine.platform_fetchers import (
    fetch_github_stats,
    fetch_codeforces_stats,
    fetch_codechef_stats,
)

router = APIRouter()


# ── Veloris Score ─────────────────────────────────────────────────────────────
# Weighted composite score 0–1000 across all linked platforms.
# Weights: LC 35% | CF 25% | CC 15% | GH 15% | Activity 10%

def compute_veloris_score(profiles: list) -> dict:
    lc = next((p for p in profiles if p.platform == "leetcode"), None)
    cf = next((p for p in profiles if p.platform == "codeforces"), None)
    cc = next((p for p in profiles if p.platform == "codechef"), None)
    gh = next((p for p in profiles if p.platform == "github"), None)

    # A) LeetCode DSA Score (max 350): easy×1 + medium×3 + hard×7, raw cap 1000
    lc_raw = 0
    if lc:
        lc_raw = min((lc.easy or 0) * 1 + (lc.medium or 0) * 3 + (lc.hard or 0) * 7, 1000)
    lc_score = (lc_raw / 1000) * 350

    # B) Codeforces Score (max 250): rating/3000
    cf_score = 0
    if cf and cf.cf_rating:
        cf_score = min(cf.cf_rating / 3000, 1.0) * 250

    # C) CodeChef Score (max 150): rating/3000
    cc_score = 0
    if cc and cc.cc_rating:
        cc_score = min(cc.cc_rating / 3000, 1.0) * 150

    # D) GitHub Dev Score (max 150): (commits×0.5 + repos×2) raw cap 500
    gh_score = 0
    if gh:
        gh_raw = min((gh.total_commits_year or 0) * 0.5 + (gh.public_repos or 0) * 2, 500)
        gh_score = (gh_raw / 500) * 150

    # E) Activity Recency Bonus (max 100): step function
    activity_score = 0
    last_activity = None
    for p in profiles:
        if p.last_activity_at:
            dt = p.last_activity_at
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            if last_activity is None or dt > last_activity:
                last_activity = dt
    if last_activity:
        days = (datetime.now(timezone.utc) - last_activity).days
        if days <= 1:   activity_score = 100
        elif days <= 3: activity_score = 80
        elif days <= 7: activity_score = 60
        elif days <= 14: activity_score = 40
        elif days <= 30: activity_score = 20
        else:            activity_score = 0

    total = max(0, min(1000, round(lc_score + cf_score + cc_score + gh_score + activity_score)))

    # Tier + color
    if total < 200:   tier, tier_color = "Beginner", "#94a3b8"
    elif total < 400: tier, tier_color = "Learner",  "#22c55e"
    elif total < 600: tier, tier_color = "Coder",    "#3b82f6"
    elif total < 800: tier, tier_color = "Expert",   "#a855f7"
    elif total < 950: tier, tier_color = "Elite",    "#f59e0b"
    else:             tier, tier_color = "Legend",   "#ef4444"

    return {
        "veloris_score": total,
        "tier": tier,
        "tier_color": tier_color,
        "breakdown": {
            "lc": round(lc_score),
            "cf": round(cf_score),
            "cc": round(cc_score),
            "gh": round(gh_score),
            "activity": round(activity_score),
        },
    }


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


@router.get("/me/heatmap")
async def get_heatmap(
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    """
    Returns a full contribution calendar for the heatmap.
    Merges: GitHub daily contributions + Codeforces all submissions + LeetCode recent + CodeChef contests.
    Returns: { "dates": {"YYYY-MM-DD": count, ...} }
    """
    profiles = session.exec(
        select(CodingProfile).where(CodingProfile.student_id == current_user.id)
    ).all()

    dates: dict[str, int] = {}

    def add(iso: str | None, n: int = 1):
        if not iso:
            return
        d = iso[:10]
        dates[d] = dates.get(d, 0) + n

    # ── 1. Merge all stored recent_submissions from every platform ────────────
    for p in profiles:
        subs = json.loads(p.recent_submissions_json or "[]")
        for s in subs:
            add(s.get("time"))

    # ── 2. GitHub — fetch full contribution calendar via GraphQL ─────────────
    gh = next((p for p in profiles if p.platform == "github"), None)
    if gh and gh.username:
        token = os.getenv("GITHUB_TOKEN", "")
        if token:
            try:
                import httpx
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github+json",
                }
                gql = """
                query($login: String!) {
                  user(login: $login) {
                    contributionsCollection {
                      contributionCalendar {
                        weeks {
                          contributionDays {
                            date
                            contributionCount
                          }
                        }
                      }
                    }
                  }
                }
                """
                async with httpx.AsyncClient(timeout=12.0) as client:
                    resp = await client.post(
                        "https://api.github.com/graphql",
                        headers=headers,
                        json={"query": gql, "variables": {"login": gh.username}},
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        weeks = (
                            data.get("data", {})
                            .get("user", {})
                            .get("contributionsCollection", {})
                            .get("contributionCalendar", {})
                            .get("weeks", [])
                        )
                        for week in weeks:
                            for day in week.get("contributionDays", []):
                                if day.get("contributionCount", 0) > 0:
                                    add(day["date"], day["contributionCount"])
            except Exception as e:
                logger.warning(f"GitHub heatmap fetch failed: {e}")

    # ── 3. Codeforces — fetch full submission history (up to 500) ────────────
    cf = next((p for p in profiles if p.platform == "codeforces"), None)
    if cf and cf.username:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=12.0) as client:
                r = await client.get(
                    "https://codeforces.com/api/user.status",
                    params={"handle": cf.username, "from": 1, "count": 500},
                )
                if r.status_code == 200:
                    data = r.json()
                    if data.get("status") == "OK":
                        for s in data.get("result", []):
                            ts = s.get("creationTimeSeconds")
                            if ts and s.get("verdict") == "OK":
                                dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                                add(dt.strftime("%Y-%m-%d"))
        except Exception as e:
            logger.warning(f"Codeforces heatmap fetch failed: {e}")

    return {"dates": dates}


@router.get("/me/score")
def get_my_score(
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    profiles = session.exec(
        select(CodingProfile).where(CodingProfile.student_id == current_user.id)
    ).all()
    return compute_veloris_score(list(profiles))


@router.get("/heatmap/{student_id}")
async def get_student_heatmap(
    student_id: int,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    """Teacher/admin view of a student's contribution heatmap."""
    profiles = session.exec(
        select(CodingProfile).where(CodingProfile.student_id == student_id)
    ).all()
    dates: dict[str, int] = {}

    def add(iso, n=1):
        if not iso: return
        d = iso[:10]; dates[d] = dates.get(d, 0) + n

    for p in profiles:
        for s in json.loads(p.recent_submissions_json or "[]"):
            add(s.get("time"))

    gh = next((p for p in profiles if p.platform == "github"), None)
    if gh and gh.username:
        token = os.getenv("GITHUB_TOKEN", "")
        if token:
            try:
                import httpx
                h = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
                gql = 'query($l:String!){user(login:$l){contributionsCollection{contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}'
                async with httpx.AsyncClient(timeout=12.0) as c:
                    r = await c.post("https://api.github.com/graphql", headers=h, json={"query": gql, "variables": {"l": gh.username}})
                    if r.status_code == 200:
                        for w in r.json().get("data",{}).get("user",{}).get("contributionsCollection",{}).get("contributionCalendar",{}).get("weeks",[]):
                            for d in w.get("contributionDays",[]):
                                if d.get("contributionCount",0) > 0: add(d["date"], d["contributionCount"])
            except Exception as e:
                logger.warning(f"GH heatmap teacher: {e}")

    cf = next((p for p in profiles if p.platform == "codeforces"), None)
    if cf and cf.username:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=12.0) as c:
                r = await c.get("https://codeforces.com/api/user.status", params={"handle": cf.username, "from": 1, "count": 500})
                if r.status_code == 200 and r.json().get("status") == "OK":
                    for s in r.json().get("result", []):
                        ts = s.get("creationTimeSeconds")
                        if ts and s.get("verdict") == "OK":
                            add(datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d"))
        except Exception as e:
            logger.warning(f"CF heatmap teacher: {e}")

    return {"dates": dates}


@router.get("/leaderboard")
def get_leaderboard(
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    """Class-wide leaderboard — all students with at least one linked platform."""
    students = session.exec(select(User).where(User.role == "student")).all()
    all_profiles = session.exec(select(CodingProfile)).all()

    # Group profiles by student
    by_student: dict[int, list] = {}
    for p in all_profiles:
        by_student.setdefault(p.student_id, []).append(p)

    rows = []
    for student in students:
        profs = by_student.get(student.id, [])
        if not profs:
            continue
        score_data = compute_veloris_score(profs)
        platforms_linked = [p.platform for p in profs]
        lc_p = next((p for p in profs if p.platform == "leetcode"), None)
        cf_p = next((p for p in profs if p.platform == "codeforces"), None)
        last_act = None
        for p in profs:
            if p.last_activity_at:
                dt = p.last_activity_at
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if last_act is None or dt > last_act:
                    last_act = dt
        rows.append({
            "student_id": student.id,
            "name": student.name,
            "branch": student.branch or "",
            "semester": student.semester or 0,
            "veloris_score": score_data["veloris_score"],
            "tier": score_data["tier"],
            "tier_color": score_data["tier_color"],
            "breakdown": score_data["breakdown"],
            "platforms_linked": platforms_linked,
            "problems_solved": sum((p.solved_total or 0) + (p.cf_problems_solved or 0) + (p.cc_problems_solved or 0) for p in profs),
            "cf_rating": cf_p.cf_rating if cf_p else 0,
            "last_activity_at": last_act.isoformat() if last_act else None,
            "is_me": student.id == current_user.id,
        })

    rows.sort(key=lambda x: x["veloris_score"], reverse=True)
    for i, row in enumerate(rows):
        row["rank"] = i + 1

    return {"leaderboard": rows, "total": len(rows)}


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
