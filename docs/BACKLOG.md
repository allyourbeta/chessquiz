# Chessdirbek Backlog

Living document. The single source of truth for "what's the state of this project
and what should I work on next?"

**How to use this**: Read at the start of every session. Update at the end of every
session. When in doubt about priority, refer here rather than re-deriving it.

**Last updated**: 2026-04-19

---

## Recently shipped (most recent first)

- [x] Phase 16A: Nightly automated backups via launchd, manual backup and restore scripts using SQLite native backup API ^dq-l2houv

- [x] Phase 15: Position types — puzzle vs tabiya split, separate nav tabs, type-specific detail views, migration with case fix and test pollution cleanup ^dq-d3q2pb

- [x] Phase 10 follow-up: Practice game viewer (click row to review), Resign button distinct from Stop Playing ^dq-qjfoqu

- [x] Phase 10: Practice sessions with per-position drilling, engine difficulty, verdict tracking, history ^dq-zkrwbc

- [x] UI Cleanup A-E: Chess notation throughout (1-0, 0-1, ½-½), prominent notifications, card-based layout, pagination/filtering for Practice History, inline editing replacing modals ^dq-6wikge

- [x] PGN import overhaul: Atomic transactions, SSE streaming progress, cancel button, bulk_insert_mappings performance (15k games in ~1 minute) ^dq-o64bhj

- [x] Phase 9: Collections, batch review, position search (exact + pawn structure), tag autocomplete with chips, DB-style game list with pagination ^dq-gjmren

- [x] Phase 7: Engine eval, play vs engine, flip board, Eval/Engine separation ^dq-nxdhtb

- [x] Phase 6: Opening tree explorer with W/D/L stats ^dq-lxh7ra

- [x] Phase 5: Game viewer, PGN import, save-position-from-game ^dq-pubm3a

- [x] Phase 4: Game/Collection API endpoints, position search ^dq-blthii

- [x] Phase 3: Game models, PGN parser, Zobrist hashing, pawn signatures ^dq-gg4yse

- [x] Phase 2: cm-chessboard interactive board with arrows/markers ^dq-ayb7fb

- [x] Phase 1: Frontend modular split, BoardManager abstraction ^dq-n6b744

- [x] CSS redesign: Light Scandinavian theme with Refactoring UI tokens (indigo + cool grey) ^dq-y4nw7r

- [x] Client-side routing: History API for browser back button support ^dq-n4lpou

---

## In progress

*Nothing currently in progress.*

---

## Up next (priority order)

- [ ] Phase 17: Lichess Studies Import ^dq-lywv4e
  Estimate ~45 min. Pull all of the user's Lichess studies (public AND private) via
  the Lichess API in one operation. Cleaner than depending on the LiChess Tools
  browser extension. Doubles as a learning step for Phase 13 (Lichess Bots), which
  uses the same auth pattern.

  **Goal**: One-click "import all my Lichess studies" that downloads every study
  (public AND private) for a given Lichess username, saves them as a combined PGN
  file, then optionally imports them via the existing PGN flow. Each study chapter
  becomes a Game record. From there, the user can save individual positions as
  Puzzles or Tabiyas.

  **Architecture — backend:**
  - New endpoint: `POST /api/lichess/import-studies`
  - Accepts: `{ "lichess_username": "...", "lichess_api_token": "..." }`
  - Returns: SSE streaming progress (mirroring existing PGN import flow)
  - Steps:
    1. Call `GET https://lichess.org/api/study/by/{username}` with
       `Authorization: Bearer {token}`. Response is NDJSON (one JSON object per
       line). Parse and collect all study IDs.
    2. For each study: call `GET https://lichess.org/api/study/{studyId}.pgn` with
       same auth, append to combined PGN file, add 1-second delay between calls
       (Lichess rate limit safety).
    3. Save combined PGN to temp location.
    4. Return summary: `{ "studies_count": N, "chapters_count": M, "pgn_path": "..." }`

  **Architecture — frontend:**
  - New page under Games called "Import from Lichess"
  - Form: Lichess username (text), Lichess API token (password input — never stored)
  - Helper text linking to https://lichess.org/account/oauth/token explaining the
    `study:read` scope requirement
  - SSE progress display reusing existing import progress UI components
  - On completion: summary + button "Import as games" triggering existing PGN
    import flow

  **Token handling:**
  - Token is NEVER stored in the database
  - User enters token each time (for now; can add encrypted token storage later if
    it becomes annoying)
  - Show clear instructions for getting a token: visit
    https://lichess.org/account/oauth/token, create new token with `study:read`
    scope only

  **Error handling:**
  - 401 from Lichess → "Invalid token. Get a new one at..."
  - 404 from Lichess → "Username not found"
  - Network failure → retry once, then fail with clear error
  - Single study failing should NOT stop batch — log, continue, include in summary
    as failed

  **Tests:**
  - Mock Lichess API responses
  - Test: successful flow, bad token, network error, partial failure (one study
    fails out of three)
  - Add to test_lichess_import.py

  **Why first**: Without this, my Phase 15 puzzle UI is empty. My puzzle positions
  all live in Lichess studies. Manual download via the LiChess Tools extension
  turned out to be a maze.

  **Required setup before running:**
  - Get a Lichess API token at https://lichess.org/account/oauth/token
  - Required scope: `study:read`
  - Save token in a password manager — only shown once

