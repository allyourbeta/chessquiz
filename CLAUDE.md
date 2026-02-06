# ChessQuiz

Personal chess position quiz app. Save positions (FEN), annotate them with notes and Stockfish analysis, tag them, and quiz yourself.

## Architecture

```
React (browser)
  ├── Stockfish WASM (engine analysis, client-side)
  ├── react-chessboard (board rendering)
  └── calls → Python backend (FastAPI)
                ├── python-chess (FEN validation, pawn structure search, position analysis)
                └── SQLite via SQLAlchemy (persistence)
```

## Tech Stack
- **Backend**: Python 3 + FastAPI + SQLAlchemy + SQLite
- **Chess logic**: python-chess (backend), stockfish.js WASM (frontend)
- **Frontend**: React + TypeScript + react-chessboard
- **Database**: SQLite (single file, no server)

## File Limits
- No file over 300 lines. Split immediately if exceeded.

## Backend Structure
- `models/` — SQLAlchemy models
- `api/` — FastAPI route handlers (all DB calls here)
- `services/` — Pure functions for chess logic (no DB, no FastAPI imports)
- `main.py` — App entry point, mounts routers
- `database.py` — DB engine/session setup

## Key Decisions
- Single-user MVP (no auth). User ID hardcoded as 1.
- Quiz order: random within filtered tag set.
- Quiz history tracked from day one (for future spaced repetition).
- Stockfish runs in browser (WASM), not on server.
- python-chess used server-side for FEN validation, pawn structure, etc.
