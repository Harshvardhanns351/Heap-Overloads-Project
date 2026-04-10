from sqlmodel import SQLModel, Session
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool, StaticPool
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DEFAULT_DATABASE_URL = "sqlite:///./veloris.db"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL).strip()

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

_is_postgres = DATABASE_URL.startswith("postgresql")

if _is_postgres:
    engine = create_engine(
        DATABASE_URL,
        echo=True,
        poolclass=QueuePool,
        pool_pre_ping=True,       # detect dead Neon connections before use
        pool_recycle=300,         # recycle every 5 min (Neon suspends after 5 min idle)
        pool_size=5,
        max_overflow=10,
        connect_args={
            "connect_timeout": 10,
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5,
        },
    )
else:
    # SQLite — no pool config needed
    engine = create_engine(
        DATABASE_URL,
        echo=True,
        connect_args={"check_same_thread": False},
    )


def get_session():
    """FastAPI dependency that yields a SQLModel Session."""
    with Session(engine) as session:
        yield session


def create_db() -> None:
    """Create tables based on SQLModel metadata."""
    SQLModel.metadata.create_all(engine)
