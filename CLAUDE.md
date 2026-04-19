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

## Database Backup Scripts
ChessQuiz has automated backup scripts for data safety:

- `scripts/backup_database.sh` — Automated nightly backup at 3am via launchd. Uses SQLite's native backup API. Keeps 30 days of backups.
- `scripts/backup_now.sh` — Manual backup wrapper for use before risky operations. Creates backups with MANUAL prefix.
- `scripts/restore_database.sh <backup-filename>` — Interactive restore with confirmation prompt. Creates safety backup before restore.

Backups are stored in `backups/` directory (gitignored). The launchd plist is at `~/Library/LaunchAgents/com.ashish.chessquiz-backup.plist`.

To load/unload the automated backup:
- Load: `launchctl load ~/Library/LaunchAgents/com.ashish.chessquiz-backup.plist`
- Unload: `launchctl unload ~/Library/LaunchAgents/com.ashish.chessquiz-backup.plist`

IMPORTANT: Always run `scripts/backup_now.sh` before any destructive operations, migrations, or bulk imports.
