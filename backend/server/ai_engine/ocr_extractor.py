"""
ocr_extractor.py — Academic Document OCR Extractor
=====================================================
Handles two document types without any extra installs beyond what's already
on the system (pdfplumber, pytesseract, Pillow, OpenCV, poppler-utils).

Document types:
  • Mumbai University Grade Cards  (scanned PDFs)
    -> returns: [{subject, score, max_score, semester}, ...]
  • Attendance / Defaulter Sheets  (text-layer PDFs)
    -> returns: [{roll_no, name, total, out_of, avg_percent}, ...]

Pipeline per file:
  1. pdfplumber text extraction      (fast; works for text PDFs)
  2. pdftoppm render -> pytesseract  (custom table OCR for scanned PDFs)
  3. Groq vision API                 (true last-resort fallback only)

No pdf2image, no extra Poppler install -- uses subprocess pdftoppm directly.
pdftoppm ships with poppler-utils which is already on most Linux systems.
"""

from __future__ import annotations

import json
import logging
import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

VALID_TOTALS: set[int] = {25, 50, 75, 100, 150, 200}

PAPER_CODE_RE = re.compile(
    r"^\s*([A-Z]{2,4}\s*\d{3,4}|\d{5,6})\s+",
    re.IGNORECASE,
)

# Keyword sets -> canonical subject names
SUBJECT_MAP: list[tuple[list[str], str]] = [
    (["mathematics", "math"],                      "Engineering Mathematics"),
    (["physics"],                                  "Engineering Physics"),
    (["chemistry", "hemistry"],                    "Engineering Chemistry"),
    (["mechanics", "mechanic"],                    "Engineering Mechanics"),
    (["electrical"],                               "Basic Electrical Engineering"),
    (["workshop", "practice"],                     "Basic Workshop Practice"),
    (["graphics", "graphic"],                      "Engineering Graphics"),
    (["programming", "c program"],                 "C Programming"),
    (["communication", "ethics", "professional"],  "Professional Communication and Ethics"),
    (["science", "environ"],                       "Environmental Science"),
]

