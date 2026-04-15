"""Database engine and session setup. SQLite via SQLAlchemy."""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool

DATABASE_URL = os.environ.get("CHESSQUIZ_DB_URL", "sqlite:///./chessquiz.db")

_connect_args = {"check_same_thread": False}
_extra = {}
if DATABASE_URL == "sqlite:///:memory:":
    _extra["poolclass"] = StaticPool

engine = create_engine(DATABASE_URL, connect_args=_connect_args, **_extra)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and closes it after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
