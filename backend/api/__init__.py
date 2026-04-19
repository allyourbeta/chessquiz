from backend.api.collections import router as collections_router
from backend.api.games import router as games_router
from backend.api.lichess import router as lichess_router
from backend.api.opening_tree import router as opening_tree_router
from backend.api.positions import router as positions_router
from backend.api.practice import router as practice_router
from backend.api.puzzle_import import router as puzzle_import_router
from backend.api.quiz import router as quiz_router
from backend.api.tags_and_chess import chess_router, tags_router

__all__ = [
    "positions_router",
    "quiz_router",
    "tags_router",
    "chess_router",
    "games_router",
    "collections_router",
    "opening_tree_router",
    "practice_router",
    "lichess_router",
    "puzzle_import_router",
]
