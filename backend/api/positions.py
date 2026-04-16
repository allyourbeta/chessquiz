"""Position API routes. All DB calls for positions happen here."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from backend.api.schemas import PositionBrief, PositionCreate, PositionOut, PositionUpdate
from backend.database import get_db
from backend.models import Position, Tag
from backend.services import validate_fen

router = APIRouter(prefix="/positions", tags=["positions"])


def _get_or_create_tags(db: Session, tag_names: list[str]) -> list[Tag]:
    """Get existing tags or create new ones."""
    tags = []
    for name in tag_names:
        name = name.strip().lower().lstrip("#")
        if not name:
            continue
        tag = db.query(Tag).filter(Tag.name == name).first()
        if not tag:
            tag = Tag(name=name)
            db.add(tag)
            db.flush()
        tags.append(tag)
    return tags


@router.post("/", response_model=PositionOut, status_code=201)
def create_position(data: PositionCreate, db: Session = Depends(get_db)):
    """Create a new position. Validates FEN via python-chess."""
    is_valid, error = validate_fen(data.fen)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {error}")

    tags = _get_or_create_tags(db, data.tags)
    position = Position(
        fen=data.fen,
        title=data.title,
        notes=data.notes,
        stockfish_analysis=data.stockfish_analysis,
        tags=tags,
    )
    db.add(position)
    db.commit()
    db.refresh(position)
    return position


@router.get("/", response_model=list[PositionBrief])
def list_positions(
    tag: str | None = None,
    tags: list[str] | None = Query(default=None),
    search: str | None = None,
    db: Session = Depends(get_db),
):
    """List positions, optionally filtered by tag(s) or search text."""
    query = db.query(Position).options(joinedload(Position.tags))

    tag_names = []
    if tag:
        tag_names.append(tag)
    if tags:
        tag_names.extend(tags)
    for t in tag_names:
        name = t.strip().lower().lstrip("#")
        if not name:
            continue
        query = query.filter(Position.tags.any(Tag.name == name))

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            Position.title.ilike(pattern) | Position.notes.ilike(pattern)
        )

    return query.order_by(Position.created_at.desc()).all()


@router.get("/{position_id}", response_model=PositionOut)
def get_position(position_id: int, db: Session = Depends(get_db)):
    """Get a single position with all details."""
    position = (
        db.query(Position)
        .options(joinedload(Position.tags))
        .filter(Position.id == position_id)
        .first()
    )
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    return position


@router.put("/{position_id}", response_model=PositionOut)
def update_position(
    position_id: int, data: PositionUpdate, db: Session = Depends(get_db)
):
    """Update a position's notes, title, analysis, or tags."""
    position = db.query(Position).filter(Position.id == position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    if data.title is not None:
        position.title = data.title
    if data.notes is not None:
        position.notes = data.notes
    if data.stockfish_analysis is not None:
        position.stockfish_analysis = data.stockfish_analysis
    if data.tags is not None:
        position.tags = _get_or_create_tags(db, data.tags)

    db.commit()
    db.refresh(position)
    return position


@router.delete("/{position_id}", status_code=204)
def delete_position(position_id: int, db: Session = Depends(get_db)):
    """Delete a position."""
    position = db.query(Position).filter(Position.id == position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    db.delete(position)
    db.commit()
