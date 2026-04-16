"""Game API routes. All DB calls for games happen here."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from backend.api.game_schemas import (
    BulkPGNImport,
    BulkPGNImportResult,
    GameBrief,
    GameCreate,
    GameDetail,
    GameUpdate,
    PositionSearchRequest,
    PositionSearchResult,
)
from backend.database import get_db
from backend.models import Game, GameCollection, PositionIndex, Tag
from backend.services import (
    compute_position_index,
    compute_zobrist,
    extract_auto_tags,
    parse_multi_pgn,
    parse_single_pgn,
)

router = APIRouter(prefix="/games", tags=["games"])


def _get_or_create_tags(db: Session, tag_names: list[str]) -> list[Tag]:
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


def _create_game_from_parsed(
    db: Session, parsed: dict, user_tags: list[str], collection_ids: list[int]
) -> Game:
    headers = parsed["headers"]
    auto_tags = extract_auto_tags(headers)
    all_tag_names = list(set(user_tags + auto_tags))
    tags = _get_or_create_tags(db, all_tag_names)

    collections = []
    if collection_ids:
        collections = (
            db.query(GameCollection)
            .filter(GameCollection.id.in_(collection_ids))
            .all()
        )

    game = Game(
        pgn_text=parsed["pgn_text"],
        white=headers.get("White"),
        black=headers.get("Black"),
        event=headers.get("Event"),
        site=headers.get("Site"),
        date_played=headers.get("Date"),
        result=headers.get("Result"),
        eco=headers.get("ECO"),
        opening=headers.get("Opening"),
        move_count=parsed["move_count"],
        tags=tags,
        collections=collections,
    )
    db.add(game)
    db.flush()

    index_data = compute_position_index(parsed["pgn_text"])
    for entry in index_data:
        pi = PositionIndex(
            game_id=game.id,
            half_move=entry["half_move"],
            zobrist_hash=entry["zobrist_hash"],
            fen=entry["fen"],
            pawn_sig=entry["pawn_sig"],
        )
        db.add(pi)

    return game


@router.post("/", response_model=GameBrief, status_code=201)
def create_game(data: GameCreate, db: Session = Depends(get_db)):
    parsed = parse_single_pgn(data.pgn_text)
    if parsed.get("error"):
        raise HTTPException(status_code=400, detail=parsed["error"])
    parsed["pgn_text"] = data.pgn_text

    game = _create_game_from_parsed(db, parsed, data.tags, data.collection_ids)
    db.commit()
    db.refresh(game)
    return game


@router.post("/import", response_model=BulkPGNImportResult)
def bulk_import(data: BulkPGNImport, db: Session = Depends(get_db)):
    results = parse_multi_pgn(data.pgn_text)
    if not results:
        raise HTTPException(status_code=400, detail="No games found in PGN")

    imported = 0
    failed = 0
    errors = []
    game_ids = []

    for i, parsed in enumerate(results):
        if parsed.get("error"):
            failed += 1
            errors.append(f"Game {i + 1}: {parsed['error']}")
            continue
        try:
            game = _create_game_from_parsed(
                db, parsed, data.tags, data.collection_ids
            )
            db.flush()
            game_ids.append(game.id)
            imported += 1
        except Exception as e:
            failed += 1
            errors.append(f"Game {i + 1}: {str(e)}")

    db.commit()
    return BulkPGNImportResult(
        imported=imported, failed=failed, errors=errors, game_ids=game_ids
    )


@router.get("/", response_model=list[GameBrief])
def list_games(
    tag: str | None = None,
    collection_id: int | None = None,
    search: str | None = None,
    eco: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Game).options(joinedload(Game.tags))

    if tag:
        tag_name = tag.strip().lower().lstrip("#")
        query = query.filter(Game.tags.any(Tag.name == tag_name))

    if collection_id:
        query = query.filter(
            Game.collections.any(GameCollection.id == collection_id)
        )

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            Game.white.ilike(pattern)
            | Game.black.ilike(pattern)
            | Game.event.ilike(pattern)
            | Game.opening.ilike(pattern)
        )

    if eco:
        query = query.filter(Game.eco == eco.upper())

    return query.order_by(Game.created_at.desc()).all()


@router.get("/{game_id}", response_model=GameDetail)
def get_game(game_id: int, db: Session = Depends(get_db)):
    game = (
        db.query(Game)
        .options(joinedload(Game.tags))
        .filter(Game.id == game_id)
        .first()
    )
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    parsed = parse_single_pgn(game.pgn_text)
    return GameDetail(
        id=game.id,
        pgn_text=game.pgn_text,
        white=game.white,
        black=game.black,
        event=game.event,
        site=game.site,
        date_played=game.date_played,
        result=game.result,
        eco=game.eco,
        opening=game.opening,
        move_count=game.move_count,
        moves_san=parsed.get("moves_san", []),
        fens=parsed.get("fens", []),
        comments=parsed.get("comments", []),
        tags=game.tags,
        created_at=game.created_at,
        updated_at=game.updated_at,
    )


@router.put("/{game_id}", response_model=GameBrief)
def update_game(
    game_id: int, data: GameUpdate, db: Session = Depends(get_db)
):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if data.tags is not None:
        game.tags = _get_or_create_tags(db, data.tags)

    if data.collection_ids is not None:
        game.collections = (
            db.query(GameCollection)
            .filter(GameCollection.id.in_(data.collection_ids))
            .all()
        )

    db.commit()
    db.refresh(game)
    return game


@router.delete("/{game_id}", status_code=204)
def delete_game(game_id: int, db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    db.delete(game)
    db.commit()


@router.post("/search-position", response_model=list[PositionSearchResult])
def search_position(
    data: PositionSearchRequest, db: Session = Depends(get_db)
):
    if data.search_type == "exact":
        try:
            z_hash = compute_zobrist(data.fen)
        except (ValueError, Exception) as e:
            raise HTTPException(status_code=400, detail=f"Invalid FEN: {e}")
        matches = (
            db.query(PositionIndex)
            .filter(PositionIndex.zobrist_hash == z_hash)
            .all()
        )
    elif data.search_type == "pawn":
        from backend.services import compute_pawn_sig

        try:
            target_sig = compute_pawn_sig(data.fen)
        except (ValueError, Exception) as e:
            raise HTTPException(status_code=400, detail=f"Invalid FEN: {e}")
        matches = (
            db.query(PositionIndex)
            .filter(PositionIndex.pawn_sig == target_sig)
            .all()
        )
    else:
        raise HTTPException(
            status_code=400, detail="search_type must be 'exact' or 'pawn'"
        )

    seen = set()
    results = []
    for m in matches:
        key = (m.game_id, m.half_move)
        if key in seen:
            continue
        seen.add(key)
        game = db.query(Game).filter(Game.id == m.game_id).first()
        if game:
            results.append(
                PositionSearchResult(
                    game_id=game.id,
                    half_move=m.half_move,
                    white=game.white,
                    black=game.black,
                    event=game.event,
                    result=game.result,
                    eco=game.eco,
                )
            )

    return results
