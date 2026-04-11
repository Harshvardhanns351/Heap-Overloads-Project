"""
resource_fetcher.py
Real API calls for learning resources — no LLM-generated URLs.

Sources:
  - GitHub Search API  (no token needed; token raises rate limit 10→30 req/min)
  - ArXiv API          (free, no key)
  - YouTube Data v3    (optional; falls back to search URL if no key)

Curated fallbacks are verified-working URLs for common CS topics.
"""
from __future__ import annotations

import asyncio
import logging
import os
import xml.etree.ElementTree as ET
from typing import List, Dict

import httpx

logger = logging.getLogger(__name__)

# ─── Verified curated resources (manually checked, stable URLs) ───────────────
# These are the "goldmine" fallbacks — only added after manual verification.
_CURATED: Dict[str, List[Dict]] = {
    "prompt engineering": [
        {"label": "Prompt Engineering Guide – DAIR.AI", "url": "https://www.promptingguide.ai", "tag": "📚 Docs"},
        {"label": "Learn Prompting (free course)", "url": "https://learnprompting.org/docs/intro", "tag": "📚 Course"},
        {"label": "awesome-chatgpt-prompts (107k★)", "url": "https://github.com/f/awesome-chatgpt-prompts", "tag": "⭐ GitHub"},
        {"label": "Brex Prompt Engineering Guide", "url": "https://github.com/brexhq/prompt-engineering", "tag": "⭐ GitHub"},
        {"label": "OpenAI Prompt Engineering Docs", "url": "https://platform.openai.com/docs/guides/prompt-engineering", "tag": "📖 Official"},
    ],
    "ai red teaming": [
        {"label": "PyRIT – Microsoft AI Red Teaming Toolkit", "url": "https://github.com/Azure/PyRIT", "tag": "⭐ GitHub"},
        {"label": "MITRE ATLAS – Adversarial ML Threat Matrix", "url": "https://atlas.mitre.org", "tag": "📖 Reference"},
        {"label": "Garak – LLM Vulnerability Scanner", "url": "https://github.com/leondz/garak", "tag": "⭐ GitHub"},
        {"label": "OWASP LLM Top 10", "url": "https://owasp.org/www-project-top-10-for-large-language-model-applications/", "tag": "📖 Reference"},
        {"label": "HackAPrompt Competition", "url": "https://github.com/svenmorgenrothio/Prompt-Injection-Playground", "tag": "🛠 Practice"},
    ],
    "machine learning": [
        {"label": "fast.ai Practical Deep Learning", "url": "https://course.fast.ai", "tag": "📚 Course"},
        {"label": "Made With ML", "url": "https://madewithml.com", "tag": "📚 Course"},
        {"label": "Scikit-learn Docs", "url": "https://scikit-learn.org/stable/", "tag": "📖 Official"},
        {"label": "Kaggle Learn", "url": "https://www.kaggle.com/learn", "tag": "🛠 Practice"},
    ],
    "deep learning": [
        {"label": "d2l.ai – Dive into Deep Learning", "url": "https://d2l.ai", "tag": "📚 Course"},
        {"label": "Stanford CS231n Notes", "url": "https://cs231n.github.io", "tag": "📚 Course"},
        {"label": "PyTorch Tutorials", "url": "https://pytorch.org/tutorials/", "tag": "📖 Official"},
    ],
    "data structures": [
        {"label": "Visualgo – DS Visualizations", "url": "https://visualgo.net/en", "tag": "🛠 Interactive"},
        {"label": "USACO Guide", "url": "https://usaco.guide/", "tag": "📚 Course"},
        {"label": "CP-Algorithms", "url": "https://cp-algorithms.com/", "tag": "📖 Reference"},
    ],
    "system design": [
        {"label": "System Design Primer (220k★)", "url": "https://github.com/donnemartin/system-design-primer", "tag": "⭐ GitHub"},
        {"label": "ByteByteGo Newsletter", "url": "https://bytebytego.com", "tag": "📚 Course"},
        {"label": "High Scalability Blog", "url": "http://highscalability.com", "tag": "📖 Reference"},
    ],
    "web development": [
        {"label": "The Odin Project", "url": "https://www.theodinproject.com", "tag": "📚 Course"},
        {"label": "Full Stack Open (Helsinki)", "url": "https://fullstackopen.com/en/", "tag": "📚 Course"},
        {"label": "MDN Web Docs", "url": "https://developer.mozilla.org/en-US/docs/Web", "tag": "📖 Official"},
        {"label": "javascript.info", "url": "https://javascript.info", "tag": "📖 Reference"},
    ],
    "competitive programming": [
        {"label": "CSES Problem Set", "url": "https://cses.fi/problemset/", "tag": "🛠 Practice"},
        {"label": "Codeforces EDU", "url": "https://codeforces.com/edu/courses", "tag": "🛠 Practice"},
        {"label": "CP-Algorithms", "url": "https://cp-algorithms.com/", "tag": "📖 Reference"},
        {"label": "AtCoder DP Contest", "url": "https://atcoder.jp/contests/dp", "tag": "🛠 Practice"},
    ],
}


