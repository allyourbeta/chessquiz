"""Database engine and session setup. SQLite via SQLAlchemy."""

import os

from sqlalchemy import create_engine, inspect, text
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


def run_lightweight_migrations():
    """Apply additive column migrations for SQLite. Safe to run at startup."""
    insp = inspect(engine)
    
    # Check if tables exist before trying to migrate
    table_names = insp.get_table_names()
    
    # Migrate games table
    if "games" in table_names:
        cols = {c["name"] for c in insp.get_columns("games")}
        with engine.begin() as conn:
            if "white_elo" not in cols:
                conn.execute(text("ALTER TABLE games ADD COLUMN white_elo INTEGER"))
            if "black_elo" not in cols:
                conn.execute(text("ALTER TABLE games ADD COLUMN black_elo INTEGER"))
    
    # Migrate positions table for Phase 15
    if "positions" in table_names:
        cols = {c["name"] for c in insp.get_columns("positions")}
        with engine.begin() as conn:
            if "position_type" not in cols:
                # Default all existing positions to 'tabiya'
                conn.execute(text("ALTER TABLE positions ADD COLUMN position_type VARCHAR DEFAULT 'tabiya' NOT NULL"))
            if "solution_san" not in cols:
                conn.execute(text("ALTER TABLE positions ADD COLUMN solution_san VARCHAR"))
            if "theme" not in cols:
                conn.execute(text("ALTER TABLE positions ADD COLUMN theme VARCHAR"))


def get_db():
    """FastAPI dependency that yields a DB session and closes it after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
