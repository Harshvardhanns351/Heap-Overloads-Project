from __future__ import annotations

import json
import os
from typing import List, Dict, Any, Optional

import httpx

# ─── Fallback roadmaps (goal-aware) ──────────────────────────────────────────

_FALLBACKS: Dict[str, List[Dict]] = {
    "placement": [
        {"title": "Arrays & Strings", "node_type": "concept", "hours": 8, "description": "Two-pointer, sliding window, prefix sums.", "resources": [{"label": "GFG Arrays", "url": "https://www.geeksforgeeks.org/array-data-structure/"}, {"label": "LeetCode Explore", "url": "https://leetcode.com/explore/learn/card/array-and-string/"}], "prereq_ids": []},
        {"title": "Linked Lists", "node_type": "concept", "hours": 6, "description": "Singly, doubly, cycle detection, merge sorted.", "resources": [{"label": "Striver A2Z", "url": "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/"}], "prereq_ids": []},
        {"title": "Stacks & Queues", "node_type": "concept", "hours": 6, "description": "Monotonic stack, deque, next greater element.", "resources": [{"label": "GFG Stack", "url": "https://www.geeksforgeeks.org/stack-data-structure/"}], "prereq_ids": []},
        {"title": "Binary Trees & BST", "node_type": "concept", "hours": 10, "description": "Traversals, LCA, diameter, BST operations.", "resources": [{"label": "MIT OCW Trees", "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/"}], "prereq_ids": []},
        {"title": "Graph Algorithms", "node_type": "concept", "hours": 12, "description": "BFS, DFS, Dijkstra, topo sort, union-find.", "resources": [{"label": "William Fiset", "url": "https://www.youtube.com/playlist?list=PLDV1Zeh2NRsDGO4--qE8yH72HFL1Km93P"}], "prereq_ids": []},
        {"title": "Dynamic Programming", "node_type": "practice", "hours": 15, "description": "1D/2D DP, LCS, Knapsack, DP on trees.", "resources": [{"label": "Aditya Verma DP", "url": "https://www.youtube.com/playlist?list=PL_z_8CaSLPWekqhdCPmFohncHwz8TY2Go"}], "prereq_ids": []},
        {"title": "System Design Basics", "node_type": "project", "hours": 10, "description": "URL shortener, rate limiter, consistent hashing.", "resources": [{"label": "System Design Primer", "url": "https://github.com/donnemartin/system-design-primer"}], "prereq_ids": []},
        {"title": "Mock Interviews", "node_type": "practice", "hours": 8, "description": "Timed problem solving, communication practice.", "resources": [{"label": "Pramp", "url": "https://www.pramp.com/"}], "prereq_ids": []},
    ],
    "system_design": [
        {"title": "Distributed Systems Basics", "node_type": "concept", "hours": 8, "description": "CAP theorem, consistency models, replication.", "resources": [{"label": "Designing Data-Intensive Apps", "url": "https://dataintensive.net/"}], "prereq_ids": []},
        {"title": "Database Sharding & Indexing", "node_type": "concept", "hours": 6, "description": "Horizontal vs vertical scaling, B-tree indexes.", "resources": [{"label": "Use The Index Luke", "url": "https://use-the-index-luke.com/"}], "prereq_ids": []},
        {"title": "Caching Strategies", "node_type": "concept", "hours": 5, "description": "Redis, Memcached, cache invalidation patterns.", "resources": [{"label": "Redis Docs", "url": "https://redis.io/docs/"}], "prereq_ids": []},
        {"title": "Message Queues", "node_type": "concept", "hours": 5, "description": "Kafka, RabbitMQ, pub-sub vs queue.", "resources": [{"label": "Kafka Docs", "url": "https://kafka.apache.org/documentation/"}], "prereq_ids": []},
        {"title": "Design URL Shortener", "node_type": "project", "hours": 6, "description": "Hash functions, redirect logic, analytics.", "resources": [{"label": "Gaurav Sen", "url": "https://www.youtube.com/c/GauravSensei"}], "prereq_ids": []},
        {"title": "Design Twitter Feed", "node_type": "project", "hours": 8, "description": "Fan-out, timeline generation, ranking.", "resources": [{"label": "System Design Primer", "url": "https://github.com/donnemartin/system-design-primer"}], "prereq_ids": []},
    ],
    "default": [
        {"title": "CS Fundamentals", "node_type": "concept", "hours": 8, "description": "Data structures, algorithms, complexity analysis.", "resources": [{"label": "CLRS", "url": "https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/"}], "prereq_ids": []},
        {"title": "DBMS & SQL", "node_type": "concept", "hours": 6, "description": "Normalization, transactions, query optimization.", "resources": [{"label": "SQLZoo", "url": "https://sqlzoo.net/"}], "prereq_ids": []},
        {"title": "OS Concepts", "node_type": "concept", "hours": 6, "description": "Processes, threads, memory management, scheduling.", "resources": [{"label": "OSTEP", "url": "https://pages.cs.wisc.edu/~remzi/OSTEP/"}], "prereq_ids": []},
        {"title": "Computer Networks", "node_type": "concept", "hours": 6, "description": "OSI layers, TCP/IP, DNS, HTTP/HTTPS.", "resources": [{"label": "Tanenbaum Networks", "url": "https://www.pearson.com/en-us/subject-catalog/p/computer-networks/P200000003188"}], "prereq_ids": []},
        {"title": "Capstone Project", "node_type": "project", "hours": 12, "description": "Build a full-stack project applying all concepts.", "resources": [{"label": "GitHub", "url": "https://github.com/"}], "prereq_ids": []},
    ],
}


