from sqlmodel import SQLModel, create_engine, Session
import os
import warnings
from dotenv import load_dotenv

load_dotenv()

# Use `DATABASE_URL` from environment for all DB connectivity.
# For safety, do NOT commit real credentials; default to local sqlite for dev.
DEFAULT_DATABASE_URL = "sqlite:///./veloris.db"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)

if "DATABASE_URL" not in os.environ:
    warnings.warn(
        "DATABASE_URL env var not set; using local sqlite fallback. "
        "Set DATABASE_URL to your Postgres connection string.",
        RuntimeWarning,
    )

engine = create_engine(
    DATABASE_URL,
    echo=True,  # logs SQL queries (good for dev)
)


def get_session():
    """FastAPI dependency that yields a SQLModel Session."""
    with Session(engine) as session:
        yield session


def create_db() -> None:
    """Create tables based on SQLModel metadata."""
    SQLModel.metadata.create_all(engine)
