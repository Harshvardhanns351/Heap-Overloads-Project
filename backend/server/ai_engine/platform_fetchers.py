"""
platform_fetchers.py
Fetch real activity data from GitHub, Codeforces, CodeChef.
All public APIs — no auth required for basic stats.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


# ─── GitHub ───────────────────────────────────────────────────────────────────

async def fetch_github_stats(username: str) -> Optional[dict]:
    token = os.getenv("GITHUB_TOKEN", "")
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # User profile
            r = await client.get(f"https://api.github.com/users/{username}", headers=headers)
            if r.status_code == 404:
                return None
            r.raise_for_status()
            user = r.json()

            # Recent commits across repos (events API — last 30 push events)
            r2 = await client.get(
                f"https://api.github.com/users/{username}/events/public",
                headers=headers,
                params={"per_page": 30},
            )
            events = r2.json() if r2.status_code == 200 else []

            recent_submissions = []
            last_activity_at = None

            for ev in events:
                if ev.get("type") != "PushEvent":
                    continue
                payload = ev.get("payload", {})
                commits = payload.get("commits", [])
                repo = ev.get("repo", {}).get("name", "")
                pushed_at = ev.get("created_at")
                if pushed_at:
                    dt = datetime.fromisoformat(pushed_at.replace("Z", "+00:00"))
                    if last_activity_at is None or dt > last_activity_at:
                        last_activity_at = dt
                for c in commits[:2]:
                    recent_submissions.append({
                        "platform": "github",
                        "title": c.get("message", "")[:80].split("\n")[0],
                        "url": f"https://github.com/{repo}/commit/{c.get('sha', '')[:7]}",
                        "time": pushed_at,
                    })
                if len(recent_submissions) >= 5:
                    break

            # Contribution count via GraphQL (no auth needed for public)
            total_commits_year = 0
            top_language = ""
            try:
                gql = """
                query($login: String!) {
                  user(login: $login) {
                    contributionsCollection {
                      totalCommitContributions
                    }
                    repositories(first: 6, orderBy: {field: PUSHED_AT, direction: DESC}, ownerAffiliations: OWNER) {
                      nodes { primaryLanguage { name } }
                    }
                  }
                }
                """
                gh_token = os.getenv("GITHUB_TOKEN", "")
                if gh_token:
                    gql_resp = await client.post(
                        "https://api.github.com/graphql",
                        headers={**headers, "Authorization": f"Bearer {gh_token}"},
                        json={"query": gql, "variables": {"login": username}},
                    )
                    if gql_resp.status_code == 200:
                        gdata = gql_resp.json().get("data", {}).get("user", {})
                        total_commits_year = (
                            gdata.get("contributionsCollection", {})
                            .get("totalCommitContributions", 0)
                        )
                        langs = [
                            n.get("primaryLanguage", {}).get("name", "")
                            for n in gdata.get("repositories", {}).get("nodes", [])
                            if n.get("primaryLanguage")
                        ]
                        if langs:
                            top_language = max(set(langs), key=langs.count)
            except Exception:
                pass

            # Estimate weekly hours: ~30 min per commit event in last 7 days
            week_ago = datetime.now(timezone.utc) - timedelta(days=7)
            recent_pushes = sum(
                1 for ev in events
                if ev.get("type") == "PushEvent"
                and ev.get("created_at")
                and datetime.fromisoformat(ev["created_at"].replace("Z", "+00:00")) > week_ago
            )
            estimated_weekly_hours = round(recent_pushes * 0.5, 1)

            return {
                "public_repos": user.get("public_repos", 0),
                "total_commits_year": total_commits_year,
                "top_language": top_language,
                "last_activity_at": last_activity_at,
                "recent_submissions": recent_submissions[:5],
                "estimated_weekly_hours": estimated_weekly_hours,
            }
    except Exception as e:
        logger.warning(f"GitHub fetch failed for {username}: {e}")
        return None


# ─── Codeforces ───────────────────────────────────────────────────────────────

async def fetch_codeforces_stats(handle: str) -> Optional[dict]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # User info
            r = await client.get(
                "https://codeforces.com/api/user.info",
                params={"handles": handle},
            )
            data = r.json()
            if data.get("status") != "OK":
                return None
            user = data["result"][0]

            # Recent submissions
            r2 = await client.get(
                "https://codeforces.com/api/user.status",
                params={"handle": handle, "from": 1, "count": 20},
            )
            subs_data = r2.json()
            submissions = subs_data.get("result", []) if subs_data.get("status") == "OK" else []

            recent = []
            last_activity_at = None
            solved_set = set()

            for s in submissions:
                ts = s.get("creationTimeSeconds")
                if ts:
                    dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                    if last_activity_at is None or dt > last_activity_at:
                        last_activity_at = dt
                if s.get("verdict") == "OK":
                    prob = s.get("problem", {})
                    key = f"{prob.get('contestId')}{prob.get('index')}"
                    solved_set.add(key)
                    if len(recent) < 5:
                        recent.append({
                            "platform": "codeforces",
                            "title": prob.get("name", "Unknown"),
                            "url": f"https://codeforces.com/problemset/problem/{prob.get('contestId')}/{prob.get('index')}",
                            "time": datetime.fromtimestamp(ts, tz=timezone.utc).isoformat() if ts else None,
                        })

            # Weekly hours estimate: ~45 min per accepted submission in last 7 days
            week_ago = datetime.now(timezone.utc) - timedelta(days=7)
            recent_ac = sum(
                1 for s in submissions
                if s.get("verdict") == "OK"
                and s.get("creationTimeSeconds")
                and datetime.fromtimestamp(s["creationTimeSeconds"], tz=timezone.utc) > week_ago
            )
            estimated_weekly_hours = round(recent_ac * 0.75, 1)

            return {
                "cf_rating": user.get("rating", 0),
                "cf_rank": user.get("rank", ""),
                "cf_problems_solved": len(solved_set),
                "last_activity_at": last_activity_at,
                "recent_submissions": recent,
                "estimated_weekly_hours": estimated_weekly_hours,
            }
    except Exception as e:
        logger.warning(f"Codeforces fetch failed for {handle}: {e}")
        return None


# ─── CodeChef ─────────────────────────────────────────────────────────────────

async def fetch_codechef_stats(username: str) -> Optional[dict]:
    """
    CodeChef has no official public API. We use the unofficial
    codechef-api.com community endpoint which scrapes the profile.
    Falls back gracefully if unavailable.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"https://codechef-api.vercel.app/handle/{username}")
            if r.status_code != 200:
                return None
            data = r.json()
            if not data.get("success"):
                return None

            rating = data.get("currentRating", 0)
            stars = data.get("stars", "")
            # Recent activity
            recent_contests = data.get("ratingData", [])[-5:] if data.get("ratingData") else []
            recent = []
            last_activity_at = None

            for c in reversed(recent_contests):
                end_date = c.get("end_date") or c.get("getEndDate")
                if end_date:
                    try:
                        dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                        if last_activity_at is None or dt > last_activity_at:
                            last_activity_at = dt
                        recent.append({
                            "platform": "codechef",
                            "title": c.get("name", "Contest"),
                            "url": f"https://www.codechef.com/users/{username}",
                            "time": end_date,
                        })
                    except Exception:
                        pass

            return {
                "cc_rating": int(rating) if rating else 0,
                "cc_stars": stars,
                "cc_problems_solved": data.get("totalProblemsSolved", 0),
                "last_activity_at": last_activity_at,
                "recent_submissions": recent[:5],
                "estimated_weekly_hours": 1.0 if last_activity_at and (datetime.now(timezone.utc) - last_activity_at).days < 7 else 0.0,
            }
    except Exception as e:
        logger.warning(f"CodeChef fetch failed for {username}: {e}")
        return None
