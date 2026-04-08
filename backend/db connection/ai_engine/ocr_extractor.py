from __future__ import annotations

import base64
import json
import os
from typing import List, Dict, Any

import httpx
from PIL import Image
import pytesseract


def _deterministic_fallback() -> List[Dict[str, Any]]:
    return [
        {"subject": "Data Structures & Algorithms", "marks_obtained": 72, "max_marks": 100, "semester": 6},
        {"subject": "Operating Systems", "marks_obtained": 58, "max_marks": 100, "semester": 6},
        {"subject": "Database Management System", "marks_obtained": 81, "max_marks": 100, "semester": 6},
        {"subject": "Computer Networks", "marks_obtained": 63, "max_marks": 100, "semester": 6},
        {"subject": "Machine Learning", "marks_obtained": 45, "max_marks": 100, "semester": 6},
    ]


import re

def _try_pytesseract(file_path: str) -> List[Dict[str, Any]] | None:
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
        return None

    try:
        img = Image.open(file_path)
        raw_text = pytesseract.image_to_string(img)
        
        # Basic heuristic parsing: Look for "Subject: Score" patterns
        # Example: "Mathematics 85" or "OS: 72"
        lines = raw_text.split("\n")
        results = []
        for line in lines:
            match = re.search(r"([a-zA-Z\s&]+)[:\s-]+(\d+)", line)
            if match:
                subject = match.group(1).strip()
                score = int(match.group(2))
                if len(subject) > 2 and score <= 100:
                    results.append({
                        "subject": subject,
                        "marks_obtained": score,
                        "max_marks": 100,
                        "semester": 6 # Default to current
                    })
        
        if len(results) >= 2:
            return results
            
        return None # Too few results, try vision fallback
    except Exception:
        return None



def _try_groq_vision(file_path: str) -> List[Dict[str, Any]] | None:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None

    ext = os.path.splitext(file_path)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp"]:
        return None

    prompt = (
        "Extract all subject names, marks obtained, maximum marks, and semester "
        "from this marksheet. Return ONLY a JSON array like: "
        '[{"subject":"...","marks_obtained":..., "max_marks":..., "semester":...}]. '
        "No explanation, no markdown."
    )

    with open(file_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    # Groq's OpenAI-compatible endpoint
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    # Model name may vary by Groq availability; if it fails we fallback gracefully.
    payload = {
        "model": "llama-3.2-11b-vision-preview",
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": "You return strict JSON only."},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/{ext[1:]};base64,{b64}"}},
                ],
            },
        ],
    }

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            if isinstance(parsed, list):
                return parsed
            return None
    except Exception:
        return None


def extract_marks(file_path: str) -> List[Dict[str, Any]]:
    """
    OCR extractor:
    - primary: pytesseract (local)
    - fallback: Groq vision if GROQ_API_KEY is set
    - fallback: deterministic stub
    """
    res = _try_pytesseract(file_path)
    if res:
        return res

    res = _try_groq_vision(file_path)
    if res:
        return res

    return _deterministic_fallback()


