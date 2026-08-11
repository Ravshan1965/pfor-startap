"""
PFOR Database — SQLite Initialization
Creates the engine, session factory, and declarative Base.
Tables are created automatically on first startup.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from pfor.core.config import get_settings

settings = get_settings()

# SQLite engine with thread-safe check_same_thread=False for FastAPI
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=False,
)

# Session factory — used as a FastAPI dependency
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""

    pass


def get_db():
    """
    FastAPI dependency: yield a database session and close it on teardown.

    Usage in route:
        db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all database tables if they do not already exist."""
    # Import models so SQLAlchemy registers them on the metadata before create_all
    import pfor.db.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
