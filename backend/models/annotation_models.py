"""FEN annotation model — global position notes keyed by normalized FEN."""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, Text

from backend.database import Base


class FenAnnotation(Base):
    __tablename__ = "fen_annotations"

    id = Column(Integer, primary_key=True, index=True)
    fen_key = Column(String, unique=True, nullable=False, index=True)
    note_text = Column(Text, nullable=False, default='')
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
