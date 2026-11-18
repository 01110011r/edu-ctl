from pathlib import Path
from typing import Generator
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine

# Database file placed in backend directory
BASE_DIR = Path(__file__).resolve().parent.parent
DB_FILE = BASE_DIR / "database.db"
DATABASE_URL = f"sqlite:///{DB_FILE}"

# SQLite requires check_same_thread=False for FastAPI multi-threaded requests
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)


# Enable foreign key enforcement for SQLite
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def create_db_and_tables() -> None:
    """Create all database tables defined in SQLModel metadata."""
    # Ensure all models are imported before creating tables
    import app.models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""
    with Session(engine) as session:
        yield session