- [ ] Import Lichess studies content ^dq-iu5wwt
  Estimate ~30 min after Phase 17 ships. Use the new Lichess Studies import to pull
  StanFurd studies into Chessdirbek. Then manually walk through each tactical study
  chapter and save the critical position as a Puzzle.

  This is content work — populating the puzzle UI with real data from my own
  curated studies (Tactics 1-4, Tactics missed, etc.).

  After doing the manual save-as-puzzle for ~10 chapters, decide whether it feels
  tedious enough to warrant building auto-puzzle-extraction (where the chapter's
  first move = the solution).

- [ ] Phase 13: Lichess Bots integration ^dq-azcu23
  Estimate ~half day. Variety of opponents at varied strengths. The thing I said I
  wanted most. Phase 17's Lichess API code provides the auth pattern this builds on.
  - See: `SPEC-v2.md` Phase 13
  - Lichess API token setup (already familiar after Phase 17)
  - Bot discovery and challenge flow
  - 200+ bots become potential practice opponents
  - Practice History distinguishes bot opponents from local Stockfish

---

## Backlog — Tier 2 (substantive next steps)

Loosely ordered.

- [ ] Phase 16B: Test isolation enforcement ^dq-qkvzu2
  Estimate ~1 hour. Permanent fix for the test pollution bug.

- [ ] Phase 14: Generic engine pluggability + Maia ^dq-hyfcgz
  Estimate ~half day. Local human-like opponents.

- [ ] Auto-puzzle-extraction from Lichess studies ^dq-3u26yp
  Estimate ~1-2 hours. If manual save-as-puzzle proves tedious, build a tool that
  walks each imported chapter and creates a Puzzle position with the first move as
  the solution.

## Backlog — Tier 3 (build when actually needed)

- [ ] Phase 8: Variation tree navigation ^dq-jydbv6
  Only matters once I'm studying annotated PGNs.

- [ ] Phase 11: Repertoire builder + trainer ^dq-4sa63g
  Chessable-like personal repertoire.

- [ ] Phase 12: Auto-annotation + eval graph ^dq-xal2fy
  Analyze my own losses.

- [ ] Phase 16C: Alembic for proper migrations ^dq-zem6tb

- [ ] Phase 16D: OPERATIONS.md runbook ^dq-mdrakl

- [ ] Phase 16E: Auto-backup hooks before risky operations ^dq-fmwwis

## Backlog — Tier 4 (polish)

- [ ] PWA wrapper for mobile/desktop install ^dq-vmbnh6

- [ ] Final UI design pass referencing Refactoring UI doc ^dq-xtlu6q

- [ ] Position search UI cleanup ^dq-3tp6js

- [ ] Quiz tab UX polish ^dq-v6ngfk

---

## Deferred / maybe never

These are recorded decisions not to build something, kept so the reasoning isn't
re-litigated. They are not open work.

- Multi-user / login / cloud sync — single-user app, not needed
- Server-side engine hosting — Lichess bots cover this need
- Mobile-native app — PWA is sufficient
- Lc0 with full networks — too large for browser, Maia covers human-like need
- Color-flipped position search — niche
- Cross-game move-order detection in import dedup — current Zobrist-on-position is
  already correct
- Encrypted token storage in DB — adds complexity, defer until manual token entry
  becomes annoying

---

## Friction log (real annoyances from actual use)

Add to this whenever something annoys you while using the app. These are the most
reliable signal for what to fix next.

| What I tried | What happened | What I expected |
|--------------|---------------|-----------------|
|              |               |                 |
|              |               |                 |
|              |               |                 |

---

## Key documents

- `SPEC-v2.md` — full phase specs (1 through 15)
- `PHASE-16-DATA-SAFETY.md` — data safety spec (16A shipped, 16B-E pending)
- `PUZZLE-VS-TABIYA-DESIGN.md` — design rationale for position types
- `UI-CLEANUP-SPEC-v2.md` — UI cleanup phases A-E (completed)
- `ROADMAP.md` — the document this backlog was converted from
- `CLAUDE.md` — instructions for Claude Code
- `DESIGN.md` — Refactoring UI principles for visual work
- `TEST-WALKTHROUGH.md` — testing checklists from earlier sessions

---

## Session-end ritual

Before closing a session, update this file:

1. Move completed items from "In progress" or "Up next" to "Recently shipped" (change `[ ]` to `[x]`)
2. Update "Last updated" date
3. If you started something but didn't finish, leave it in "In progress" with a brief note
4. Add anything new that came up to "Up next" or "Backlog" as appropriate
5. Add any friction-log entries from real use
6. Commit: `git add docs/BACKLOG.md && git commit -m "Update backlog"`

---

## Session-start ritual

Open this file. Read "Up next." Pick one item. Don't second-guess the priority
order — it was set at the end of the last session when context was fresh.
