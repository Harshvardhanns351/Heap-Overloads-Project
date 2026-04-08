# Veloris (Heap-Overloads-Project)
Adaptive learning + student wellbeing platform.

## Philosophy: wellbeing by inference (not self-reporting)
Veloris **never asks students how they feel**. It watches observable behavior and infers:
- Late submissions at 2am, repeatedly
- No activity for multiple days after a bad score
- Attendance dropping while scores hold steady

Risk levels are stored for teachers/admins, but **students never see risk labels**.
Students see a warm, human NudgeCard instead.

## Backend (FastAPI + SQLModel)
Location: `backend/db connection/`

### Run locally
- Set `DATABASE_URL` (Postgres) or leave unset to use local sqlite fallback
- Install deps:

```bash
pip install -r "backend/db connection/requirements.txt"
```

```bash
uvicorn app.main:app --reload --port 8000
```

### Key endpoints (current)
- `GET /api/health`
- Auth:
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- Academics OCR loop:
  - `POST /api/academics/upload-doc`
  - `POST /api/academics/confirm-ocr`
- Roadmap:
  - `GET /api/roadmap/me`
  - `PATCH /api/roadmap/nodes/{id}`
  - `POST /api/roadmap/regenerate`
- Mentor:
  - `POST /api/mentor/chat`
- Assignments:
  - `POST /api/assignments`
  - `GET /api/assignments`
  - `POST /api/assignments/{id}/submit`
  - `GET /api/assignments/{id}/submissions`
- Monitoring events:
  - `POST /api/monitoring/events`

