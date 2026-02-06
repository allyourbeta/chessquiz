"""Pydantic schemas for request/response validation."""

from datetime import datetime

from pydantic import BaseModel


# --- Tags ---
class TagBase(BaseModel):
    name: str


class TagOut(TagBase):
    id: int

    class Config:
        from_attributes = True


# --- Positions ---
class PositionCreate(BaseModel):
    fen: str
    title: str | None = None
    notes: str | None = None
    stockfish_analysis: str | None = None
    tags: list[str] = []  # Tag names — created if they don't exist


class PositionUpdate(BaseModel):
    title: str | None = None
    notes: str | None = None
    stockfish_analysis: str | None = None
    tags: list[str] | None = None  # If provided, replaces all tags


class PositionOut(BaseModel):
    id: int
    fen: str
    title: str | None
    notes: str | None
    stockfish_analysis: str | None
    tags: list[TagOut]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PositionBrief(BaseModel):
    """Lightweight position for list views."""
    id: int
    fen: str
    title: str | None
    tags: list[TagOut]

    class Config:
        from_attributes = True


# --- Quiz ---
class QuizAttemptCreate(BaseModel):
    position_id: int
    correct: bool


class QuizAttemptOut(BaseModel):
    id: int
    position_id: int
    correct: bool
    created_at: datetime

    class Config:
        from_attributes = True


class QuizPositionOut(BaseModel):
    """Position served during a quiz (answer hidden)."""
    id: int
    fen: str
    title: str | None
    tags: list[TagOut]

    class Config:
        from_attributes = True


# --- Board Info ---
class BoardInfoOut(BaseModel):
    fen: str
    turn: str
    is_check: bool
    is_checkmate: bool
    is_stalemate: bool
    legal_moves: list[str]
    piece_count: dict
    pawn_structure: dict


# --- Stats ---
class PositionStatsOut(BaseModel):
    position_id: int
    total_attempts: int
    correct_count: int
    incorrect_count: int
    accuracy: float


# --- UCI to SAN ---
class UciToSanRequest(BaseModel):
    fen: str
    uci_moves: list[str]


class UciToSanOut(BaseModel):
    san: str
