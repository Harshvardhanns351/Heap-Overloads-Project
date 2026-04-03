from __future__ import annotations

import json
import os
from typing import List, Dict, Any, Optional

import httpx


def _deterministic(goal: str, semester: int, branch: str, marks: List[Dict[str, Any]]) -> Dict[str, Any]:
    nodes = [
        {
            "id": 1,
            "title": "Arrays & Strings",
            "type": "concept",
            "estimated_hours": 8,
            "description": "Master array manipulation, two-pointer and sliding window techniques.",
            "resources": ["GFG Arrays", "LeetCode Array Explore"],
            "prerequisites": [],
            "status": "pending",
        },
        {
            "id": 2,
            "title": "Linked Lists",
            "type": "concept",
            "estimated_hours": 6,
            "description": "Singly, doubly, circular. Reverse, detect cycle, merge sorted lists.",
            "resources": ["GFG Linked List", "Striver A2Z"],
            "prerequisites": [1],
            "status": "pending",
        },
        {
            "id": 3,
            "title": "Binary Search Trees",
            "type": "concept",
            "estimated_hours": 8,
            "description": "BST operations, traversal patterns, height-balanced trees basics.",
            "resources": ["MIT OCW Trees", "CP-Algorithms BST"],
            "prerequisites": [2],
            "status": "pending",
        },
        {
            "id": 4,
            "title": "Graph Fundamentals",
            "type": "concept",
            "estimated_hours": 12,
            "description": "BFS, DFS, cycle detection, topo sort, shortest paths.",
            "resources": ["William Fiset Graphs", "GFG Graph"],
            "prerequisites": [3],
            "status": "pending",
        },
        {
            "id": 5,
            "title": "DP — 1D & 2D",
            "type": "practice",
            "estimated_hours": 15,
            "description": "Memoization to tabulation. LCS, Knapsack, DP on grids.",
            "resources": ["Striver DP Series", "Aditya Verma DP"],
            "prerequisites": [4],
            "status": "pending",
        },
        {
            "id": 6,
            "title": "System Design Basics",
            "type": "project",
            "estimated_hours": 10,
            "description": "URL shortener, rate limiter, consistent hashing. For placements.",
            "resources": ["System Design Primer", "Gaurav Sen"],
            "prerequisites": [5],
            "status": "pending",
        },
    ]
    # First node is in progress by default.
    nodes[0]["status"] = "in_progress"

    return {"title": f"{branch} Semester {semester} Roadmap", "nodes": nodes}


def _weak_subjects(marks: List[Dict[str, Any]]) -> List[str]:
    weak = []
    for m in marks:
        # expected: {subject, score/max_score} from DB conversion
        pct = m.get("percentage")
        if pct is not None and pct < 60:
            weak.append(m.get("subject", ""))
    return [w for w in weak if w]


def _try_groq(goal: str, semester: int, branch: str, marks: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None

    weak = _weak_subjects(marks)
    system_prompt = "You are an academic roadmap generator. Return ONLY valid JSON. No markdown."
    user_prompt = (
        "Generate a learning roadmap for an engineering student.\n"
        f"Marks: {json.dumps(marks)}\n"
        f"Goal: {goal}. Semester: {semester}.\n"
        f"Weak subjects (below 60%): {weak}.\n"
        "Return a JSON object: { title, nodes: [ { id, title, description, "
        "estimated_hours, type (concept|practice|project), prerequisites: [id,...], "
        "status: 'pending' } ] }. Generate 8-12 nodes."
    )

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": "llama3-70b-8192",
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    try:
        with httpx.Client(timeout=40) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            if isinstance(parsed, dict) and "nodes" in parsed:
                return parsed
            return None
    except Exception:
        return None


def generate(goal: str, semester: int, branch: str, marks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Returns: { title, nodes: [...] } where each node matches the spec fields.
    Uses Groq if `GROQ_API_KEY` is set, otherwise deterministic fallback.
    """
    groq_res = _try_groq(goal=goal, semester=semester, branch=branch, marks=marks)
    if groq_res:
        # Ensure at least one node is in_progress for UI.
        nodes = groq_res.get("nodes") or []
        if isinstance(nodes, list) and nodes:
            if not any(n.get("status") == "in_progress" for n in nodes if isinstance(n, dict)):
                nodes[0]["status"] = "in_progress"
        return groq_res

    return _deterministic(goal=goal, semester=semester, branch=branch, marks=marks)