def get_curated(topic: str, node_title: str) -> List[Dict]:
    """Return curated resources whose key appears in the topic or node title."""
    combined = (topic + " " + node_title).lower()
    results = []
    seen = set()
    for key, items in _CURATED.items():
        if key in combined:
            for item in items:
                if item["url"] not in seen:
                    seen.add(item["url"])
                    results.append({**item, "source": "curated"})
    return results


# ─── GitHub Search ────────────────────────────────────────────────────────────

async def search_github(query: str, limit: int = 3) -> List[Dict]:
    token = os.getenv("GITHUB_TOKEN", "")
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    params = {"q": query, "sort": "stars", "order": "desc", "per_page": limit}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(
                "https://api.github.com/search/repositories",
                headers=headers, params=params,
            )
            if r.status_code != 200:
                logger.warning(f"GitHub search {r.status_code}: {r.text[:200]}")
                return []
            items = r.json().get("items", [])
            return [
                {
                    "label": f"{item['full_name']} ({item['stargazers_count']:,}★)",
                    "url": item["html_url"],
                    "tag": "⭐ GitHub",
                    "source": "github",
                }
                for item in items if item.get("html_url")
            ]
    except Exception as e:
        logger.warning(f"GitHub search failed: {e}")
        return []


# ─── ArXiv Search ─────────────────────────────────────────────────────────────

async def search_arxiv(query: str, limit: int = 2) -> List[Dict]:
    params = {
        "search_query": f"all:{query}",
        "start": 0,
        "max_results": limit,
        "sortBy": "relevance",
        "sortOrder": "descending",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get("https://export.arxiv.org/api/query", params=params)
            root = ET.fromstring(r.text)
            ns = {"atom": "http://www.w3.org/2005/Atom"}
            results = []
            for entry in root.findall("atom:entry", ns):
                title_el = entry.find("atom:title", ns)
                id_el = entry.find("atom:id", ns)
                if title_el is not None and id_el is not None:
                    results.append({
                        "label": title_el.text.strip().replace("\n", " ")[:80],
                        "url": id_el.text.strip(),
                        "tag": "📄 Paper",
                        "source": "arxiv",
                    })
            return results
    except Exception as e:
        logger.warning(f"ArXiv search failed: {e}")
        return []


# ─── YouTube ──────────────────────────────────────────────────────────────────

async def search_youtube(query: str, limit: int = 2) -> List[Dict]:
    """Use YouTube Data API v3 if key present, else return a search URL fallback."""
    yt_key = os.getenv("YOUTUBE_API_KEY", "")
    if not yt_key:
        # Fallback: return a YouTube search link — always valid, user picks the video
        encoded = query.replace(" ", "+")
        return [{
            "label": f"YouTube: {query}",
            "url": f"https://www.youtube.com/results?search_query={encoded}",
            "tag": "▶ YouTube Search",
            "source": "youtube_search",
        }]
    params = {
        "part": "snippet", "q": query, "type": "video",
        "maxResults": limit, "relevanceLanguage": "en",
        "videoDuration": "medium", "key": yt_key,
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(
                "https://www.googleapis.com/youtube/v3/search", params=params
            )
            if r.status_code != 200:
                return []
            items = r.json().get("items", [])
            return [
                {
                    "label": item["snippet"]["title"],
                    "url": f"https://youtube.com/watch?v={item['id']['videoId']}",
                    "tag": "▶ Video",
                    "source": "youtube",
                }
                for item in items if item.get("id", {}).get("videoId")
            ]
    except Exception as e:
        logger.warning(f"YouTube search failed: {e}")
        return []


# ─── Parallel fetch ───────────────────────────────────────────────────────────

async def fetch_resources_for_queries(queries: List[Dict]) -> List[Dict]:
    """
    queries: list of {"type": "github_repo"|"youtube_video"|"research_paper", "query": str}
    Returns deduplicated list of resource dicts.
    """
    tasks = []
    for q in queries:
        qtype = q.get("type", "")
        query = q.get("query", "")
        if qtype == "github_repo":
            tasks.append(search_github(query, limit=2))
        elif qtype == "youtube_video":
            tasks.append(search_youtube(query, limit=2))
        elif qtype == "research_paper":
            tasks.append(search_arxiv(query, limit=2))

    if not tasks:
        return []

    results = await asyncio.gather(*tasks, return_exceptions=True)
    seen_urls: set = set()
    combined = []
    for batch in results:
        if isinstance(batch, list):
            for item in batch:
                url = item.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    combined.append(item)
    return combined
