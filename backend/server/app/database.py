from sqlmodel import SQLModel, create_engine, Session
import os
import warnings
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Use `DATABASE_URL` from environment for all DB connectivity.
# For safety, do NOT commit real credentials; default to local sqlite for dev.
DEFAULT_DATABASE_URL = "sqlite:///./veloris.db"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL).strip()

# Neon/Postgres often works better with the explicit driver name
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(
    DATABASE_URL,
    echo=True,
    # Standard pool config for Neon
    pool_pre_ping=True,
)


def get_session():
    """FastAPI dependency that yields a SQLModel Session."""
    with Session(engine) as session:
        yield session


def create_db() -> None:
    """Create tables based on SQLModel metadata."""
    SQLModel.metadata.create_all(engine)
