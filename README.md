# Veloris

Adaptive learning platform for engineering college students with wellbeing monitoring.

## Philosophy: wellbeing by inference (not self-reporting)
Veloris **never asks students how they feel**. It watches observable behavior and infers:
- Late submissions at 2am, repeatedly
- No activity for multiple days after a bad score
- Attendance dropping while scores hold steady

Risk levels are stored for teachers/admins, but **students never see risk labels**.
Students see a warm, human NudgeCard instead.

## Quick Start

### Development Setup

**Backend:**
```bash
cd backend/server
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database URL and API keys
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd front_end
npm install
npm run dev
```

### Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive production deployment guide.

Quick checklist:
1. Generate secure `SECRET_KEY` in backend `.env`
2. Configure PostgreSQL database
3. Set production `ALLOWED_ORIGINS` and `FRONTEND_URL`
4. Update frontend `VITE_API_BASE_URL` in `.env.production`
5. Run database migrations: `alembic upgrade head`
6. Deploy backend (Railway, Render, etc.)
7. Deploy frontend (Vercel, Netlify, etc.)

See [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md) for detailed checklist.

## Backend (FastAPI + SQLModel)
Location: `backend/server/`

### Run locally
```bash
cd backend/server
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
uvicorn app.main:app --reload --port 8000
```

### Key endpoints
- `GET /api/health` - Health check
- Auth:
  - `POST /api/auth/login` - User login
  - `GET /api/auth/me` - Get current user
  - `POST /api/auth/seed-demo` - Create demo users
- Academics OCR:
  - `POST /api/academics/upload-doc` - Upload document for OCR
  - `POST /api/academics/confirm-ocr` - Confirm OCR results
- Roadmap:
  - `GET /api/roadmap/me` - Get student roadmap
  - `POST /api/roadmap/generate` - Generate new roadmap
  - `PATCH /api/roadmap/nodes/{id}/progress` - Update node progress
  - `POST /api/roadmap/nodes/{id}/regenerate-resources` - Regenerate resources
- Mentor:
  - `POST /api/mentor/chat` - Chat with AI mentor
- Assignments:
  - `GET /api/assignments` - List assignments
  - `POST /api/assignments` - Create assignment
  - `GET /api/assignments/{id}/submissions` - Get submissions
- Monitoring:
  - `POST /api/monitoring/events` - Log monitoring event
- Coding Profiles:
  - `GET /api/coding/me` - Get coding profiles
  - `GET /api/coding/leaderboard` - Get leaderboard
- And many more... (see `/docs` in development mode)

## Frontend (React + Vite)
Location: `front_end/`

### Run locally
```bash
cd front_end
npm install
npm run dev
```

### Build for production
```bash
npm run build
# Output in dist/ folder
```

## Features

- **Adaptive Roadmaps**: AI-generated learning paths based on student goals
- **Wellbeing Monitoring**: Passive monitoring of student behavior patterns
- **Smart Assignments**: Assignment management with submission tracking
- **Coding Profiles**: Integration with LeetCode, GitHub, Codeforces, CodeChef
- **AI Mentor**: Contextual mentoring based on student performance
- **Attendance Tracking**: Bulk upload and defaulter detection
- **Dispute Management**: Student grievance system
- **Analytics Dashboard**: Performance insights and trends
- **Peer Notes**: Collaborative learning with moderation
- **Exam Preparation**: AI-powered revision plans

## Tech Stack

**Backend:**
- FastAPI (Python web framework)
- SQLModel (ORM with Pydantic integration)
- PostgreSQL (production database)
- Alembic (database migrations)
- JWT authentication
- APScheduler (background tasks)

**Frontend:**
- React 18
- Vite (build tool)
- React Router (routing)
- Recharts (data visualization)
- Lucide React (icons)

**AI/ML:**
- Groq API (LLM inference)
- Custom wellbeing scoring algorithms
- OCR with pdf2image and pytesseract

## Environment Variables

### Backend (`backend/server/.env`)
```bash
DATABASE_URL=postgresql://...
ENVIRONMENT=production
SECRET_KEY=<generate-secure-key>
ALLOWED_ORIGINS=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
GROQ_API_KEY=<your-key>
YOUTUBE_API_KEY=<optional>
GITHUB_TOKEN=<optional>
```

### Frontend (`front_end/.env.production`)
```bash
VITE_API_BASE_URL=https://your-backend.com/api
VITE_ENVIRONMENT=production
```

## Database Migrations

```bash
cd backend/server
# Create new migration
alembic revision --autogenerate -m "description"
# Apply migrations
alembic upgrade head
# Rollback
alembic downgrade -1
```

## Demo Users

After seeding (POST `/api/auth/seed-demo`):
- Student: `rahul@college.edu` / `password`
- Teacher: `priya@college.edu` / `password`
- Admin: `admin@college.edu` / `password`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions, please open an issue on GitHub.

