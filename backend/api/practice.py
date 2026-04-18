"""Practice game API routes (Phase 10)."""

import io

import chess
import chess.pgn
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.api.game_schemas import (
    PracticeEngineBreakdown,
    PracticeGameBrief,
    PracticeGameCreate,
    PracticeGameOut,
    PracticeGameUpdate,
    PracticePositionSummary,
    PracticeStatsOut,
    PracticeTreeMove,
    PracticeTreeResponse,
)
from backend.database import get_db
from backend.models import Position, PracticeGame
from backend.services import ENGINE_LEVELS, compute_engine_verdict

router = APIRouter(prefix="/practice", tags=["practice"])


def _effective_verdict(pg: PracticeGame) -> str | None:
    """User override wins over engine verdict."""
    return pg.user_verdict or pg.engine_verdict


def _aggregate(games: list[PracticeGame]) -> dict:
    wins = draws = losses = abandoned = 0
    for g in games:
        v = _effective_verdict(g)
        if v == "win":
            wins += 1
        elif v == "draw":
            draws += 1
        elif v == "loss":
            losses += 1
        elif v == "abandoned":
            abandoned += 1
    total = len(games)
    decided = wins + draws + losses
    win_rate = (wins / decided) if decided else 0.0
    return {
        "total": total, "wins": wins, "draws": draws,
        "losses": losses, "abandoned": abandoned, "win_rate": win_rate,
    }


@router.get("/engine-levels")
def get_engine_levels():
    """Expose ENGINE_LEVELS so the frontend can populate its dropdown."""
    return ENGINE_LEVELS


@router.post("/", response_model=PracticeGameOut, status_code=201)
def create_practice_game(data: PracticeGameCreate, db: Session = Depends(get_db)):
    position = db.query(Position).filter(Position.id == data.root_position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="Root position not found")

    if data.user_color not in ("white", "black"):
        raise HTTPException(status_code=400, detail="user_color must be 'white' or 'black'")

    engine_verdict = compute_engine_verdict(
        data.starting_eval, data.final_eval, data.user_color
    )

    pg = PracticeGame(
        root_position_id=data.root_position_id,
        pgn_text=data.pgn_text,
        user_color=data.user_color,
        final_fen=data.final_fen,
        move_count=data.move_count,
        engine_verdict=engine_verdict,
        user_verdict=data.user_verdict,
        final_eval=data.final_eval,
        starting_eval=data.starting_eval,
        engine_name=data.engine_name,
        engine_level=data.engine_level,
        notes=data.notes,
    )
    db.add(pg)
    db.commit()
    db.refresh(pg)
    return pg


