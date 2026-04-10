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
        async with httpx.AsyncClient(timeout=12.0) as client:
            # ── User profile ──────────────────────────────────────────────
            r = await client.get(f"https://api.github.com/users/{username}", headers=headers)
            if r.status_code == 404:
                return None
            r.raise_for_status()
            user = r.json()

            # ── Recent repos (for language + recent commit messages) ──────
            r_repos = await client.get(
                f"https://api.github.com/users/{username}/repos",
                headers=headers,
                params={"per_page": 10, "sort": "pushed", "type": "owner"},
            )
            repos = r_repos.json() if r_repos.status_code == 200 else []

            # Top language from repos
            lang_counts: dict[str, int] = {}
            for repo in repos:
                lang = repo.get("language")
                if lang:
                    lang_counts[lang] = lang_counts.get(lang, 0) + 1
            top_language = max(lang_counts, key=lang_counts.get) if lang_counts else ""

            # ── Fetch recent commits from top 3 most-recently-pushed repos ─
            recent_submissions = []
            last_activity_at = None
            week_ago = datetime.now(timezone.utc) - timedelta(days=7)
            week_commit_count = 0

            for repo in repos[:3]:
                repo_name = repo.get("name", "")
                pushed_at = repo.get("pushed_at")
                if not repo_name:
                    continue
                try:
                    r_commits = await client.get(
                        f"https://api.github.com/repos/{username}/{repo_name}/commits",
                        headers=headers,
                        params={"per_page": 5, "author": username},
                    )
                    if r_commits.status_code != 200:
                        continue
                    commits = r_commits.json()
                    for c in commits:
                        commit_date = c.get("commit", {}).get("author", {}).get("date")
                        sha = c.get("sha", "")[:7]
                        msg = c.get("commit", {}).get("message", "")[:80].split("\n")[0]
                        if commit_date:
                            dt = datetime.fromisoformat(commit_date.replace("Z", "+00:00"))
                            if last_activity_at is None or dt > last_activity_at:
                                last_activity_at = dt
                            if dt > week_ago:
                                week_commit_count += 1
                        if len(recent_submissions) < 8:
                            recent_submissions.append({
                                "platform": "github",
                                "title": f"{repo_name}: {msg}",
                                "url": f"https://github.com/{username}/{repo_name}/commit/{sha}",
                                "time": commit_date,
                            })
                except Exception:
                    continue

            # ── Contribution count via GraphQL (only if token available) ──
            total_commits_year = 0
            if token:
                try:
                    gql = """
                    query($login: String!) {
                      user(login: $login) {
                        contributionsCollection {
                          totalCommitContributions
                        }
                      }
                    }
                    """
                    gql_resp = await client.post(
                        "https://api.github.com/graphql",
                        headers=headers,
                        json={"query": gql, "variables": {"login": username}},
                    )
                    if gql_resp.status_code == 200:
                        gdata = gql_resp.json().get("data", {}).get("user", {})
                        total_commits_year = (
                            gdata.get("contributionsCollection", {})
                            .get("totalCommitContributions", 0)
                        )
                except Exception:
                    pass

            # Fallback: estimate from public repos star count if GraphQL unavailable
            if total_commits_year == 0:
                # Use events API to count push events as rough proxy
                r_events = await client.get(
                    f"https://api.github.com/users/{username}/events/public",
                    headers=headers,
                    params={"per_page": 100},
                )
                if r_events.status_code == 200:
                    push_events = [e for e in r_events.json() if e.get("type") == "PushEvent"]
                    # Each push event = at least 1 commit; use size field if available
                    total_commits_year = sum(
                        e.get("payload", {}).get("size", 1) for e in push_events
                    )

            estimated_weekly_hours = round(week_commit_count * 0.4, 1)

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

            # Weekly hours: each AC submission in last 7 days × 0.3h
            week_ago = datetime.now(timezone.utc) - timedelta(days=7)
            recent_ac = sum(
                1 for s in submissions
                if s.get("verdict") == "OK"
                and s.get("creationTimeSeconds")
                and datetime.fromtimestamp(s["creationTimeSeconds"], tz=timezone.utc) > week_ago
            )
            estimated_weekly_hours = round(recent_ac * 0.3, 1)

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

            # Weekly hours: contest participation in last 7 days × 0.3h
            week_hours = 0.3 if last_activity_at and (datetime.now(timezone.utc) - last_activity_at).days < 7 else 0.0
            return {
                "cc_rating": int(rating) if rating else 0,
                "cc_stars": stars,
                "cc_problems_solved": data.get("totalProblemsSolved", 0),
                "last_activity_at": last_activity_at,
                "recent_submissions": recent[:5],
                "estimated_weekly_hours": week_hours,
            }
    except Exception as e:
        logger.warning(f"CodeChef fetch failed for {username}: {e}")
        return None
