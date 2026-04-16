"""SQLAlchemy model for practice games (Phase 10)."""

from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from backend.database import Base


class PracticeGame(Base):
    __tablename__ = "practice_games"

    id = Column(Integer, primary_key=True, index=True)
    root_position_id = Column(
        Integer, ForeignKey("positions.id"), nullable=False, index=True
    )
    pgn_text = Column(Text, nullable=False)
    user_color = Column(String, nullable=False)  # "white" or "black"
    final_fen = Column(String, nullable=False)
    move_count = Column(Integer, nullable=False)

    engine_verdict = Column(String, nullable=True)  # "win"/"draw"/"loss"
    user_verdict = Column(String, nullable=True)    # "win"/"draw"/"loss"/"abandoned"
    final_eval = Column(Float, nullable=True)
    starting_eval = Column(Float, nullable=True)

    engine_name = Column(String, nullable=False, default="Stockfish")
    engine_level = Column(String, nullable=False)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    root_position = relationship("Position", back_populates="practice_games")
