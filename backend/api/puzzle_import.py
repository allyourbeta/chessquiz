"""Import PGN chapters as puzzle positions."""

import io
import json
import re
from typing import Iterator, Optional
import chess
import chess.pgn
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Position, PositionType, Tag
from backend.services import compute_zobrist

router = APIRouter()


class ImportPuzzlesRequest(BaseModel):
    pgn_text: Optional[str] = None  # Direct PGN text
    session_token: Optional[str] = None  # Or use cached PGN via token
    lichess_username: Optional[str] = None  # For re-fetching if needed
    lichess_api_token: Optional[str] = None  # For re-fetching if needed


def slugify(text: str) -> str:
    """Convert text to a clean hyphenated tag."""
    s = text.lower().strip()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s).strip("-")
    return s


def extract_puzzle_from_chapter(pgn_text: str) -> dict | None:
    """Extract puzzle data from a single PGN chapter.
    
    Returns dict with:
    - starting_fen: The position before the first move
    - solution_san: The first move in SAN notation
    - chapter_name: The Event or ChapterName header
    - study_name: Extracted from Event if possible
    - zobrist_hash: Hash of the starting position
    
    Returns None if chapter has no moves.
    """
    try:
        game = chess.pgn.read_game(io.StringIO(pgn_text))
        if game is None:
            return None
            
        # Get headers
        headers = dict(game.headers)
        
        # Extract chapter and study name
        event = headers.get("Event", "")
        chapter_name = headers.get("ChapterName", event)
        
        # Try to parse study name from Event (format: "Study Name: Chapter Name" or "Study Name - Chapter Name")
        study_name = event
        if ":" in event:
            study_name = event.split(":")[0].strip()
        elif " - " in event:
            parts = event.split(" - ")
            if len(parts) > 1:
                # Heuristic: if first part looks like a study name, use it
                study_name = parts[0].strip()
        
        # Get starting FEN (use header FEN if present, otherwise standard start)
        starting_fen = headers.get("FEN", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
        
        # Get first move
        first_node = game.next()
        if first_node is None or first_node.move is None:
            # No moves in this chapter
            return None
            
        # Create board at starting position to convert move to SAN
        board = chess.Board(starting_fen)
        solution_san = board.san(first_node.move)
        
        # Compute zobrist hash for duplicate detection
        zobrist_hash = compute_zobrist(starting_fen)
        
        return {
            "starting_fen": starting_fen,
            "solution_san": solution_san,
            "chapter_name": chapter_name,
            "study_name": study_name,
            "zobrist_hash": zobrist_hash,
            "headers": headers
        }
        
    except Exception as e:
        print(f"Error parsing chapter: {e}")
        return None


def import_puzzles_from_pgn(
    db: Session,
    pgn_text: str,
    emit: callable = None
) -> dict:
    """Import PGN chapters as puzzle positions.
    
    ROOT CAUSE of "UNIQUE constraint failed: position_tags.position_id, position_tags.tag_id":
    When multiple chapters from the same study are imported, they all try to use the same tag.
    If the tag already exists in the database and is already attached to another position,
    SQLAlchemy's relationship handling can cause duplicate inserts into the position_tags table.
    
    FIX: 
    1. Use savepoints for each puzzle so one failure doesn't rollback all
    2. Check if tag association already exists before adding
    3. Properly handle existing tags without re-adding them
    
    Returns summary dict with counts and lists of created/skipped puzzles.
    """
    # Parse all chapters
    chapters = []
    stream = io.StringIO(pgn_text)
    
    while True:
        game = chess.pgn.read_game(stream)
        if game is None:
            break
        pgn_str = str(game)
        chapters.append(pgn_str)
    
    if emit:
        emit({"type": "status", "message": f"Found {len(chapters)} chapters to process"})
    
    # Track results
    created_puzzles = []
    skipped_no_moves = []
    skipped_duplicates = []
    failed_chapters = []
    reused_positions = 0
    duplicate_tag_skips = 0
    seen_zobrist_hashes = set()
    
    # Get existing positions by zobrist hash for duplicate detection
    existing_hashes = set()
    for pos in db.query(Position).all():
        try:
            existing_hashes.add(compute_zobrist(pos.fen))
        except:
            pass  # Ignore positions with invalid FENs
    
    # Process each chapter with individual savepoints
    for i, chapter_pgn in enumerate(chapters):
        if emit:
            emit({
                "type": "progress",
                "current": i + 1,
                "total": len(chapters),
                "message": f"Processing chapter {i + 1} of {len(chapters)}"
            })
        
        # Use a savepoint for each chapter
        savepoint = db.begin_nested()
        
        try:
            puzzle_data = extract_puzzle_from_chapter(chapter_pgn)
            
            if puzzle_data is None:
                skipped_no_moves.append(f"Chapter {i + 1}")
                savepoint.rollback()
                continue
            
            # Check for duplicates
            zobrist_hash = puzzle_data["zobrist_hash"]
            if zobrist_hash in existing_hashes:
                skipped_duplicates.append(puzzle_data["chapter_name"])
                reused_positions += 1
                savepoint.rollback()
                continue
            
            if zobrist_hash in seen_zobrist_hashes:
                skipped_duplicates.append(puzzle_data["chapter_name"])
                savepoint.rollback()
                continue
            
            seen_zobrist_hashes.add(zobrist_hash)
            
            # Get or create tag for the study
            study_slug = slugify(puzzle_data["study_name"])
            tag = None
            if study_slug:
                # First check if tag exists
                tag = db.query(Tag).filter_by(name=study_slug).first()
                if not tag:
                    # Create new tag
                    tag = Tag(name=study_slug)
                    db.add(tag)
                    db.flush()
                    # Debug: Created new tag
                else:
                    # Debug: Reusing existing tag
                    pass
            
            # Create position
            position = Position(
                fen=puzzle_data["starting_fen"],
                title=puzzle_data["chapter_name"],
                notes=f"{puzzle_data['study_name']}: {puzzle_data['chapter_name']}",
                position_type=PositionType.puzzle,
                solution_san=puzzle_data["solution_san"]
            )
            
            db.add(position)
            db.flush()  # Get position.id
            
            # Add tag association if tag exists and not already associated
            if tag:
                # Check if this position already has this tag (shouldn't happen with new position, but be safe)
                existing_assoc = db.execute(
                    text("SELECT 1 FROM position_tags WHERE position_id = :pos_id AND tag_id = :tag_id"),
                    {"pos_id": position.id, "tag_id": tag.id}
                ).first()
                
                if existing_assoc:
                    # Debug: Skipping duplicate tag association
                    duplicate_tag_skips += 1
                else:
                    # Debug: Adding tag association
                    position.tags.append(tag)
                    db.flush()
            
            # Commit this chapter's savepoint
            savepoint.commit()
            
            created_puzzles.append({
                "id": position.id,
                "title": position.title,
                "solution": position.solution_san
            })
            
        except Exception as e:
            savepoint.rollback()
            failed_chapters.append({
                "chapter": f"Chapter {i + 1}",
                "error": str(e)
            })
            # Debug: Failed to import chapter
            continue
    
    # Commit all successful changes
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error committing puzzles: {e}")
    
    summary = {
        "total_chapters": len(chapters),
        "created_count": len(created_puzzles),
        "skipped_no_moves_count": len(skipped_no_moves),
        "skipped_duplicates_count": len(skipped_duplicates),
        "reused_positions": reused_positions,
        "duplicate_tag_skips": duplicate_tag_skips,
        "failed_chapters_count": len(failed_chapters),
        "created_puzzles": created_puzzles[:10],  # First 10 for preview
        "skipped_no_moves": skipped_no_moves[:10],
        "skipped_duplicates": skipped_duplicates[:10],
        "failed_chapters": failed_chapters[:10]
    }
    
    if emit:
        emit({"type": "summary", "summary": summary})
    
    return summary


def stream_puzzle_import(db: Session, pgn_text: str) -> Iterator[str]:
    """Stream SSE events for puzzle import process."""
    
    # Start event
    yield f"data: {json.dumps({'type': 'start'})}\n\n"
    
    events = []
    def collect_emit(event: dict):
        events.append(event)
    
    try:
        # Import puzzles
        summary = import_puzzles_from_pgn(db, pgn_text, emit=collect_emit)
        
        # Yield collected events
        for event in events:
            yield f"data: {json.dumps(event)}\n\n"
        
        yield f"data: {json.dumps({'type': 'complete', 'summary': summary})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"


@router.post("/import-puzzles")
def import_puzzles(
    data: ImportPuzzlesRequest,
    db: Session = Depends(get_db)
):
    """Import PGN chapters as puzzle positions.
    
    Can use either:
    1. Direct PGN text (pgn_text field)
    2. Cached PGN via session token
    3. Re-fetch from Lichess if token expired
    
    Returns SSE stream with progress updates.
    """
    pgn_text = data.pgn_text
    
    # If no direct PGN, try to get from cache or re-fetch
    if not pgn_text and data.session_token:
        # Import the cache getter from lichess module
        from backend.api.lichess import _get_cached_pgn, fetch_lichess_studies
        
        cached = _get_cached_pgn(data.session_token)
        if cached:
            pgn_text, _ = cached  # Ignore summary, we just need PGN
        elif data.lichess_username and data.lichess_api_token:
            # Cache miss, re-fetch from Lichess
            try:
                pgn_text, _ = fetch_lichess_studies(data.lichess_username, data.lichess_api_token)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to fetch from Lichess: {str(e)}")
    
    if not pgn_text:
        raise HTTPException(status_code=400, detail="No PGN data available. Please re-download from Lichess.")
    
    return StreamingResponse(
        stream_puzzle_import(db, pgn_text),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )