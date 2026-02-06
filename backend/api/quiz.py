"""Quiz API routes. Quiz logic and attempt tracking."""

import random

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from backend.api.schemas import (
    PositionOut,
    PositionStatsOut,
    QuizAttemptCreate,
    QuizAttemptOut,
    QuizPositionOut,
)
from backend.database import get_db
from backend.models import Position, QuizAttempt, Tag

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.get("/next", response_model=QuizPositionOut)
def get_next_quiz_position(
    tags: list[str] = Query(default=[]),
    db: Session = Depends(get_db),
):
    """Get a random position for quizzing, optionally filtered by tags.

    Returns position without answer (notes/analysis hidden).
    """
    query = db.query(Position).options(joinedload(Position.tags))

    for tag_name in tags:
        clean = tag_name.strip().lower().lstrip("#")
        if clean:
            query = query.filter(Position.tags.any(Tag.name == clean))

    positions = query.all()
    if not positions:
        raise HTTPException(
            status_code=404,
            detail="No positions found matching the selected tags.",
        )

    chosen = random.choice(positions)
    return chosen


@router.get("/reveal/{position_id}", response_model=PositionOut)
def reveal_answer(position_id: int, db: Session = Depends(get_db)):
    """Reveal the full answer (notes + analysis) for a quiz position."""
    position = (
        db.query(Position)
        .options(joinedload(Position.tags))
        .filter(Position.id == position_id)
        .first()
    )
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    return position


@router.post("/attempt", response_model=QuizAttemptOut, status_code=201)
def record_attempt(data: QuizAttemptCreate, db: Session = Depends(get_db)):
    """Record whether the user got a quiz question right or wrong."""
    position = db.query(Position).filter(Position.id == data.position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    attempt = QuizAttempt(position_id=data.position_id, correct=data.correct)
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


@router.get("/stats/{position_id}", response_model=PositionStatsOut)
def get_position_stats(position_id: int, db: Session = Depends(get_db)):
    """Get quiz stats for a specific position."""
    position = db.query(Position).filter(Position.id == position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.position_id == position_id)
        .all()
    )
    total = len(attempts)
    correct = sum(1 for a in attempts if a.correct)

    return PositionStatsOut(
        position_id=position_id,
        total_attempts=total,
        correct_count=correct,
        incorrect_count=total - correct,
        accuracy=correct / total if total > 0 else 0.0,
    )


@router.get("/history", response_model=list[QuizAttemptOut])
def get_quiz_history(
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
):
    """Get recent quiz attempts."""
    return (
        db.query(QuizAttempt)
        .order_by(QuizAttempt.created_at.desc())
        .limit(limit)
        .all()
    )
