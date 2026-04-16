"""Engine configuration + verdict computation.

Pure functions — no DB, no FastAPI imports. The frontend reads ENGINE_LEVELS
via /api/practice/engine-levels to populate its difficulty dropdown, and each
PracticeGame row records which level was used.
"""

ENGINE_LEVELS = {
    "easy":   {"name": "Stockfish", "depth": 5,  "skill": 5},
    "medium": {"name": "Stockfish", "depth": 10, "skill": 12},
    "hard":   {"name": "Stockfish", "depth": 15, "skill": 18},
    "max":    {"name": "Stockfish", "depth": 20, "skill": 20},
}


def compute_engine_verdict(
    starting_eval: float | None,
    final_eval: float | None,
    user_color: str,
) -> str | None:
    """Return "win" / "draw" / "loss" from the user's perspective.

    Eval is in pawns (positive = good for white). A swing of more than 1.0
    pawn in the user's favor counts as a win; the reverse as a loss. If either
    eval is missing we return None so callers can fall back to user_verdict.
    """
    if starting_eval is None or final_eval is None:
        return None
    delta = final_eval - starting_eval
    if user_color == "black":
        delta = -delta
    if delta > 1.0:
        return "win"
    if delta < -1.0:
        return "loss"
    return "draw"
