"""
ocr_extractor.py
Multi-strategy mark extraction from uploaded documents.

Strategy order:
  1. pdfplumber  — for PDF files (most accurate, text-based)
  2. pytesseract — for image files (PNG/JPG/etc.)
  3. Groq LLM    — send extracted text to llama-3.3-70b-versatile for structured parsing
  4. Deterministic fallback — only if everything else fails
"""
from __future__ import annotations

import json
import logging
import os
import re
from typing import List, Dict, Any, Optional

import httpx

logger = logging.getLogger(__name__)


# ─── PDF text extraction via pdfplumber ──────────────────────────────────────

def _extract_text_from_pdf(file_path: str) -> Optional[str]:
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
        return "\n".join(text_parts) if text_parts else None
    except ImportError:
        logger.warning("pdfplumber not installed — trying PyPDF2")
        return _extract_text_from_pdf_pypdf2(file_path)
    except Exception as e:
        logger.warning(f"pdfplumber failed: {e}")
        return None


def _extract_text_from_pdf_pypdf2(file_path: str) -> Optional[str]:
    try:
        import PyPDF2
        text_parts = []
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
        return "\n".join(text_parts) if text_parts else None
    except Exception as e:
        logger.warning(f"PyPDF2 failed: {e}")
        return None


# ─── Image text extraction via pytesseract ────────────────────────────────────

def _extract_text_from_image(file_path: str) -> Optional[str]:
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
        return None
    try:
        from PIL import Image
        import pytesseract
        img = Image.open(file_path)
        text = pytesseract.image_to_string(img)
        return text if text.strip() else None
    except Exception as e:
        logger.warning(f"pytesseract failed: {e}")
        return None


# ─── Heuristic parser (fast, no LLM) ─────────────────────────────────────────

def _heuristic_parse(text: str) -> List[Dict[str, Any]]:
    """
    Try to parse marks from raw text using regex patterns.
    Handles formats like:
      - "Mathematics  85  100"
      - "OS: 72/100"
      - "Data Structures - 78 out of 100"
    """
    results = []
    lines = text.split("\n")

    for line in lines:
        line = line.strip()
        if not line or len(line) < 4:
            continue

        # Pattern: "Subject Name  obtained  max"  (two numbers at end)
        m = re.search(
            r"^([A-Za-z][A-Za-z0-9\s&()/\-,\.]{2,50}?)\s+(\d{1,3})\s+(\d{1,3})\s*$",
            line
        )
        if m:
            subj = m.group(1).strip()
            obt  = int(m.group(2))
            mx   = int(m.group(3))
            if 0 <= obt <= mx <= 200 and len(subj) > 2:
                results.append({"subject": subj, "marks_obtained": obt, "max_marks": mx, "semester": 0})
                continue

        # Pattern: "Subject: obtained/max" or "Subject - obtained/max"
        m = re.search(
            r"^([A-Za-z][A-Za-z0-9\s&()/\-,\.]{2,50}?)[\s:\-]+(\d{1,3})\s*/\s*(\d{1,3})",
            line
        )
        if m:
            subj = m.group(1).strip()
            obt  = int(m.group(2))
            mx   = int(m.group(3))
            if 0 <= obt <= mx <= 200 and len(subj) > 2:
                results.append({"subject": subj, "marks_obtained": obt, "max_marks": mx, "semester": 0})
                continue

        # Pattern: "Subject  obtained" (single number, assume max=100)
        m = re.search(
            r"^([A-Za-z][A-Za-z0-9\s&()/\-,\.]{2,50}?)[\s:\-]+(\d{1,3})\s*$",
            line
        )
        if m:
            subj = m.group(1).strip()
            obt  = int(m.group(2))
            if 0 <= obt <= 100 and len(subj) > 2:
                # Skip lines that look like roll numbers or dates
                skip_words = ["roll", "date", "year", "sem", "reg", "enroll", "total", "sgpa", "cgpa", "grade"]
                if not any(w in subj.lower() for w in skip_words):
                    results.append({"subject": subj, "marks_obtained": obt, "max_marks": 100, "semester": 0})

    return results


# ─── Groq LLM text parser ─────────────────────────────────────────────────────

