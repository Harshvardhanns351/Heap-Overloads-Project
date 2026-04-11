b   import os
import sys
from datetime import datetime, timezone, timedelta

# Add backend directory to Python path so we can import the module correctly
sys.path.append(os.path.join(os.path.dirname(__file__), "backend", "server"))

from ai_engine.wellbeing.detector import compute_risk_score

def test_scenario(name, now, last_activity, attendance, late_night, marks_drop):
    print(f"--- Scenario: {name} ---")
    score, level, signals = compute_risk_score(
        now=now,
        last_activity_at=last_activity,
        attendance_percent=attendance,
        late_night_submissions_week=late_night,
        marks_trend_decline_percent=marks_drop
    )
    
    print(f"Risk Level: {level}")
    print(f"Risk Score: {score}/100")
    print("Triggered Signals:")
    for sig in signals:
        if sig.triggered:
            print(f" [!] [Weight: {sig.weight}] {sig.key} -> {sig.detail}")
    print("\n")

if __name__ == "__main__":
    now = datetime.now(timezone.utc)
    
    # Scenario 1: Late Night Hacker (12:30 AM submissions)
    # Active yesterday, great attendance, but 4 late night submissions.
    test_scenario(
        "Late Night Coder (Burnout Risk)",
        now=now,
        last_activity=now - timedelta(days=1),
        attendance=85.0,
        late_night=4,
        marks_drop=5.0
    )
    
    # Scenario 2: The "Ghost" (No submission or activity at all)
    # Hasn't logged in for 15 days, missing attendance.
    test_scenario(
        "Complete 'Ghosting' (No Activity)",
        now=now,
        last_activity=now - timedelta(days=15),
        attendance=60.0,
        late_night=0,
        marks_drop=None
    )
    
    # Scenario 3: The Downward Spiral 
    # Marks dropping, skipping class, pulling all-nighters
    test_scenario(
        "Downward Spiral (Critical Alert)",
        now=now,
        last_activity=now - timedelta(days=4),
        attendance=65.0,
        late_night=5,
        marks_drop=25.0
    )
    
    # Scenario 4: The Perfect Student
    test_scenario(
        "Healthy Student",
        now=now,
        last_activity=now - timedelta(hours=2),
        attendance=95.0,
        late_night=0,
        marks_drop=0.0
    )
    # Scenario 5: The Hard Worker (Trying but Failing)
    # Perfect attendance, highly active, but OCR shows grades tanked by 20%
    test_scenario(
        "Hard Worker (Grades Dropping)",
        now=now,
        last_activity=now - timedelta(hours=5),
        attendance=90.0,
        late_night=1,
        marks_drop=20.0
    )
    
    # Scenario 6: The Chronic Skipper
    # Great grades, highly active, but never shows up to physical class
    test_scenario(
        "The Chronic Skipper",
        now=now,
        last_activity=now - timedelta(days=1),
        attendance=45.0,
        late_night=0,
        marks_drop=0.0
    )
    
    # Scenario 7: The Minor Slump
    # Missed a few days of app access, grades dropped slightly just over threshold
    test_scenario(
        "The Minor Slump",
        now=now,
        last_activity=now - timedelta(days=4),
        attendance=80.0,
        late_night=0,
        marks_drop=16.0
    )
    
    print("Testing Complete!")
