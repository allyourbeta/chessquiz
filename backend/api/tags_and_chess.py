"""Tag and chess analysis API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.api.schemas import BoardInfoOut, TagOut, UciToSanRequest, UciToSanOut
from backend.database import get_db
from backend.models import Position, Tag
from backend.services import get_board_info, search_by_pawn_structure, uci_to_san, validate_fen

tags_router = APIRouter(prefix="/tags", tags=["tags"])
chess_router = APIRouter(prefix="/chess", tags=["chess"])


# --- Tags ---
@tags_router.get("/", response_model=list[TagOut])
def list_tags(db: Session = Depends(get_db)):
    """List all tags."""
    return db.query(Tag).order_by(Tag.name).all()


@tags_router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    """Delete a tag (removes it from all positions too)."""
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()


# --- Chess Analysis ---
@chess_router.post("/validate")
def validate_fen_endpoint(fen: str):
    """Validate a FEN string."""
    is_valid, error = validate_fen(fen)
    return {"valid": is_valid, "error": error if not is_valid else None}


@chess_router.post("/board-info", response_model=BoardInfoOut)
def board_info_endpoint(fen: str):
    """Get detailed board info for a FEN."""
    is_valid, error = validate_fen(fen)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {error}")
    return get_board_info(fen)


@chess_router.get("/search-pawn-structure")
def search_pawn_structure_endpoint(
    fen: str,
    tolerance: int = Query(default=1, ge=0, le=8),
    db: Session = Depends(get_db),
):
    """Find positions with similar pawn structures."""
    is_valid, error = validate_fen(fen)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {error}")

    all_positions = db.query(Position).all()
    candidate_fens = [p.fen for p in all_positions]
    matching_fens = search_by_pawn_structure(fen, candidate_fens, tolerance)

    # Return full position data for matches
    results = []
    for p in all_positions:
        if p.fen in matching_fens:
            results.append({"id": p.id, "fen": p.fen, "title": p.title})

    return {"matches": results, "count": len(results)}


@chess_router.post("/uci-to-san", response_model=UciToSanOut)
def uci_to_san_endpoint(req: UciToSanRequest):
    """Convert UCI move sequence to human-readable SAN notation."""
    is_valid, error = validate_fen(req.fen)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {error}")
    san = uci_to_san(req.fen, req.uci_moves)
    return {"san": san}
