# ChessQuiz Roadmap — April 2026

## Vision
A personal chess study home base: save, organize, review, and quiz yourself on **positions** and **games**. Always with engine access at arm's length.

## Current State (v1 — Positions Only)

### ✅ Working Today
- **Position CRUD**: Save FEN + title + notes + Stockfish analysis + tags
- **Quiz mode**: Random positions (filterable by tag), reveal answer, self-grade, stats tracked
- **Bookmarklet**: One-click capture from Lichess/Chess.com
- **Chess analysis**: FEN validation, board info, pawn structure analysis & search, UCI→SAN conversion
- **Engine**: Stockfish WASM runs in browser
- **UX niceties**: Cmd+S quick-save, auto-load FEN on paste, tag memory, URL param for bookmarklet
- **Infra**: PWA (installable), LaunchAgent auto-start, 19 passing tests

### Stack
- Backend: Python 3 + FastAPI + SQLAlchemy + SQLite + python-chess
- Frontend: Single-file vanilla HTML/JS + react-chessboard (CSS board via Unicode)
- Engine: Stockfish WASM (client-side)
- DB: SQLite single file

---

## Sprint: Tournament Prep (April 15-16)

**Goal**: Be able to study openings for Saturday's tournament using ChessQuiz.

### Priority 1 — Game Support (Backend)
_Save and retrieve full games, not just single positions._

- [ ] `Game` model: PGN text, headers (White, Black, Event, Result, Opening, ECO), metadata
- [ ] `GameCollection` model: named groups ("Smith-Morra Games", "My Blitz April 2026")
- [ ] Game ↔ Tag many-to-many (reuse existing tag system)
- [ ] Game ↔ Collection many-to-many
- [ ] API endpoints: CRUD games, list/filter by tag/collection, bulk PGN import (paste multiple games)
- [ ] PGN parsing via python-chess (extracts headers, moves, validates)
- [ ] Pawn structure search across games (reuse existing service)
- [ ] Tests for all new endpoints

### Priority 2 — Game Viewer (Frontend)
_Browse and replay games move-by-move._

- [ ] Game list view (like position list, but shows White/Black/Result/Opening)
- [ ] Game detail view: board + move list side by side
- [ ] Move navigation: ← → keys, click move in list, jump to start/end
- [ ] Collection browser: pick a collection, flip through games sequentially
- [ ] Batch review mode: "Next game" button to go through a collection

### Priority 3 — Position Comments/Plans
_Enhance existing position notes for opening study._

- [ ] Rich notes field: "Here is the position, here is the plan"
- [ ] Display notes more prominently in detail view
- [ ] Quick-add from game viewer: "Save this position" at any point during game replay

### Priority 4 — Polish & Study Flow
- [ ] Unified search: find positions OR games by tag, pawn structure, text
- [ ] Dashboard: quick stats, recent additions, jump to quiz or collection review
- [ ] Quiz: optionally include "quiz from game" (show position mid-game, ask for continuation)

---

## Future (Post-Trip)
- Image/screenshot → FEN (vision API or chess OCR)
- Spaced repetition scheduling (leverage existing quiz_attempts data)
- Lichess/Chess.com API import (pull your own games)
- Move tree / variation explorer (beyond single PGN lines)
- Multi-user / auth
- Import/export (bulk PGN files, backup/restore)
- Responsive mobile layout improvements

---

## Architecture Notes

### Why python-chess is key
- `chess.pgn.read_game()` parses PGN → game tree with headers, moves, comments
- `game.mainline_moves()` iterates the move sequence
- `board.fen()` at any point gives position for board display
- Pawn structure search already works — just needs FENs extracted from game positions
- No need to build chess logic from scratch

### Data Model Sketch

```
Game
  id, pgn_text, white, black, event, result, opening, eco,
  date_played, created_at, updated_at
  → tags (many-to-many via game_tags table)
  → collections (many-to-many via game_collections table)

GameCollection
  id, name, description, created_at
  → games (many-to-many)

Position (existing, unchanged)
  id, fen, title, notes, stockfish_analysis, created_at, updated_at
  → tags, quiz_attempts
```

### Frontend Approach
Current frontend is a single 276-line HTML file with vanilla JS. For game viewer we need:
- Move list rendering with click-to-navigate
- Keyboard navigation (arrow keys)
- This can stay vanilla JS — no need to add React/build tools for this sprint