SKIP_PHRASES = [
    "paper code", "paper name", "credit", "grand total", "sgpi", "cgpi",
    "abbreviations", "statement no", "director", "board of exam",
    "date:", "ordinance", "percentage", "grade:", "status:",
    "min/", "ua", "ca", "cr x gp", "crxgp", "semester grade",
    "cumulative grade", "grade points", "unfair means",
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_marks(file_path: str, doc_type: str = "auto") -> list[dict]:
    """
    Extract marks / attendance from a PDF or image file.

    Returns list of dicts:
      Grade card:    {subject, score, max_score, semester}
      Attendance:    {roll_no, name, total, out_of, avg_percent}
    """
    path = Path(file_path)
    ext  = path.suffix.lower()
    logger.info("OCR extract: %s  doc_type=%s", path.name, doc_type)

    if ext == ".pdf":
        # Step 1: text-layer extraction (attendance sheets, digital PDFs)
        results = _extract_text_pdf(file_path, doc_type)
        if results:
            logger.info("Text PDF extraction: %d rows", len(results))
            return results

        # Step 2: render pages -> custom image OCR (scanned grade cards)
        logger.info("No text layer -- rendering pages for custom OCR")
        results = _extract_scanned_pdf(file_path, doc_type)
        if results:
            logger.info("Custom image OCR: %d rows", len(results))
            return results

    elif ext in (".jpg", ".jpeg", ".png", ".webp", ".bmp"):
        results = _ocr_image_file(file_path, doc_type)
        if results:
            return results

    # Step 3: Groq vision fallback (only if steps 1+2 both failed)
    logger.warning("Custom OCR yielded nothing -- trying Groq vision fallback")
    return _groq_vision_fallback(file_path, doc_type)


def extract_student_info(file_path: str) -> dict:
    """
    Extract header metadata from a grade card PDF:
    prn, name, seat_number, college, semester, sgpi, grand_total
    """
    text = _read_pdf_text(file_path)
    if not text.strip():
        text = _ocr_first_page_text(file_path)

    info: dict = {}
    patterns = {
        "prn":         r"PRN[:\s]+([0-9]{10,20})",
        "name":        r"Name[:\s]+([A-Z][A-Z\s\(\)]+?)(?:\n|PRN|Seat)",
        "seat_number": r"Seat\s+Number[:\s]+(\w+)",
        "college":     r"College[:\s]+(.+?)(?:\n|Exam)",
        "sgpi":        r"SGPI[:\s]*([\d.]+)",
        "grand_total": r"Grand\s+Total[:\s]*([\d]+/[\d]+)",
    }
    for field, pattern in patterns.items():
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            info[field] = m.group(1).strip()

    sem = _detect_semester(text)
    if sem:
        info["semester"] = sem

    return info


# ---------------------------------------------------------------------------
# Step 1 -- Text-layer PDF
# ---------------------------------------------------------------------------

def _read_pdf_text(file_path: str) -> str:
    try:
        import pdfplumber
        pages = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages.append(t)
        return "\n".join(pages)
    except Exception as e:
        logger.debug("pdfplumber error: %s", e)
        return ""


def _extract_text_pdf(file_path: str, doc_type: str) -> list[dict]:
    text = _read_pdf_text(file_path)
    if not text.strip():
        return []

    detected = _detect_doc_type(text, doc_type)
    logger.debug("Text PDF detected type: %s", detected)

    if detected == "attendance":
        return _parse_attendance_text(text)
    if detected == "grade_card":
        return _parse_grade_card_text(text, _detect_semester(text))
    return []


# ---------------------------------------------------------------------------
# Step 2 -- Render + Custom OCR (scanned PDFs / images)
# ---------------------------------------------------------------------------

def _render_pdf_pages(file_path: str, tmpdir: str, dpi: int = 300) -> list[Path]:
    """Render all PDF pages to JPEG using pdftoppm (part of poppler-utils)."""
    prefix = os.path.join(tmpdir, "page")
    try:
        subprocess.run(
            ["pdftoppm", "-jpeg", "-r", str(dpi), file_path, prefix],
            check=True, capture_output=True, timeout=60,
        )
    except FileNotFoundError:
        logger.warning("pdftoppm not found -- install poppler-utils")
        return []
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
        logger.warning("pdftoppm failed: %s", e)
        return []
    return sorted(Path(tmpdir).glob("page-*.jpg"))


def _extract_scanned_pdf(file_path: str, doc_type: str) -> list[dict]:
    with tempfile.TemporaryDirectory() as tmpdir:
        pages = _render_pdf_pages(file_path, tmpdir)
        logger.info("Rendered %d page(s)", len(pages))
        if not pages:
            return []

        results: list[dict] = []
        for page_path in pages:
            results.extend(_ocr_image_file(str(page_path), doc_type))

    # De-duplicate identical rows across pages
    seen: set[tuple] = set()
    deduped: list[dict] = []
    for r in results:
        key = (r.get("subject", r.get("name", "")), r.get("score", r.get("total", 0)))
        if key not in seen:
            seen.add(key)
            deduped.append(r)
    return deduped


def _ocr_image_file(file_path: str, doc_type: str) -> list[dict]:
    try:
        import cv2
        import pytesseract
        from PIL import Image
    except ImportError as e:
        logger.warning("OCR dependency missing: %s", e)
        return []

    img = cv2.imread(file_path)
    if img is None:
        logger.warning("Could not read image: %s", file_path)
        return []

    # Pre-process: grayscale -> denoise -> binary threshold
    gray     = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    _, thresh = cv2.threshold(denoised, 150, 255, cv2.THRESH_BINARY)
    pil_img  = Image.fromarray(thresh)

    # Word-level positional data is more reliable than raw text for tables
    data = pytesseract.image_to_data(
        pil_img,
        config="--psm 6 --oem 3",
        output_type=pytesseract.Output.DICT,
    )

    pos_lines = _build_positional_lines(data)
    raw_text  = "\n".join(line for _, line in pos_lines)

    detected = _detect_doc_type(raw_text, doc_type)
    semester = _detect_semester(raw_text)
    logger.debug("Image OCR detected: %s  semester: %d", detected, semester)

    if detected == "attendance":
        return _parse_attendance_text(raw_text)
    # Default: treat as grade card
    return _parse_grade_card_positional(pos_lines, semester)


def _build_positional_lines(tess_data: dict) -> list[tuple[float, str]]:
    """
    Group tesseract word tokens into text lines by vertical position (top coord).
    Words within 14px vertically are treated as the same line.
    Returns list of (y_top, line_text) sorted top-to-bottom.
    """
    words: list[tuple[float, float, str]] = []
    for i, word in enumerate(tess_data["text"]):
        word = word.strip()
        if not word or int(tess_data["conf"][i]) < 20:
            continue
        words.append((float(tess_data["top"][i]), float(tess_data["left"][i]), word))

    if not words:
        return []

    words.sort(key=lambda x: x[0])

    lines: list[tuple[float, str]] = []
    current_top  = words[0][0]
    current_line: list[tuple[float, str]] = []

    for top, left, word in words:
        if abs(top - current_top) <= 14:
            current_line.append((left, word))
            current_top = (current_top + top) / 2
        else:
            if current_line:
                current_line.sort(key=lambda x: x[0])
                lines.append((current_top, " ".join(w for _, w in current_line)))
            current_line = [(left, word)]
            current_top  = top

    if current_line:
        current_line.sort(key=lambda x: x[0])
        lines.append((current_top, " ".join(w for _, w in current_line)))

    return lines


# ---------------------------------------------------------------------------
# Grade card parser -- positional lines from image OCR
# ---------------------------------------------------------------------------

def _parse_grade_card_positional(
    pos_lines: list[tuple[float, str]], semester: int
) -> list[dict]:
    """
    Parse Mumbai University grade card rows from positional OCR lines.

    Each data row has UA section (Min/Max fraction, Obt, Exm),
    CA section (Min/Max fraction, Obt, Exm), then Total Max and Obt.
    Subject names are often split across adjacent lines.

    Algorithm:
      For every line that contains valid grade data (has a recognisable
      Total Max/Obt pair), gather context from the lines immediately above
      and below, resolve the canonical subject name from keywords in the
      combined context, then record the result.
    """
    results: list[dict] = []
    n = len(pos_lines)

    def is_data_line(line: str) -> bool:
        tmax, _ = _find_total_v2(line)
        return tmax is not None and len(_get_standalone_nums(line)) >= 3

    for i, (top, line) in enumerate(pos_lines):
        if not is_data_line(line):
            continue

        # Gather surrounding lines for subject name resolution
        context_parts = [line]
        if i > 0:
            prev_top, prev_line = pos_lines[i - 1]
            if top - prev_top < 120 and not is_data_line(prev_line):
                context_parts.insert(0, prev_line)
        if i + 1 < n:
            next_top, next_line = pos_lines[i + 1]
            if next_top - top < 120 and not is_data_line(next_line):
                context_parts.append(next_line)

        combined_lower = " ".join(context_parts).lower()

        # Skip header / footer noise
        if any(phrase in combined_lower for phrase in SKIP_PHRASES):
            continue

        # Determine row type (TW / OR / PR = lab/term-work)
        is_tw = bool(
            re.search(r"\btw\b|\bterm.?work\b|\bor\b|\boral\b|\bpr\b|\bpractical\b",
                      combined_lower)
        )

        subject = _resolve_subject(combined_lower, is_tw)
        if not subject:
            continue

        tmax, tobt = _find_total_v2(line)
        if tmax is None or tobt is None or not (0 <= tobt <= tmax):
            continue

        # Skip duplicate (same subject + same max already recorded)
        if any(r["subject"] == subject and r["max_score"] == tmax for r in results):
            continue

        results.append({
            "subject":   subject,
            "score":     tobt,
            "max_score": tmax,
            "semester":  semester,
        })
        logger.debug("  -> %s: %d/%d (sem %d)", subject, tobt, tmax, semester)

    logger.info("Grade card positional parser: %d subjects from %d lines", len(results), n)
    return results


def _find_total_v2(line: str) -> tuple[Optional[int], Optional[int]]:
    """
    Extract (total_max, total_obt) from one grade card data line.

    Strategy A -- direct:
      Scan standalone integers right-to-left for a (valid_max, obt) pair
      where valid_max is in VALID_TOTALS and 0 <= obt <= valid_max.

    Strategy B -- derived:
      Sum the denominators of UA/CA fractions (e.g. 32/80 + 8/20 = 100)
      to compute total_max, then pick the best candidate for total_obt.
    """
    standalone = _get_standalone_nums(line)

    # Strategy A
    for i in range(len(standalone) - 1, 0, -1):
        cmax, cobt = standalone[i - 1], standalone[i]
        if cmax in VALID_TOTALS and 0 <= cobt <= cmax:
            return cmax, cobt

    # Strategy B
    fractions = re.findall(r"(\d+)/(\d+)", line)
    if fractions:
        denoms = [int(b) for _, b in fractions if 5 <= int(b) <= 150]
        derived_max = sum(denoms)
        if derived_max in VALID_TOTALS:
            candidates = [n for n in standalone if 0 < n <= derived_max]
            if candidates:
                return derived_max, max(candidates)

    return None, None


def _get_standalone_nums(text: str) -> list[int]:
    """Extract standalone integers 0-300, ignoring fraction parts."""
    cleaned = re.sub(r"\d+/\d+", "", text)
    return [int(x) for x in re.findall(r"\b(\d{1,3})\b", cleaned) if 0 <= int(x) <= 300]


def _resolve_subject(text_lower: str, is_tw: bool) -> Optional[str]:
    """Map combined context text to a canonical subject name."""
    for keywords, canonical in SUBJECT_MAP:
        if any(kw in text_lower for kw in keywords):
            return canonical + (" (TW)" if is_tw else "")
    return None


# ---------------------------------------------------------------------------
# Grade card parser -- clean text (digital PDFs)
# ---------------------------------------------------------------------------

def _parse_grade_card_text(text: str, semester: int) -> list[dict]:
    results: list[dict] = []
    for line in text.split("\n"):
        if any(phrase in line.lower() for phrase in SKIP_PHRASES):
            continue
        tmax, tobt = _find_total_v2(line)
        if tmax is None:
            continue
        ll = line.lower()
        is_tw = bool(re.search(r"\btw\b|\bterm.?work\b|\bor\b|\bpr\b", ll))
        subject = _resolve_subject(ll, is_tw)
        if not subject:
            continue
        if any(r["subject"] == subject and r["max_score"] == tmax for r in results):
            continue
        results.append({"subject": subject, "score": tobt, "max_score": tmax, "semester": semester})
    return results


# ---------------------------------------------------------------------------
# Attendance / Defaulter Sheet parser
# ---------------------------------------------------------------------------

def _parse_attendance_text(text: str) -> list[dict]:
    """
    Parse a Defaulter / Attendance Sheet.

    Student row format:
      <roll_no>  <FULL NAME IN CAPS>  <many numbers>  <total>  <avg_percent>

    The last two numbers on the line are total attended and avg%.
    """
    results: list[dict] = []

    out_of_match = re.search(r"Out\s+of.*?(\d{3,})", text, re.DOTALL)
    out_of = int(out_of_match.group(1)) if out_of_match else None

    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        m = re.match(r"^(\d{1,3})\s+([A-Z][A-Z\s]+[A-Z])\s+([\d\s]+)$", line)
        if not m:
            continue

        roll_no = m.group(1).strip()
        name    = re.sub(r"\s+", " ", m.group(2)).strip()
        nums    = [int(x) for x in m.group(3).split() if x.isdigit()]
        if len(nums) < 2:
            continue

        avg_pct = nums[-1]
        total   = nums[-2]
        if not (0 <= avg_pct <= 100):
            continue

        results.append({
            "roll_no":     roll_no,
            "name":        name,
            "total":       total,
            "out_of":      out_of,
            "avg_percent": float(avg_pct),
        })

    logger.info("Attendance parser: %d students", len(results))
    return results


# ---------------------------------------------------------------------------
# Detection helpers
# ---------------------------------------------------------------------------

def _detect_doc_type(text: str, hint: str) -> str:
    if hint not in ("auto", ""):
        h = hint.lower()
        if any(k in h for k in ("attend", "defaulter", "absence")):
            return "attendance"
        if any(k in h for k in ("mark", "grade", "result", "transcript")):
            return "grade_card"

    tl = text.lower()
    if any(k in tl for k in ("defaulter", "attendance sheet", "avg. attend", "avg attend")):
        return "attendance"
    if any(k in tl for k in ("grade card", "sgpi", "sem i", "sem ii", "university of mumbai")):
        return "grade_card"
    return "unknown"


def _detect_semester(text: str) -> int:
    roman = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8}
    for pat in (
        r"Sem\s+([IVXivx1-8]+)\s*\[",
        r"Sem(?:ester)?\s+([IVXivx]+)",
        r"([IVXivx]+)\s+Sem(?:ester)?",
        r"Semester\s+(\d+)",
    ):
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            v = m.group(1).upper()
            if v in roman:
                return roman[v]
            if v.isdigit():
                return int(v)
    return 0