def generate_roadmap_fallback(goal: str, branch: str = "CSE") -> List[Dict]:
    g = goal.lower()
    if any(k in g for k in ["placement", "faang", "interview", "crack"]):
        return _FALLBACKS["placement"]
    if any(k in g for k in ["system design", "architect", "scale"]):
        return _FALLBACKS["system_design"]
    return _FALLBACKS["default"]


# ─── Groq call ────────────────────────────────────────────────────────────────

def _weak_subjects(marks: List[Dict]) -> str:
    weak = []
    for m in marks:
        pct = m.get("percentage") or (
            (m.get("score", 0) / m.get("max_score", 100)) * 100
            if m.get("max_score") else None
        )
        if pct is not None and pct < 60:
            weak.append(m.get("subject", ""))
    return ", ".join(w for w in weak if w) or "none"


def generate_roadmap(
    goal: str,
    semester: int,
    branch: str,
    marks: List[Dict],
    duration_weeks: int = 4,
) -> List[Dict]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return generate_roadmap_fallback(goal, branch)

    node_count = min(8, duration_weeks * 2)
    weak = _weak_subjects(marks)

    prompt = (
        f"Generate a {node_count}-node learning roadmap for an engineering student.\n"
        f"Goal: {goal}\nBranch: {branch}, Semester: {semester}\n"
        f"Weak subjects (below 60%): {weak}\n"
        f"Duration: {duration_weeks} weeks\n\n"
        "Return ONLY a JSON array (no markdown, no explanation):\n"
        '[{"title":"...","node_type":"concept|practice|project","hours":6,'
        '"description":"...","resources":[{"label":"...","url":"https://..."}],'
        '"prereq_ids":[]}, ...]\n'
        f"Generate exactly {node_count} nodes. First node should be the most foundational."
    )

    try:
        with httpx.Client(timeout=40) as client:
            resp = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": "llama3-70b-8192",
                    "temperature": 0.3,
                    "max_tokens": 3000,
                    "messages": [
                        {"role": "system", "content": "You are a learning roadmap generator. Return ONLY valid JSON arrays. No markdown fences."},
                        {"role": "user", "content": prompt},
                    ],
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"].strip()
            # Strip markdown fences if present
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            nodes = json.loads(content)
            if isinstance(nodes, list) and nodes:
                return nodes
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Groq roadmap generation failed: {e}")

    return generate_roadmap_fallback(goal, branch)