def _groq_parse_text(raw_text: str) -> Optional[List[Dict[str, Any]]]:
    """Send extracted text to Groq LLM for structured mark extraction."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None

    # Truncate to avoid token limits
    truncated = raw_text[:4000]

    prompt = (
        "Extract all subject marks from the following marksheet text.\n"
        "Return ONLY a JSON array. Each element must have:\n"
        '  {"subject": "...", "marks_obtained": <number>, "max_marks": <number>, "semester": <number or 0>}\n'
        "Rules:\n"
        "- Include every subject you find.\n"
        "- If max_marks is not mentioned, use 100.\n"
        "- If semester is not mentioned, use 0.\n"
        "- Do NOT include totals, SGPA, CGPA, or attendance rows.\n"
        "- Return ONLY the JSON array, no explanation, no markdown.\n\n"
        f"MARKSHEET TEXT:\n{truncated}"
    )

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": "llama-3.3-70b-versatile",
        "temperature": 0.1,
        "max_tokens": 1024,
        "messages": [
            {"role": "system", "content": "You extract structured data from marksheets. Return only valid JSON arrays."},
            {"role": "user", "content": prompt},
        ],
    }

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"].strip()

            # Strip markdown code fences if present
            content = re.sub(r"^```(?:json)?\s*", "", content)
            content = re.sub(r"\s*```$", "", content)

            parsed = json.loads(content)
            if isinstance(parsed, list) and len(parsed) > 0:
                logger.info(f"Groq extracted {len(parsed)} marks from text")
                return parsed
            return None
    except Exception as e:
        logger.warning(f"Groq text parse failed: {e}")
        return None


# ─── Groq vision fallback (for images only) ──────────────────────────────────

def _groq_vision_parse(file_path: str) -> Optional[List[Dict[str, Any]]]:
    """Use Groq vision model for image files when text extraction fails."""
    import base64
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None

    ext = os.path.splitext(file_path)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp"]:
        return None

    # Try available vision models in order
    vision_models = [
        "llama-3.2-90b-vision-preview",
        "llama-3.2-11b-vision-instruct",
        "meta-llama/llama-4-scout-17b-16e-instruct",
    ]

    try:
        with open(file_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
    except Exception:
        return None

    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}.get(ext[1:], "image/jpeg")

    prompt = (
        'Extract all subject marks from this marksheet image. '
        'Return ONLY a JSON array: [{"subject":"...","marks_obtained":...,"max_marks":...,"semester":...}]. '
        'No explanation, no markdown.'
    )

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    for model in vision_models:
        payload = {
            "model": model,
            "temperature": 0.1,
            "max_tokens": 1024,
            "messages": [
                {"role": "system", "content": "Return only valid JSON arrays."},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                    ],
                },
            ],
        }
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.post(url, headers=headers, json=payload)
                if resp.status_code == 400 and "decommissioned" in resp.text:
                    continue  # try next model
                resp.raise_for_status()
                content = resp.json()["choices"][0]["message"]["content"].strip()
                content = re.sub(r"^```(?:json)?\s*", "", content)
                content = re.sub(r"\s*```$", "", content)
                parsed = json.loads(content)
                if isinstance(parsed, list) and len(parsed) > 0:
                    logger.info(f"Vision model {model} extracted {len(parsed)} marks")
                    return parsed
        except Exception as e:
            logger.warning(f"Vision model {model} failed: {e}")
            continue

    return None


# ─── Deterministic fallback ───────────────────────────────────────────────────

def _deterministic_fallback() -> List[Dict[str, Any]]:
    """Last resort — only used when ALL extraction methods fail."""
    logger.warning("All OCR methods failed — returning deterministic fallback")
    return [
        {"subject": "Subject 1 (OCR failed — edit me)", "marks_obtained": 0, "max_marks": 100, "semester": 0},
        {"subject": "Subject 2 (OCR failed — edit me)", "marks_obtained": 0, "max_marks": 100, "semester": 0},
    ]


# ─── Main entry point ─────────────────────────────────────────────────────────

def extract_marks(file_path: str) -> List[Dict[str, Any]]:
    """
    Extract marks from a marksheet file.
    Tries multiple strategies in order of reliability.
    """
    ext = os.path.splitext(file_path)[1].lower()
    raw_text: Optional[str] = None

    # Step 1: Extract raw text
    if ext == ".pdf":
        raw_text = _extract_text_from_pdf(file_path)
        logger.info(f"PDF text extraction: {'success' if raw_text else 'failed'}, len={len(raw_text) if raw_text else 0}")
    elif ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
        raw_text = _extract_text_from_image(file_path)
        logger.info(f"Image OCR: {'success' if raw_text else 'failed'}, len={len(raw_text) if raw_text else 0}")

    # Step 2: If we have text, try heuristic parse first (fast)
    if raw_text and raw_text.strip():
        results = _heuristic_parse(raw_text)
        if len(results) >= 2:
            logger.info(f"Heuristic parse found {len(results)} marks")
            return results

        # Step 3: Heuristic failed — send text to Groq LLM
        results = _groq_parse_text(raw_text)
        if results and len(results) >= 1:
            return results

    # Step 4: For images, try Groq vision
    if ext in [".png", ".jpg", ".jpeg", ".webp"]:
        results = _groq_vision_parse(file_path)
        if results and len(results) >= 1:
            return results

    # Step 5: Last resort
    return _deterministic_fallback()