# ---------------------------------------------------------------------------
# Helper: OCR first page of a PDF (for extract_student_info)
# ---------------------------------------------------------------------------

def _ocr_first_page_text(file_path: str) -> str:
    with tempfile.TemporaryDirectory() as tmpdir:
        pages = _render_pdf_pages(file_path, tmpdir, dpi=200)
        if not pages:
            return ""
        try:
            import cv2
            import pytesseract
            from PIL import Image
            img  = cv2.imread(str(pages[0]))
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            _, t = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
            return pytesseract.image_to_string(Image.fromarray(t), config="--psm 6 --oem 3")
        except Exception as e:
            logger.warning("First-page OCR failed: %s", e)
            return ""


# ---------------------------------------------------------------------------
# Step 3 -- Groq Vision Fallback (only if steps 1+2 both failed)
# ---------------------------------------------------------------------------

def _groq_vision_fallback(file_path: str, doc_type: str) -> list[dict]:
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        logger.warning("GROQ_API_KEY not set -- vision fallback unavailable")
        return []

    try:
        import base64
        import requests
    except ImportError:
        return []

    images_b64: list[str] = []
    ext = Path(file_path).suffix.lower()

    if ext == ".pdf":
        with tempfile.TemporaryDirectory() as tmpdir:
            for p in _render_pdf_pages(file_path, tmpdir, dpi=200)[:2]:
                with open(p, "rb") as f:
                    images_b64.append(base64.b64encode(f.read()).decode())
    else:
        with open(file_path, "rb") as f:
            images_b64.append(base64.b64encode(f.read()).decode())

    if not images_b64:
        return []

    detected = _detect_doc_type("", doc_type)
    if detected == "attendance":
        prompt = (
            "This is a college attendance sheet. Extract every student row as a JSON array. "
            "Each element: {roll_no, name, total, out_of, avg_percent}. "
            "Return ONLY a valid JSON array. No explanation."
        )
    else:
        prompt = (
            "This is a Mumbai University Grade Card. "
            "Extract marks from the Total column (Max and Obt) for every subject row, "
            "including Theory (Th) and Term Work (TW) rows separately. "
            "Return a JSON array: [{subject, score, max_score, semester}]. "
            "Return ONLY a valid JSON array. No explanation."
        )

    content: list[dict] = [
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
        for b64 in images_b64
    ]
    content.append({"type": "text", "text": prompt})

    for model in (
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "llama-3.2-90b-vision-preview",
        "llama-3.2-11b-vision-preview",
    ):
        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type":  "application/json",
                },
                json={
                    "model":    model,
                    "messages": [{"role": "user", "content": content}],
                    "max_tokens": 2048,
                },
                timeout=30,
            )
            if resp.status_code != 200:
                logger.warning("Groq %s returned %d", model, resp.status_code)
                continue

            raw  = resp.json()["choices"][0]["message"]["content"]
            raw  = re.sub(r"```(?:json)?|```", "", raw).strip()
            data = json.loads(raw)
            if isinstance(data, list) and data:
                logger.info("Groq vision (%s): %d rows", model, len(data))
                return data
        except Exception as e:
            logger.warning("Groq %s failed: %s", model, e)

    logger.error("All Groq vision models failed")
    return []


# ---------------------------------------------------------------------------
# CLI test entry-point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    if len(sys.argv) < 2:
        print("Usage: python ocr_extractor.py <pdf_or_image> [doc_type]")
        sys.exit(1)

    fp    = sys.argv[1]
    dtype = sys.argv[2] if len(sys.argv) > 2 else "auto"

    print(f"\n{'='*60}")
    print(f"  File:    {fp}")
    print(f"  Type:    {dtype}")
    print(f"{'='*60}\n")

    if fp.endswith(".pdf"):
        info = extract_student_info(fp)
        if info:
            print("Document / Student Info:")
            for k, v in info.items():
                print(f"  {k:15s}: {v}")
            print()

    rows = extract_marks(fp, dtype)
    print(f"Extracted {len(rows)} row(s):\n")
    for r in rows:
        if "subject" in r:
            print(f"  Sem {r.get('semester', 0)}  "
                  f"{r['subject']:<50s}  {r['score']:3d}/{r['max_score']}")
        else:
            print(f"  Roll {r.get('roll_no','?'):4s}  "
                  f"{r.get('name','?'):<40s}  "
                  f"{r.get('total','?')}/{r.get('out_of','?')}  "
                  f"avg={r.get('avg_percent','?')}%")