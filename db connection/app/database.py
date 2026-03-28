from sqlmodel import SQLModel, create_engine, Session
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("postgresql://heap_overloads_db_user:J7aiER1WyZTpD84suppVnfMApLxUdNLt@dpg-d735efq4d50c73fhl540-a.ohio-postgres.render.com/heap_overloads_db")

engine = create_engine(
    DATABASE_URL,
    echo=True  # logs SQL queries (good for dev)
)

def get_session():
    with Session(engine) as session:
        yield session