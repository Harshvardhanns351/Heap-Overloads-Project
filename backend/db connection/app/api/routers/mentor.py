import json
import os
from datetime import datetime
from typing import List, Literal, Optional, Dict, Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.auth.deps import get_current_user, role_required
from app.database import get_session
from app.models import Mark, Roadmap, RoadmapNode, RiskScore, User

router = APIRouter()


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class MentorChatRequest(BaseModel):
    message: str
    conversation_history: List[ChatMessage] = []


class MentorChatResponse(BaseModel):
    reply: str


def _load_prompt_template() -> str:
    here = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    # app/api/routers -> app/api -> app -> (..)
    prompt_path = os.path.abspath(os.path.join(here, "..", "..", "ai_engine", "prompts", "mentor.txt"))
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        # Hard fallback (should not happen in repo)
        return (
            "You are an academic mentor for engineering students. "
            "You do NOT provide mental health advice or therapy. "
            "Student context: Name: {name}. Weak subjects: {weak_subjects}. "
            "Current roadmap node: {current_node}. Recent marks trend: {marks_trend}."
        )


def _student_context(session, student: User) -> Dict[str, Any]:
    marks = session.exec(select(Mark).where(Mark.student_id == student.id)).all()
    weak_subjects = []
    mark_pcts = []
    for m in marks:
        pct = None
        try:
            pct = float(m.score) / float(m.max_score) * 100.0 if m.max_score else None
        except Exception:
            pct = None
        if pct is not None:
            mark_pcts.append(pct)
            if pct < 60:
                weak_subjects.append(m.subject)

    marks_trend = "unknown"
    if mark_pcts:
        avg = sum(mark_pcts) / len(mark_pcts)
        marks_trend = f"avg {avg:.0f}% across {len(mark_pcts)} subjects"

    roadmap = session.exec(select(Roadmap).where(Roadmap.student_id == student.id)).first()
    current_node = "none"
    if roadmap:
        node = session.exec(
            select(RoadmapNode)
            .where(RoadmapNode.roadmap_id == roadmap.id)
            .where(RoadmapNode.status == "in_progress")
            .order_by(RoadmapNode.order_index.asc())
        ).first()
        if node:
            current_node = node.title

    recent_risk = session.exec(
        select(RiskScore)
        .where(RiskScore.student_id == student.id)
        .order_by(RiskScore.created_at.desc())
        .limit(1)
    ).first()

    return {
        "name": student.name,
        "weak_subjects": sorted(list(set(weak_subjects))) or ["none"],
        "current_node": current_node,
        "marks_trend": marks_trend,
        "recent_risk_level": getattr(recent_risk, "level", None),
    }


def _call_groq(messages: List[Dict[str, str]]) -> Optional[str]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": "llama3-70b-8192",
        "temperature": 0.4,
        "messages": messages,
    }

    try:
        with httpx.Client(timeout=40) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except Exception:
        return None


@router.post(
    "/chat",
    response_model=MentorChatResponse,
    dependencies=[Depends(role_required(["student"]))],
)
def mentor_chat(
    payload: MentorChatRequest,
    current_user: User = Depends(get_current_user),
    session=Depends(get_session),
):
    text = (payload.message or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="message is required")

    ctx = _student_context(session, current_user)
    template = _load_prompt_template()
    system_prompt = template.format(
        name=ctx["name"],
        weak_subjects=", ".join(ctx["weak_subjects"]),
        current_node=ctx["current_node"],
        marks_trend=ctx["marks_trend"],
    )

    # Build Groq/OpenAI-style messages
    messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for m in payload.conversation_history[-20:]:
        if m.role not in ("user", "assistant"):
            continue
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": text})

    reply = _call_groq(messages)
    if reply:
        return MentorChatResponse(reply=reply)

    # Deterministic fallback (no Groq key / error)
    weak = ctx["weak_subjects"]
    node = ctx["current_node"]
    if weak and weak != ["none"]:
        focus = weak[0]
        fallback = (
            f"Based on your current roadmap node ({node}) and weak subject ({focus}), "
            f"let’s do 30 minutes of {focus} fundamentals and 2 practice problems. "
            f"Then we’ll return to {node} and connect the concepts."
        )
    else:
        fallback = (
            f"Based on your current roadmap node ({node}), start with a quick concept review "
            f"and then solve 2 practice problems. Tell me what part feels confusing and I’ll explain it."
        )

    return MentorChatResponse(reply=fallback)

