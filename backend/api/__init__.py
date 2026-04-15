from backend.api.collections import router as collections_router
from backend.api.games import router as games_router
from backend.api.positions import router as positions_router
from backend.api.quiz import router as quiz_router
from backend.api.tags_and_chess import chess_router, tags_router

__all__ = [
    "positions_router",
    "quiz_router",
    "tags_router",
    "chess_router",
    "games_router",
    "collections_router",
]
