"""
Standalone test for the wellbeing detector + nudge card / risk scoring pipeline.
Uses mock data only — no database required.
Run from backend/server/:  python test_wellbeing.py
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass
from typing import Optional, List

# ── make sure the local packages are importable ──────────────────────────────
sys.path.insert(0, ".")

from ai_engine.wellbeing.detector import compute_risk_score, Signal

# ─────────────────────────────────────────────────────────────────────────────
# ANSI colours for a readable terminal output
# ─────────────────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

LEVEL_COLOUR = {"GREEN": GREEN, "YELLOW": YELLOW, "RED": RED}


def colour_level(level: str) -> str:
    c = LEVEL_COLOUR.get(level, "")
    return f"{BOLD}{c}{level}{RESET}"


# ─────────────────────────────────────────────────────────────────────────────
# Mock student profiles
# ─────────────────────────────────────────────────────────────────────────────
NOW = datetime.now(timezone.utc)

@dataclass
class MockStudent:
    name: str
    last_activity_at: Optional[datetime]
    attendance_percent: Optional[float]
    late_night_submissions_week: int
    marks_trend_decline_percent: Optional[float]
    expected_level: str          # what we expect the algorithm to return


MOCK_STUDENTS: List[MockStudent] = [
    MockStudent(
        name="Alice (Healthy)",
        last_activity_at=NOW - timedelta(hours=6),   # active today
        attendance_percent=92.0,
        late_night_submissions_week=0,
        marks_trend_decline_percent=5.0,             # slight dip, not alarming
        expected_level="GREEN",
    ),
    MockStudent(
        name="Bob (Borderline)",
        last_activity_at=NOW - timedelta(days=4),    # 4 days inactive → triggers
        attendance_percent=78.0,
        late_night_submissions_week=2,
        marks_trend_decline_percent=10.0,
        expected_level="YELLOW",
    ),
    MockStudent(
        name="Carol (At-Risk)",
        last_activity_at=NOW - timedelta(days=7),    # week of silence
        attendance_percent=60.0,                     # below 75 % threshold
        late_night_submissions_week=4,               # ≥3 → triggers
        marks_trend_decline_percent=25.0,            # >15 % decline → triggers
        expected_level="RED",
    ),
    MockStudent(
        name="Dave (No Activity Record)",
        last_activity_at=None,                       # never logged in
        attendance_percent=None,
        late_night_submissions_week=0,
        marks_trend_decline_percent=None,
        expected_level="YELLOW",                     # 30 pts from missing activity
    ),
    MockStudent(
        name="Eve (Night Owl Only)",
        last_activity_at=NOW - timedelta(hours=2),
        attendance_percent=85.0,
        late_night_submissions_week=5,               # lots of late nights
        marks_trend_decline_percent=8.0,
        expected_level="GREEN",                      # only low-weight signal fires
    ),
]


# ─────────────────────────────────────────────────────────────────────────────
# Nudge card generator  (mirrors what the frontend NudgeCard component shows)
# ─────────────────────────────────────────────────────────────────────────────
NUDGE_MESSAGES = {
    "days_since_activity": "You haven't been active for a while — even a small check-in helps!",
    "attendance":          "Your attendance is below 75 %. Try not to miss upcoming sessions.",
    "marks_trend":         "Your recent marks show a downward trend. Want to review some material?",
    "late_night_submissions": "Several late-night submissions detected. Make sure you're getting enough rest.",
}


def build_nudge_card(level: str, signals: List[Signal]) -> Optional[str]:
    """Return a nudge message string if the student needs one, else None."""
    if level == "GREEN":
        return None
    triggered = [s for s in signals if s.triggered]
    if not triggered:
        return None
    # Pick the highest-weight triggered signal
    order = {"high": 0, "medium": 1, "low": 2}
    top = sorted(triggered, key=lambda s: order.get(s.weight, 9))[0]
    return NUDGE_MESSAGES.get(top.key, "Keep an eye on your progress!")


# ─────────────────────────────────────────────────────────────────────────────
# Test runner
# ─────────────────────────────────────────────────────────────────────────────
def run_tests():
    print(f"\n{BOLD}{CYAN}{'='*65}{RESET}")
    print(f"{BOLD}{CYAN}  EduPulse — Wellbeing Detector & Nudge Card Test Suite{RESET}")
    print(f"{BOLD}{CYAN}{'='*65}{RESET}\n")

    passed = 0
    failed = 0

    for student in MOCK_STUDENTS:
        score, level, signals = compute_risk_score(
            now=NOW,
            last_activity_at=student.last_activity_at,
            attendance_percent=student.attendance_percent,
            late_night_submissions_week=student.late_night_submissions_week,
            marks_trend_decline_percent=student.marks_trend_decline_percent,
        )

        nudge = build_nudge_card(level, signals)
        ok = level == student.expected_level
        status = f"{GREEN}PASS{RESET}" if ok else f"{RED}FAIL{RESET}"
        if ok:
            passed += 1
        else:
            failed += 1

        print(f"  Student : {BOLD}{student.name}{RESET}")
        print(f"  Score   : {score}/100")
        print(f"  Level   : {colour_level(level)}  (expected {colour_level(student.expected_level)})  [{status}]")

        print(f"  Signals :")
        for sig in signals:
            tick = f"{GREEN}✓{RESET}" if sig.triggered else f"  "
            print(f"    {tick} [{sig.weight:6s}] {sig.key:30s} → {sig.detail}")

        if nudge:
            print(f"  {BOLD}Nudge Card{RESET}: \"{nudge}\"")
        else:
            print(f"  Nudge Card: (none — student is GREEN)")

        print()

    # ── Summary ──────────────────────────────────────────────────────────────
    print(f"{BOLD}{CYAN}{'='*65}{RESET}")
    total = passed + failed
    result_colour = GREEN if failed == 0 else RED
    print(f"  Results: {result_colour}{BOLD}{passed}/{total} passed{RESET}")

    if failed:
        print(f"  {RED}{BOLD}{failed} test(s) failed — check expected_level values above.{RESET}")
    else:
        print(f"  {GREEN}{BOLD}All tests passed ✓{RESET}")

    print(f"{BOLD}{CYAN}{'='*65}{RESET}\n")

    # ── Threshold boundary demo ───────────────────────────────────────────────
    print(f"{BOLD}Boundary / threshold demo:{RESET}")
    boundaries = [
        ("Attendance exactly 75 %",  None, 75.0, 0, None),
        ("Attendance 74 % (triggers)", None, 74.0, 0, None),
        ("Marks decline exactly 15 %", NOW - timedelta(hours=1), 90.0, 0, 15.0),
        ("Marks decline 16 % (triggers)", NOW - timedelta(hours=1), 90.0, 0, 16.0),
        ("3 late nights (triggers)",  NOW - timedelta(hours=1), 90.0, 3, None),
        ("2 late nights (no trigger)", NOW - timedelta(hours=1), 90.0, 2, None),
    ]
    for label, last_act, att, late, trend in boundaries:
        s, lv, _ = compute_risk_score(NOW, last_act, att, late, trend)
        print(f"  {label:45s} → score={s:3d}  level={colour_level(lv)}")

    print()
    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
