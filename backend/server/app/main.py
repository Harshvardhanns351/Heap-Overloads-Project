"""
Veloris backend entrypoint.

Key ideas:
- DB connection comes from `DATABASE_URL` env var (see `app/database.py`)
- Monitoring events are fire-and-forget (no auth) and power the wellbeing engine
- Students never see risk labels; teachers receive factual alerts
"""

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Import settings
from app.config import settings

# Initialize logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize scheduler
scheduler = AsyncIOScheduler()

from app.database import engine, create_db
from app.api.routers.users import router as users_router
from app.api.routers.marks import router as marks_router
from app.api.routers.risk_scores import router as risk_scores_router
from app.api.routers.monitoring import router as monitoring_router
from app.api.routers.documents import router as academics_router
from app.api.routers.roadmap import router as roadmap_router
from app.api.routers.mentor import router as mentor_router
from app.api.routers.assignments import router as assignments_router
from app.api.routers.coding import router as coding_router
from app.api.routers.disputes import router as disputes_router
from app.api.routers.attendance import router as attendance_router
from app.api.routers.alerts import router as alerts_router
from app.api.routers.analytics import router as analytics_router
from app.api.routers.sprints import router as sprints_router
from app.api.routers.exams import router as exams_router
from app.api.routers.peer_notes import router as peer_notes_router
from app.api.routers.digest import router as digest_router
from app.api.routers.profile import router as profile_router
from app.auth.router import router as auth_router
from app.api.routers.google_auth import router as google_auth_router
from app.scheduler import run_wellbeing_check


from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Hackathon-friendly: create tables on startup.
    # For production: generate and apply Alembic migrations instead.
    try:
        create_db()
        logger.info("Database tables verified/created.")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        # We continue so the app doesn't crash if DB is temporarily down,
        # but you might want to exit depending on requirements.

    # Schedule nightly wellbeing check at midnight
    scheduler.add_job(run_wellbeing_check, "cron", hour=0, minute=0)
    scheduler.start()
    logger.info("Scheduler started with nightly wellbeing check")
    
    yield
    
    # Shutdown
    scheduler.shutdown()
    logger.info("Scheduler shut down")

# Initialize FastAPI app
app = FastAPI(
    title="Veloris API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.IS_PRODUCTION else None,  # Disable docs in production
    redoc_url="/redoc" if not settings.IS_PRODUCTION else None,
)

logger.info(f"Environment: {settings.ENVIRONMENT}")
logger.info(f"Allowed CORS origins: {settings.ALLOWED_ORIGINS}")

# CORS Middleware - Must be added before other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
    max_age=600,  # Cache preflight requests for 10 minutes
)

# GZip compression for responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Trusted host middleware for production
if settings.IS_PRODUCTION:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.TRUSTED_HOSTS)

# Serve uploaded files (documents/submissions) from disk.
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/api/health")
def health():
    """Health check endpoint for monitoring and load balancers."""
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }



app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(marks_router, prefix="/api/marks", tags=["marks"])
app.include_router(risk_scores_router, prefix="/api/risk-scores", tags=["risk-scores"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(monitoring_router, prefix="/api/monitoring", tags=["monitoring"])
app.include_router(academics_router, prefix="/api/academics", tags=["academics"])
app.include_router(roadmap_router, prefix="/api/roadmap", tags=["roadmap"])
app.include_router(mentor_router, prefix="/api/mentor", tags=["mentor"])
app.include_router(assignments_router, prefix="/api/assignments", tags=["assignments"])
app.include_router(coding_router, prefix="/api/coding", tags=["coding"])
app.include_router(disputes_router, prefix="/api/disputes", tags=["disputes"])
app.include_router(attendance_router, prefix="/api/attendance", tags=["attendance"])
app.include_router(alerts_router, prefix="/api/alerts", tags=["alerts"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["analytics"])
app.include_router(sprints_router, prefix="/api/sprints", tags=["sprints"])
app.include_router(exams_router, prefix="/api/exams", tags=["exams"])
app.include_router(peer_notes_router, prefix="/api/peer-notes", tags=["peer-notes"])
app.include_router(digest_router, prefix="/api/digest", tags=["digest"])
app.include_router(profile_router, prefix="/api/profile", tags=["profile"])
app.include_router(google_auth_router, prefix="/api/auth/google", tags=["auth"])


if __name__ == "__main__":
    # Enables: python app/main.py (not required for Uvicorn).
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
