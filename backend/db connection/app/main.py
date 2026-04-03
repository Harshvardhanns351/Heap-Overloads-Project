from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine, create_db
from app.api.routers.users import router as users_router
from app.api.routers.marks import router as marks_router
from app.api.routers.risk_scores import router as risk_scores_router
from app.api.routers.monitoring import router as monitoring_router
from app.api.routers.documents import router as academics_router
from app.api.routers.roadmap import router as roadmap_router
from app.api.routers.mentor import router as mentor_router
from app.api.routers.assignments import router as assignments_router
from app.auth.router import router as auth_router


app = FastAPI(title="Heap Overloads API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://edupulse.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploads folder
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
def _startup() -> None:
    # Create tables automatically based on SQLModel metadata.
    # In production you should use Alembic migrations instead.
    create_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(marks_router, prefix="/api/marks", tags=["marks"])
app.include_router(risk_scores_router, prefix="/api/risk-scores", tags=["risk-scores"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(monitoring_router, prefix="/api/monitoring", tags=["monitoring"])
app.include_router(academics_router, prefix="/api/academics", tags=["academics"])
app.include_router(roadmap_router, prefix="/api/roadmap", tags=["roadmap"])
app.include_router(mentor_router, prefix="/api/mentor", tags=["mentor"])
app.include_router(assignments_router, prefix="/api/assignments", tags=["assignments"])


if __name__ == "__main__":
    # Enables: python app/main.py (not required for Uvicorn).
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)