@router.get("/")
def list_practice_games(
    root_position_id: int | None = Query(default=None),
    verdict: str | None = Query(default=None),
    engine_level: str | None = Query(default=None),
    sort: str = Query(default="recent"),
    limit: int = Query(default=None, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    # Validate parameters
    if verdict and verdict not in ["win", "draw", "loss", "abandoned"]:
        raise HTTPException(status_code=400, detail="Invalid verdict value")
    if sort not in ["recent", "oldest", "longest", "shortest"]:
        raise HTTPException(status_code=400, detail="Invalid sort value")
    
    q = db.query(PracticeGame)
    if root_position_id is not None:
        q = q.filter(PracticeGame.root_position_id == root_position_id)
    
    # Apply verdict filter
    if verdict:
        # Check both user_verdict and engine_verdict
        from sqlalchemy import or_
        q = q.filter(or_(
            PracticeGame.user_verdict == verdict,
            (PracticeGame.user_verdict.is_(None)) & (PracticeGame.engine_verdict == verdict)
        ))
    
    # Apply engine level filter
    if engine_level:
        q = q.filter(PracticeGame.engine_level == engine_level)
    
    # Apply sorting
    if sort == "recent":
        q = q.order_by(PracticeGame.created_at.desc())
    elif sort == "oldest":
        q = q.order_by(PracticeGame.created_at.asc())
    elif sort == "longest":
        q = q.order_by(PracticeGame.move_count.desc())
    elif sort == "shortest":
        q = q.order_by(PracticeGame.move_count.asc())
    
    # Get total count before pagination
    total_count = q.count()
    
    # Apply pagination
    if limit is not None:
        q = q.limit(limit).offset(offset)
    elif offset > 0:
        q = q.offset(offset)
    
    games = q.all()
    
    # Convert to response format with total_count
    return {
        "games": games,
        "total_count": total_count
    }


@router.get("/positions", response_model=list[PracticePositionSummary])
def list_practice_positions(db: Session = Depends(get_db)):
    """Positions that have practice activity, ordered by most recent play."""
    position_ids = [
        row[0] for row in db.query(PracticeGame.root_position_id).distinct().all()
    ]
    summaries: list[dict] = []
    for pid in position_ids:
        position = db.query(Position).filter(Position.id == pid).first()
        if not position:
            continue
        games = (
            db.query(PracticeGame)
            .filter(PracticeGame.root_position_id == pid)
            .all()
        )
        agg = _aggregate(games)
        last_played = max((g.created_at for g in games), default=None)
        summaries.append({
            "position_id": pid,
            "fen": position.fen,
            "title": position.title,
            "total_games": agg["total"],
            "wins": agg["wins"],
            "losses": agg["losses"],
            "draws": agg["draws"],
            "win_rate": agg["win_rate"],
            "last_played": last_played,
        })
    summaries.sort(
        key=lambda s: s["last_played"] or 0, reverse=True
    )
    return summaries


@router.get("/stats/{position_id}", response_model=PracticeStatsOut)
def get_practice_stats(
    position_id: int,
    verdict: str | None = Query(default=None),
    engine_level: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    position = db.query(Position).filter(Position.id == position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    
    # Validate parameters
    if verdict and verdict not in ["win", "draw", "loss", "abandoned"]:
        raise HTTPException(status_code=400, detail="Invalid verdict value")

    q = db.query(PracticeGame).filter(PracticeGame.root_position_id == position_id)
    
    # Apply verdict filter
    if verdict:
        from sqlalchemy import or_
        q = q.filter(or_(
            PracticeGame.user_verdict == verdict,
            (PracticeGame.user_verdict.is_(None)) & (PracticeGame.engine_verdict == verdict)
        ))
    
    # Apply engine level filter
    if engine_level:
        q = q.filter(PracticeGame.engine_level == engine_level)
    
    games = q.all()
    agg = _aggregate(games)

    avg_move_count = (
        sum(g.move_count for g in games) / len(games) if games else 0.0
    )
    finals = [g.final_eval for g in games if g.final_eval is not None]
    avg_final_eval = (sum(finals) / len(finals)) if finals else None

    by_level: dict[str, list[PracticeGame]] = {}
    for g in games:
        by_level.setdefault(g.engine_level, []).append(g)

    breakdown = []
    for level, lgames in sorted(by_level.items()):
        la = _aggregate(lgames)
        breakdown.append(PracticeEngineBreakdown(
            engine_level=level,
            total=la["total"],
            wins=la["wins"],
            draws=la["draws"],
            losses=la["losses"],
            abandoned=la["abandoned"],
            win_rate=la["win_rate"],
        ))

    return PracticeStatsOut(
        position_id=position_id,
        total_games=agg["total"],
        wins=agg["wins"],
        draws=agg["draws"],
        losses=agg["losses"],
        abandoned=agg["abandoned"],
        win_rate=agg["win_rate"],
        avg_move_count=avg_move_count,
        avg_final_eval=avg_final_eval,
        by_engine_level=breakdown,
    )


@router.get("/tree/{position_id}", response_model=PracticeTreeResponse)
def get_practice_tree(position_id: int, db: Session = Depends(get_db)):
    """Opening tree built from user's practice games starting at this position."""
    position = db.query(Position).filter(Position.id == position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    games = (
        db.query(PracticeGame)
        .filter(PracticeGame.root_position_id == position_id)
        .all()
    )

    move_stats: dict[str, dict] = {}
    for g in games:
        first_san, next_fen = _first_move_from_root(g.pgn_text, position.fen)
        if not first_san:
            continue
        entry = move_stats.setdefault(first_san, {
            "san": first_san, "fen": next_fen,
            "games": 0, "wins": 0, "draws": 0, "losses": 0,
        })
        entry["games"] += 1
        v = _effective_verdict(g)
        if v == "win":
            entry["wins"] += 1
        elif v == "draw":
            entry["draws"] += 1
        elif v == "loss":
            entry["losses"] += 1

    moves = []
    for e in sorted(move_stats.values(), key=lambda x: x["games"], reverse=True):
        decided = e["wins"] + e["draws"] + e["losses"]
        win_rate = (e["wins"] / decided) if decided else 0.0
        moves.append(PracticeTreeMove(
            san=e["san"], fen=e["fen"], games=e["games"],
            wins=e["wins"], draws=e["draws"], losses=e["losses"],
            win_rate=win_rate,
        ))

    return PracticeTreeResponse(
        position_id=position_id,
        total_games=len(games),
        moves=moves,
    )


def _first_move_from_root(pgn_text: str, root_fen: str) -> tuple[str | None, str]:
    """Extract the first move after the root position from pgn_text.

    PracticeGame pgn_text starts from the root position, so the first mainline
    move is the one we want. Returns (san, fen_after_move) or (None, root_fen).
    """
    try:
        game = chess.pgn.read_game(io.StringIO(pgn_text))
        if game is None:
            return None, root_fen
        board = game.board()
        first = next(iter(game.mainline_moves()), None)
        if first is None:
            return None, board.fen()
        san = board.san(first)
        board.push(first)
        return san, board.fen()
    except Exception:
        return None, root_fen


@router.get("/{practice_id}", response_model=PracticeGameOut)
def get_practice_game(practice_id: int, db: Session = Depends(get_db)):
    pg = db.query(PracticeGame).filter(PracticeGame.id == practice_id).first()
    if not pg:
        raise HTTPException(status_code=404, detail="Practice game not found")
    return pg


@router.put("/{practice_id}", response_model=PracticeGameOut)
def update_practice_game(
    practice_id: int,
    data: PracticeGameUpdate,
    db: Session = Depends(get_db),
):
    pg = db.query(PracticeGame).filter(PracticeGame.id == practice_id).first()
    if not pg:
        raise HTTPException(status_code=404, detail="Practice game not found")

    if data.user_verdict is not None:
        if data.user_verdict not in ("win", "draw", "loss", "abandoned", ""):
            raise HTTPException(
                status_code=400,
                detail="user_verdict must be win/draw/loss/abandoned",
            )
        pg.user_verdict = data.user_verdict or None
    if data.notes is not None:
        pg.notes = data.notes

    db.commit()
    db.refresh(pg)
    return pg


@router.delete("/{practice_id}", status_code=204)
def delete_practice_game(practice_id: int, db: Session = Depends(get_db)):
    pg = db.query(PracticeGame).filter(PracticeGame.id == practice_id).first()
    if not pg:
        raise HTTPException(status_code=404, detail="Practice game not found")
    db.delete(pg)
    db.commit()
