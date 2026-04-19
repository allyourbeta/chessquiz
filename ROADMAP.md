# ChessQuiz Roadmap

Living document. The single source of truth for "what's the state of this project and what should I work on next?"

**How to use this**: Read at the start of every session. Update at the end of every session. When in doubt about priority, refer here rather than re-deriving it.

**Last updated**: 2026-04-19

---

## Recently shipped (most recent first)

- **Phase 15**: Position types — puzzle vs tabiya split, separate nav tabs, type-specific detail views, migration with case fix and test pollution cleanup
- **Phase 10 follow-up**: Practice game viewer (click row to review), Resign button distinct from Stop Playing
- **Phase 10**: Practice sessions with per-position drilling, engine difficulty, verdict tracking, history
- **UI Cleanup A-E**: Chess notation throughout (1-0, 0-1, ½-½), prominent notifications, card-based layout, pagination/filtering for Practice History, inline editing replacing modals
- **PGN import overhaul**: Atomic transactions, SSE streaming progress, cancel button, bulk_insert_mappings performance (15k games in ~1 minute)
- **Phase 9**: Collections, batch review, position search (exact + pawn structure), tag autocomplete with chips, DB-style game list with pagination
- **Phase 7**: Engine eval, play vs engine, flip board, Eval/Engine separation
- **Phase 6**: Opening tree explorer with W/D/L stats
- **Phase 5**: Game viewer, PGN import, save-position-from-game
- **Phase 4**: Game/Collection API endpoints, position search
- **Phase 3**: Game models, PGN parser, Zobrist hashing, pawn signatures
- **Phase 2**: cm-chessboard interactive board with arrows/markers
- **Phase 1**: Frontend modular split, BoardManager abstraction
- **CSS redesign**: Light Scandinavian theme with Refactoring UI tokens (indigo + cool grey)
- **Client-side routing**: History API for browser back button support

---

## In progress

*Nothing currently in progress. Last session ended with Phase 15 commit.*

---

## Up next (priority order)

### 1. Phase 16A: Nightly backups (~1 hour)

Just the backup piece of Phase 16, not the whole phase. Protects against the next disaster (we've already had two).

- See: `PHASE-16-DATA-SAFETY.md` section 16A only
- Backup script using SQLite native API
- launchd job for nightly automatic backups
- Manual backup script for use before risky operations
- Restore script

**Why first**: Cheap insurance. Without this, the next time a migration goes sideways, we lose data. With this, we lose at most 24 hours.

### 2. Import Lichess puzzles (~15 min, content task)

Phase 15 introduced the puzzle position type but I have zero puzzles. Need real puzzle data to actually use the puzzle features.

- Download Lichess open puzzle database (CSV with FEN + solution)
- Filter to puzzles in my rating range (~1900-2100)
- Import as Position records with `position_type='puzzle'`
- Verify puzzle UI works end-to-end

**Why now**: Without puzzles, half of Phase 15 is unused theoretical UI.

### 3. Phase 13: Lichess Bots integration (~half day)

Variety of opponents at varied strengths. The thing I said I wanted most.

- See: `SPEC-v2.md` Phase 13
- Lichess API token setup
- Bot discovery and challenge flow
- 200+ bots become potential practice opponents
- Practice History distinguishes bot opponents from local Stockfish

**Why third**: Highest value-per-engineering-hour for my stated study goal of "varied opponents."

---

## Backlog (loosely ordered)

### Tier 2 — Substantive next steps

- **Phase 16B**: Test isolation enforcement (~1 hour) — after backups are in place, fix the test pollution bug permanently
- **Phase 14**: Generic engine pluggability + Maia (~half day) — local human-like opponents

### Tier 3 — Build when actually needed

- **Phase 8**: Variation tree navigation — only matters once I'm studying annotated PGNs
- **Phase 11**: Repertoire builder + trainer — Chessable-like personal repertoire
- **Phase 12**: Auto-annotation + eval graph — analyze my own losses
- **Phase 16C**: Alembic for proper migrations
- **Phase 16D**: OPERATIONS.md runbook
- **Phase 16E**: Auto-backup hooks before risky operations

### Tier 4 — Polish

- PWA wrapper for mobile/desktop install
- Final UI design pass referencing Refactoring UI doc and DESIGN-INSPIRATION.md
- Position search UI cleanup
- Quiz tab UX polish (now that puzzles will populate it)

---

## Deferred / maybe never

- Multi-user / login / cloud sync — single-user app, not needed
- Server-side engine hosting — Lichess bots cover this need
- Mobile-native app — PWA is sufficient
- Lc0 with full networks — too large for browser, Maia covers human-like need
- Color-flipped position search — niche
- Cross-game move-order detection in import dedup — current Zobrist-on-position is already correct

---

## Friction log (real annoyances from actual use)

Add to this whenever something annoys you while using the app. These are the most reliable signal for what to fix next.

| What I tried | What happened | What I expected |
|--------------|---------------|-----------------|
|              |               |                 |
|              |               |                 |
|              |               |                 |

---

## Key documents

- `SPEC-v2.md` — full phase specs (1 through 15)
- `PHASE-16-DATA-SAFETY.md` — data safety spec (16A-16E)
- `PUZZLE-VS-TABIYA-DESIGN.md` — design rationale for position types
- `UI-CLEANUP-SPEC-v2.md` — UI cleanup phases A-E (completed)
- `CLAUDE.md` — instructions for Claude Code
- `DESIGN.md` — Refactoring UI principles for visual work
- `TEST-WALKTHROUGH.md` — testing checklists from earlier sessions

---

## Session-end ritual

Before closing a session, update this file:
1. Move completed items from "In progress" or "Up next" to "Recently shipped"
2. Update "Last updated" date
3. If you started something but didn't finish, leave it in "In progress" with a brief note
4. Add anything new that came up to "Up next" or "Backlog" as appropriate
5. Add any friction-log entries from real use
6. Commit: `git add ROADMAP.md && git commit -m "Update roadmap"`

---

## Session-start ritual

Open this file. Read "Up next." Pick one item. Don't second-guess the priority order — it was set at the end of the last session when context was fresh.
