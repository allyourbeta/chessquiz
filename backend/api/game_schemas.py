"""Pydantic schemas for game and collection endpoints."""

from datetime import datetime

from pydantic import BaseModel

from backend.api.schemas import TagOut


class GameCreate(BaseModel):
    pgn_text: str
    tags: list[str] = []
    collection_ids: list[int] = []


class BulkPGNImport(BaseModel):
    pgn_text: str
    tags: list[str] = []
    collection_ids: list[int] = []


class BulkPGNImportResult(BaseModel):
    imported: int
    failed: int
    errors: list[str]
    game_ids: list[int]


class GameBrief(BaseModel):
    id: int
    white: str | None
    black: str | None
    event: str | None
    date_played: str | None
    result: str | None
    eco: str | None
    opening: str | None
    move_count: int | None
    tags: list[TagOut]

    class Config:
        from_attributes = True


class GameDetail(BaseModel):
    id: int
    pgn_text: str
    white: str | None
    black: str | None
    event: str | None
    site: str | None
    date_played: str | None
    result: str | None
    eco: str | None
    opening: str | None
    move_count: int | None
    moves_san: list[str]
    fens: list[str]
    comments: list[str | None]
    tags: list[TagOut]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GameUpdate(BaseModel):
    tags: list[str] | None = None
    collection_ids: list[int] | None = None


class CollectionCreate(BaseModel):
    name: str
    description: str | None = None


class CollectionOut(BaseModel):
    id: int
    name: str
    description: str | None
    game_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class CollectionDetail(BaseModel):
    id: int
    name: str
    description: str | None
    games: list[GameBrief]
    created_at: datetime

    class Config:
        from_attributes = True


class CollectionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class PositionSearchRequest(BaseModel):
    fen: str
    search_type: str = "exact"


class PositionSearchResult(BaseModel):
    game_id: int
    half_move: int
    white: str | None
    black: str | None
    event: str | None
    result: str | None
    eco: str | None
