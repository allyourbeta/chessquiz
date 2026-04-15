# ChessQuiz v2 — Comprehensive Phased Implementation Spec

## Context

ChessQuiz is a personal chess study home base. v1 handles positions (FEN snapshots). v2 transforms it into a full chess database and study system comparable to ChessBase/SCID, but web-based and personal.

**Read CLAUDE.md before starting any phase.** Architecture rules: 300-line file limit, layered architecture, etc.

**Existing stack**: FastAPI + SQLAlchemy + SQLite + python-chess (backend), vanilla HTML/JS (frontend). All 19 existing tests pass via `python test.py`.

**Critical rule**: Do NOT break existing functionality. Run `python test.py` after every phase.

---

## Feature Inventory: What a Complete Chess Study System Needs

Based on survey of ChessBase, SCID, Lucas Chess, Chesstrie, Chess Position Trainer, ChessForge, and other tools, here is the complete feature set organized by priority.

### Must-Have (Phases 1-6)
1. **Interactive board with drag-and-drop** — move pieces, edit positions, play moves
2. **Board arrows and square highlighting** — built into chessground, available from Phase 2
3. **Game storage and PGN import** — single and bulk, with auto-tagging from headers
4. **Full PGN preservation** — store comments, variations, NAGs (not just mainline)
5. **Game viewer** — move-by-move navigation with arrow keys, click-to-jump
6. **Opening tree / explorer** — from any position, see all moves played + win/loss stats
7. **Collections** — named groups of games for organized study
8. **Zobrist hash indexing** — instant exact position lookup across entire database
9. **Pawn structure search** — find games by partial pawn configuration (signature-based)
10. **Annotations** — text comments on games and positions
11. **Engine analysis** — Stockfish WASM with eval bar and best-move display
12. **Play vs engine from any position** — start a game from any saved position

### Should-Have (Phases 7-10)
13. **Repertoire builder** — define your opening repertoire as a move tree
14. **Repertoire trainer** — spaced repetition quiz on your repertoire lines
15. **Game auto-annotation** — engine annotates blunders/mistakes automatically
16. **Evaluation graph** — visual chart of advantage across a game
17. **Batch review mode** — flip through a collection game-by-game
18. **Lichess/Chess.com API import** — pull your own games directly

### Nice-to-Have (Future)
17. **Endgame tablebase probing** — Syzygy tablebase lookup via online API
18. **Opponent preparation** — search opponent's games, find weaknesses
19. **Image/screenshot to FEN** — vision API or chess OCR
20. **PGN export** — export games/collections as PGN files
21. **Move tree / variation explorer** — branching variations, not just mainline
22. **Board arrows and square highlighting** — annotate visually on the board

---

## Tech Stack Decisions

### Interactive Board: cm-chessboard + chess.js

**cm-chessboard** is the board library (decision finalized). Not chessground (GPL + requires bundler), not chessboard.js (jQuery + no arrows).

- **cm-chessboard**: renders SVG board with drag-and-drop
  - No dependencies, ES6 module, MIT license
  - CDN: `https://cdn.jsdelivr.net/npm/cm-chessboard@8/src/Chessboard.js`
  - Works with `<script type="module">` — no bundler needed
  - Extensions: Markers (square highlighting), Arrows, RightClickAnnotator,
    PromotionDialog
  - SVG sprite-based pieces, responsive, animated
- **chess.js**: client-side move validation and legal move generation
  - Ensures only legal moves accepted during drag-and-drop
  - Provides PGN generation, FEN output, game state tracking
  - Loads from CDN
- Together they replace the current Unicode CSS grid board entirely

### Position Indexing: Two Systems for Two Query Types

**Exact position search → Zobrist hashing**
- `chess.polyglot.zobrist_hash(board)` from python-chess
- 64-bit hash uniquely identifies any chess position
- On game import: compute Zobrist hash at every move, store in indexed table
- "Find all games that reached THIS exact position" = O(1) index lookup
- SQLite INTEGER index handles this efficiently

**Pawn structure search → Pawn signature strings**
- Zobrist hashing is wrong for pawn structure search because structure queries
  are inherently partial/fuzzy ("Black has pawns on c6, d5, e6" regardless of
  where White's pawns are or what pieces are on the board)
- Instead, store a pawn signature string per position:
  `"w:a2,b2,d4,f2,g2,h2|b:a7,b7,c6,d5,e6,f7,g7,h7"`
- This is a sorted list of each pawn's square, grouped by color
- Query types this enables:
  - **Exact pawn match**: string equality
  - **Subset/partial match**: "does Black's pawn list contain c6,d5,e6?" —
    set-contains check, works regardless of other pawns
  - **Pattern match**: "White has isolated d-pawn" — d4 present but no pawn on
    c-file or e-file adjacent ranks
  - **Fuzzy match**: "similar structure with at most N pawns different" —
    compute set difference
- At our scale (tens of thousands of positions), even scanning with pattern
  matching is fast. Optimize with indexes only if needed later.

### PGN Storage: Full Original PGN

- **Store the complete original PGN text**, including comments `{ ... }`,
  variations `( ... )`, and NAG annotations (`$1`, `!`, `?`, etc.)
- Do NOT strip annotations on import — they contain valuable study content
  that cannot be reconstructed
- Parse mainline moves + FENs on demand for the game viewer
- Display comments inline in the move list when present
- Variation navigation is a later feature (Phase 9+), but storing the data
  now means it's available when we build it
- `parse_single_pgn()` should extract mainline for the viewer while preserving
  the full PGN in the database

### Database: SQLite (with migration path)
- SQLite for MVP: single file, zero config, fast enough for millions of positions
- SQLAlchemy ORM means switching to PostgreSQL later is a one-line config change
- Zobrist hash column indexed for exact position lookups
- Pawn signature column for structure search
- Cloud-ready: works on any VPS, Railway, Render, Fly.io

### Engine: Stockfish WASM (already in place)
- Runs in browser, no server-side engine needed
- For v2: add eval bar visualization and best-move arrow overlay
- For "play vs engine": use chess.js for game state + Stockfish for opponent moves

### Client-Side State Management
- Use a simple shared state object that all UI modules read/write:
  ```javascript
  const AppState = {
    currentGame: null,
    currentPly: 0,
    engineOn: false,
    mode: 'view',  // 'view', 'edit', 'play'
    // ... etc
  };
  ```
- All modules reference AppState rather than managing their own copies
- If this becomes painful at scale, add Alpine.js (reactive, no build step)
- Do NOT jump to React — the constraint is no complex build tooling

---

## Phase 1: Frontend Split + Board Abstraction

**Goal**: Split the monolithic index.html into modules BEFORE adding any new features. Establish a board abstraction layer so the chessground migration (Phase 2) doesn't require rewriting every view.

**Why this is first**: index.html is 276 lines — one line below the limit. Any new feature pushes it over. Splitting after adding code means moving things around and debugging broken references. Do the structural work while the codebase is small and stable.

### 1A: Create the module structure

```
frontend/
  index.html              — HTML shell only: structure, styles, nav, <script> tags
  js/
    shared.js              — API base URL, toast(), tag rendering, view switching
    state.js               — AppState object (shared state store)
    board.js               — Board rendering abstraction layer (see 1B)
    positions.js           — Position CRUD: list, detail, add/edit form, delete
    quiz.js                — Quiz mode: start, next, reveal, record attempt
    stockfish.js           — Stockfish WASM init and communication
```

### 1B: Board abstraction layer (`board.js`)

Create a thin wrapper that all views call. This is the key to a clean chessground migration later:

```javascript
// board.js — Board rendering abstraction
// Phase 1: wraps the existing Unicode renderer
// Phase 2: swaps internals to chessground, zero changes to callers

const BoardManager = {
  boards: {},  // boardId -> board state

  create(elementId, fen, options = {}) {
    // Renders board into the element. Returns board handle.
    // options: { flipped, draggable, onMove, sparePieces }
  },

  setPosition(elementId, fen) {
    // Update board to new position
  },

  flip(elementId) {
    // Toggle orientation
  },

  destroy(elementId) {
    // Clean up
  },

  getPosition(elementId) {
    // Return current FEN
  }
};
```

Phase 1 implementation: BoardManager internally calls the existing Unicode renderBoard logic.
Phase 2: swap internals to chessground. All callers (positions.js, quiz.js, games.js) unchanged.

### 1C: Extract JavaScript from index.html

Move all JS from `<script>` in index.html into the appropriate module files. index.html keeps only:
- HTML structure (header, nav, view containers)
- CSS styles
- `<script src="/js/...">` tags
- DOMContentLoaded listener that calls init functions from modules

### 1D: Update main.py to serve /js/

Add static file serving for the new js directory:
```python
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")
```

### 1E: Verify nothing broke

No new features, no behavior changes. Pure refactor.

### Checkpoint 1
```bash
python test.py    # All 19 tests pass (including frontend serves test)

Manual testing:
- [ ] All existing views render correctly (positions list, add, detail, quiz)
- [ ] Board displays correct positions
- [ ] Flip board works
- [ ] Add/edit position works
- [ ] Quiz flow works (start, reveal, grade)
- [ ] Stockfish analysis works
- [ ] Cmd+S quick-save works
- [ ] FEN auto-load on paste works
- [ ] Bookmarklet ?fen= param works
- [ ] Tag filtering works
- [ ] No JS file exceeds 300 lines
- [ ] index.html is well under 300 lines (HTML + CSS only)
```

---

## Phase 2: Interactive Board (cm-chessboard + chess.js)

**Goal**: Swap BoardManager internals from Unicode to cm-chessboard. Add drag-and-drop, position editing, legal move validation, arrows, and square highlighting.

**Why cm-chessboard** (decision finalized after evaluating chessground and chessboard.js):
- No dependencies, SVG rendered, ES6 modules
- Explicitly supports CDN + `<script type="module">` (our constraint)
- Extensions for arrows, markers, right-click annotation, promotion dialog
- MIT license (chessground is GPL-3.0, which would require open-sourcing the app)
- chessboard.js rejected: requires jQuery, no arrows/highlights, no longer actively developed

### 2A: Add cm-chessboard and chess.js

```html
<!-- cm-chessboard via CDN -->
<script type="module">
  import {Chessboard, FEN} from
    "https://cdn.jsdelivr.net/npm/cm-chessboard@8/src/Chessboard.js";
  // Extensions loaded similarly from CDN
</script>

<!-- chess.js for move validation -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"></script>
```

NOTE: Verify exact CDN URLs and versions before starting. cm-chessboard requires
an `assetsUrl` pointing to its SVG sprite file — either serve locally or reference
the CDN path. Since our frontend now uses `<script type="module">`, all other JS
files (board.js, games.js, etc.) must also be loaded as modules or via classic
script tags that don't conflict. Plan this carefully during Phase 1 file split.

### 2B: Swap BoardManager internals

Replace the Unicode rendering inside BoardManager with cm-chessboard:

```javascript
import {Chessboard, FEN, INPUT_EVENT_TYPE}
  from "https://cdn.jsdelivr.net/npm/cm-chessboard@8/src/Chessboard.js";
import {Markers, MARKER_TYPE}
  from "https://cdn.jsdelivr.net/npm/cm-chessboard@8/src/extensions/markers/Markers.js";
import {Arrows, ARROW_TYPE}
  from "https://cdn.jsdelivr.net/npm/cm-chessboard@8/src/extensions/arrows/Arrows.js";

create(elementId, fen, options = {}) {
  const config = {
    position: fen,
    orientation: options.flipped ? 'black' : 'white',
    assetsUrl: "...",  // Path to cm-chessboard SVG sprite
    extensions: [
      {class: Markers},
      {class: Arrows}
    ]
  };
  const board = new Chessboard(document.getElementById(elementId), config);

  if (options.draggable) {
    board.enableMoveInput((event) => {
      if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
        // In edit mode: always allow
        // In play mode: check chess.js for legal moves
        return true;
      }
      if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
        if (options.onMove) return options.onMove(event);
        return true;
      }
    });
  }

  this.boards[elementId] = board;
}
```

### 2C: Board modes

BoardManager supports three modes, selectable per instance:

1. **Display mode**: View-only (no move input enabled). Used in position detail, quiz, game list.
2. **Edit mode**: Free piece placement via `movable.free`, no legality check. Used in position editor. Updates FEN on every change.
3. **Play mode**: Move input enabled with legal-move validation via chess.js. Used in analysis and play-vs-engine.

### 2D: Built-in features from cm-chessboard extensions

These work via the Markers and Arrows extensions:
- `board.addMarker(MARKER_TYPE.square, "e4")` — highlight a square
- `board.addArrow("e2", "e4")` — draw an arrow
- Right-click annotation via RightClickAnnotator extension
- Move animation built in (configurable duration)
- Last-move highlighting via markers on from/to squares

### 2E: Update existing views to use new board

- Position add/edit: Edit mode (free piece placement)
- Position detail: Display mode
- Quiz: Display mode
- All views: flip still works via BoardManager.flip()

### Checkpoint 2
```
Manual testing:
- [ ] All views show chessground board (piece images, not Unicode)
- [ ] Position add/edit: drag pieces to set up positions, FEN updates
- [ ] Display-only boards don't allow dragging
- [ ] Right-click drag draws arrows on board
- [ ] Right-click highlights squares
- [ ] Piece move animations work
- [ ] Flip works in all views
- [ ] Stockfish still works (receives FEN from BoardManager)
- [ ] Quiz flow unchanged
- [ ] python test.py passes
```

---

## Phase 3: Game Data Model + Zobrist Index + PGN Service

**Goal**: Backend models, PGN parsing, Zobrist hash indexing. No API yet — just models, services, and tests.

**Why this comes after the board**: This is backend-only work with no frontend dependency. It can technically run in parallel with Phase 2, but sequencing it here means Phase 4 (API) can immediately be tested end-to-end.

### 3A: Models

Create `backend/models/game_models.py`:

```python
# Join tables
game_tags              # game_id, tag_id (reuse existing Tag model)
game_collection_assoc  # game_id, collection_id

class Game(Base):
    __tablename__ = "games"
    id, pgn_text (full original PGN including comments/variations),
    white, black, event, site, date_played (String),
    result, eco, opening, move_count, created_at, updated_at
    tags (relationship via game_tags)
    collections (relationship via game_collection_assoc)

class GameCollection(Base):
    __tablename__ = "game_collections"
    id, name (unique), description, created_at
    games (relationship)

class PositionIndex(Base):
    """Index for fast position and pawn structure lookup across all games."""
    __tablename__ = "position_index"
    id, game_id (FK, indexed), half_move,
    zobrist_hash (Integer, indexed)    — for exact position search
    fen (String)                       — FEN at this position
    pawn_sig (String, indexed)         — pawn signature for structure search
                                         e.g. "w:a2,b2,d4|b:c6,d5,e6,f7"
```

Update `backend/models/__init__.py` to export all new models.

### 3B: PGN Service

Create `backend/services/pgn_service.py`. Pure functions, no DB, no FastAPI.

```python
def parse_single_pgn(pgn_text: str) -> dict:
    """Parse a single PGN game. Preserves full PGN for storage.

    Returns:
        headers: dict of PGN headers
        moves_san: list[str] — mainline SAN moves (for viewer)
        moves_uci: list[str] — mainline UCI moves
        fens: list[str] — FEN after each mainline move
        comments: list[str|None] — PGN comment after each move (if any)
        zobrist_hashes: list[int] — Zobrist hash at each position
        pawn_sigs: list[str] — pawn signature at each position
        move_count: int — ply count
        has_variations: bool — whether PGN contains variation branches
        error: str | None
    """

def parse_multi_pgn(pgn_text: str) -> list[dict]:
    """Parse multiple PGN games. Skips bad games with error."""

def extract_auto_tags(headers: dict) -> list[str]:
    """ECO code, opening name, player names. Skips '?' values."""

def get_fen_at_move(pgn_text: str, half_move: int) -> str:
    """Get FEN at a specific ply index."""
```

### 3C: Indexing Service

Create `backend/services/index_service.py`:

```python
def compute_position_index(pgn_text: str) -> list[dict]:
    """For each position in a game's mainline, compute index data.
    Returns list of:
        { half_move, fen, zobrist_hash, pawn_sig }
    """

def compute_zobrist(fen: str) -> int:
    """Zobrist hash for exact position lookup.
    Uses chess.polyglot.zobrist_hash."""

def compute_pawn_sig(fen: str) -> str:
    """Pawn signature string for structure search.

    Extracts pawn positions from FEN, returns sorted signature:
        "w:a2,b2,d4,f2,g2,h2|b:a7,b7,c6,d5,e6,f7,g7,h7"

    This enables:
    - Exact pawn match: string equality
    - Subset match: 'does Black section contain c6,d5,e6?'
    - Pattern match: 'isolated d-pawn' = d4 present, no c/e pawns
    """
```

### 3D: Tests

Create `test_games.py`:
- parse_single_pgn: valid PGN, invalid PGN
- parse_multi_pgn: 3 games, 2 valid + 1 invalid
- extract_auto_tags: with headers, with "?" values
- get_fen_at_move: moves 0, 1, 5, last
- compute_zobrist: consistent hash, same position via different move orders gives same hash, different positions give different hashes
- compute_pawn_sig: returns correct format string
- compute_pawn_sig: same pawns with different pieces gives same signature
- compute_pawn_sig: different pawn positions gives different signature
- compute_pawn_sig: subset check works ("does sig contain c6,d5,e6 for Black?")
- compute_position_index: correct count, hash at move 0 matches start position

### Checkpoint 3
```bash
python test.py          # All 19 original tests pass
python test_games.py    # All new tests pass
```

---

## Phase 4: Game API Endpoints

**Goal**: Full CRUD for games, collections, bulk import, position search. No frontend yet — all testable via test script.

### 4A: Schemas

Create `backend/api/game_schemas.py` with: GameCreate, BulkPGNImport, BulkPGNImportResult, GameBrief, GameDetail (includes moves_san, fens), GameUpdate, CollectionCreate, CollectionOut, CollectionDetail, PositionSearchResult, PositionSearchRequest.

### 4B: Game API Routes (`backend/api/games.py`)

```
POST   /api/games/                  — Create single game
POST   /api/games/import            — Bulk import (parse, auto-tag, index hashes)
GET    /api/games/                  — List (filter: ?tag, ?collection_id, ?search, ?eco)
GET    /api/games/{id}              — Full detail with moves_san + fens
PUT    /api/games/{id}              — Update tags/collections
DELETE /api/games/{id}              — Delete game + position index entries
POST   /api/games/search-position   — Zobrist lookup: find games containing a position
```

**Import flow**: Parse PGN -> extract auto-tags -> merge with user tags -> create Game -> compute position hashes -> bulk insert PositionIndex rows -> return result.

**Position search flow**: Receive FEN -> compute Zobrist (or pawn hash) -> query PositionIndex -> join with Games -> return matches with move numbers.

### 4C: Collection API Routes (`backend/api/collections.py`)

```
POST   /api/collections/
GET    /api/collections/
GET    /api/collections/{id}
PUT    /api/collections/{id}
DELETE /api/collections/{id}
POST   /api/collections/{id}/games
DELETE /api/collections/{id}/games/{game_id}
```

### 4D: Wire up in __init__.py and main.py

### 4E: Tests (append to test_games.py)

Game CRUD, bulk import, position search (exact + pawn structure), collections CRUD, collection membership, cascade behavior.

### Checkpoint 4
```bash
python test.py           # 19 original tests pass
python test_games.py     # All game/collection/search tests pass
```

---

## Phase 5: Game Viewer Frontend

**Goal**: Browse games, replay move-by-move, keyboard navigation.

**Why this is separate from Phase 6 (engine/play)**: The viewer is the core study experience and should be solid before layering interactivity on top. Engine toggle and play-vs-engine are enhancements to an already-working viewer, not part of its foundation.

### 5A: Games List View (new nav tab)

Add "Games" to the nav in index.html. Create `frontend/js/games.js`:

- Game list: White vs Black, Result, Opening (ECO), tag chips
- Tag filter bar (reuse pattern from positions via shared.js)
- Collection dropdown filter
- Search box (searches White, Black, Event, Opening)
- Click game -> opens game viewer

### 5B: Game Viewer

Two-column layout (board left, panel right), same pattern as position detail:

- **Left**: BoardManager in display mode, showing current position
- **Right panel, top**: Game metadata (White, Black, Event, Result, ECO/Opening, Date)
- **Right panel, middle**: Move list in two-column notation format
  - Move# | White move | Black move
  - Current move highlighted with CSS class
  - Click any move -> board jumps to that position
  - Auto-scroll to keep current move visible
  - **PGN comments displayed inline** as gray/muted text between moves
  - **Variations shown as collapsed badges** — if a move has alternative
    lines in the PGN, show a small indicator like "(+2 variations)" or
    render the first move of each variation in muted text:
    `(7...Nf6)`. These are NOT clickable in Phase 5 — just visible so the
    user knows the PGN contains more than the mainline.
  - Do NOT build variation tree navigation in this phase.
- **Right panel, bottom**: Tags

**Navigation**:
- Arrow keys: left = back one ply, right = forward one ply
- Home = starting position, End = final position
- Buttons: |< < > >| (start, back, forward, end)
- Navigation follows mainline only in this phase

**Implementation**:
- On game load: fetch GameDetail from API, store `fens[]` and `moves_san[]`
- Also store `comments[]` (per-move comments from PGN, null if none)
- Also store `variation_starts[]` (list of first moves of variations at each
  ply, for rendering collapsed badges — extracted by the PGN parser)
- Track `currentPly` (0 = starting position)
- All navigation updates `currentPly` -> `BoardManager.setPosition(boardId, fens[currentPly])`
- Highlight current move in list, scroll into view

### 5C: Import UI

Add import functionality accessible from Games view:

- Large textarea: "Paste PGN (one or more games)"
- File upload button: reads .pgn file client-side -> fills textarea
- Tags field: comma-separated, applied to all imported games
- Collection: dropdown of existing collections + "Create new" option
- Import button -> POST /api/games/import
- Results: "Imported X games (Y failed)" with expandable errors
- After import: navigate to Games list showing new games

### 5D: Save Position from Game

Button in game viewer: "Save Position"
- Opens modal/panel pre-filled with:
  - FEN: current board position (from fens[currentPly])
  - Title: auto-generated (e.g. "Player1 vs Player2 — after 12. Qd2")
  - Tags: pre-filled from game's tags
  - Notes: empty, cursor focused for user to type
- Save -> POST /api/positions/ (existing endpoint)
- Toast confirmation, stays in game viewer

### Checkpoint 5
```
Manual testing:
- [ ] Games tab appears in nav
- [ ] Game list loads, shows games with metadata
- [ ] Tag filter, collection filter, search all work
- [ ] Click game -> viewer opens
- [ ] Board shows correct position
- [ ] Move list renders in two-column format
- [ ] Click move -> board jumps to that position
- [ ] Arrow keys navigate forward/back
- [ ] Home/End jump to start/end
- [ ] Nav buttons work
- [ ] Current move highlighted and scrolled into view
- [ ] PGN paste import works (single and multi-game)
- [ ] File upload import works
- [ ] Tags applied to imported games
- [ ] Collection assignment works during import
- [ ] "Save Position" from viewer creates a position
- [ ] Saved position appears in Positions tab
- [ ] All existing position/quiz functionality still works
- [ ] python test.py passes
- [ ] No JS file exceeds 300 lines
```

---

## Phase 6: Opening Tree Explorer

**Goal**: From any position, see all moves in your database with win/loss/draw statistics.

**Why this comes before engine/collections**: The opening tree is how you actually explore your database — "I have 47 Smith-Morra games, what does Black usually play after 5. Nf3?" This is more fundamental to study than engine eval or batch review. It informs what positions to save and what lines to study.

### 6A: Backend

```
GET /api/opening-tree?fen=...
```
- Compute Zobrist hash for input FEN
- Find all PositionIndex entries with that hash
- For each match, look at the next move (half_move + 1) in that game
- Aggregate: for each distinct next move, count games, white wins, draws, black wins
- Return sorted by game count descending

### 6B: Frontend

Panel alongside game viewer (or toggleable overlay):
- Table: Move | Games | White% | Draw% | Black% | bar chart
- Click a move -> board advances to that position, tree recalculates
- Navigate your entire database move-by-move, seeing statistics at each step
- "Use current board" button to query from any position in the viewer

### Checkpoint 6
```
- [ ] Opening tree shows correct statistics for current position
- [ ] Click move advances board and recalculates tree
- [ ] Works with manually entered FEN
- [ ] Works alongside game viewer (show tree for current viewer position)
- [ ] Performance acceptable with 100+ games
- [ ] python test.py passes
```

---

## Phase 7: Engine Integration + Play vs Engine

**Goal**: Engine eval during game review, and play-vs-engine from any position.

**Why after opening tree**: The game viewer and opening tree should work solidly without the engine. Engine adds complexity (async WASM communication, UI for eval display, board mode switching). Layering it on a stable viewer is cleaner.

### 7A: Engine Toggle in Game Viewer

- Button: "Engine: OFF" / "Engine: ON"
- When ON:
  - Stockfish WASM evaluates current position
  - Display: eval score ("+0.35" or "M3") + best line in SAN
  - Eval bar: vertical bar beside board showing advantage visually
  - Updates on every move navigation (debounced — don't fire on rapid arrow-key scrolling)
- When OFF: no eval, faster navigation

### 7B: Play vs Engine

- Button in game viewer or position detail: "Play from here"
- Switches board to Play mode (BoardManager with draggable + legal moves via chess.js)
- After user makes a move:
  - Send position to Stockfish WASM
  - Stockfish returns best move
  - Apply move to board via chess.js + BoardManager
  - Continue until game over or user stops
- "Stop playing" -> return to viewer/detail mode
- "Reset" -> return to position where play started

### 7C: Position Detail Enhancement

- In existing position detail view, add "Play from here" button (same as 7B)
- Add engine toggle to position detail view (same as 7A)

### Checkpoint 7
```
- [ ] Engine toggle ON shows eval + best line in game viewer
- [ ] Eval updates on move navigation (not on rapid scrolling)
- [ ] Eval bar renders correctly
- [ ] Engine toggle OFF hides eval
- [ ] "Play from here" in game viewer: legal moves only, engine responds
- [ ] "Play from here" in position detail: same behavior
- [ ] "Stop" returns to viewer mode
- [ ] "Reset" returns to starting position of the play session
- [ ] python test.py passes
```

---

## Phase 8: Variation Tree Navigation

**Goal**: Enable clicking into PGN variations and navigating sub-lines. Upgrades the collapsed variation badges from Phase 5 into an interactive tree.

**Why now**: Variations were visible-but-inert since Phase 5. The opening tree (Phase 6) established position-based navigation. Now we add move-tree navigation — a different but complementary concept. This must come before the repertoire builder (Phase 10), which is fundamentally a variation tree editor.

**Reference implementations to study before building**:
- Lichess PGN viewer (GPL, chessground-based — study the UX, not the code)
- mliebelt/pgn-viewer (supports forward/back including variations)

### 8A: PGN Tree Data Structure

python-chess already parses variations via `chess.pgn.read_game()`. Each `GameNode`
has a `variations` list (alternative moves from that position). The API should
return a tree structure, not just a flat move list:

```python
# GameDetail response now includes:
{
  "move_tree": {
    "san": "e4",
    "fen": "...",
    "comment": "Best by test",
    "variations": [
      {
        "san": "d4",
        "fen": "...",
        "comment": "Also good",
        "children": [...]
      }
    ],
    "children": [
      {
        "san": "c5",
        "fen": "...",
        "children": [...]
      }
    ]
  }
}
```

The flat `moves_san[]` and `fens[]` remain available for mainline-only navigation.

### 8B: Tree-Aware Move List UI

Upgrade the move list from Phase 5:
- Mainline moves displayed as before (two-column: move# | White | Black)
- Variations rendered as indented sub-lines below the branching point
- Current node highlighted regardless of depth
- Click any node (mainline or variation) -> board shows that position
- Visual indicators: indentation, lighter text for sub-variations, bracket markers

### 8C: Tree Navigation

- Arrow keys navigate within current line (mainline or variation)
- Entering a variation: click a variation move, or press a key (e.g. "V" or down arrow)
- Exiting a variation: "back to mainline" button, or navigate past the end of the sub-line
- Track navigation state: current node in tree, breadcrumb of parent nodes

### Checkpoint 8
```
- [ ] Variations render as indented sub-lines in move list
- [ ] Click variation move -> board shows that position
- [ ] Can navigate within a variation with arrow keys
- [ ] Can return to mainline
- [ ] Nested variations work (variation within a variation)
- [ ] Current position highlighted correctly at any depth
- [ ] Engine eval (if on) works at variation positions
- [ ] python test.py passes
```

---

## Phase 9: Collection Browser + Batch Review + Position Search UI

**Goal**: Full collection management, batch study flow, and searchable position lookup.

### 8A: Collection Browser

Create `frontend/js/collections.js`. New nav tab or sub-section under Games:

- List of collections: name, description, game count
- Click collection -> shows game list filtered to that collection
- Edit name/description inline
- Create new collection (name + description)
- Delete collection (confirmation dialog, games not deleted)

### 8B: Batch Review Mode

From collection view, button: "Start Review"
- Game viewer with batch navigation:
  - "← Previous Game" / "Next Game →" buttons
  - Progress: "Game 3 of 47"
  - Arrow keys still navigate moves within current game
  - Shift+← / Shift+→ for previous/next game
- Each game starts at move 0
- Optional: configurable starting move number (for opening study: start at move 8)

### 8C: Position Search UI

Search panel (accessible from nav or from within game viewer):
- Input: FEN string, OR "Use current board" button
- Toggle: "Exact position" vs "Pawn structure"
- For pawn structure: input specific pawn squares to search for
  (e.g. "Black pawns on c6, d5, e6") rather than a tolerance slider
- Search scope: "All games" or "Current collection"
- Results: list of matching games with move number where match occurs
- Click result -> opens game viewer at that specific move

### Checkpoint 8
```
- [ ] Collection list with counts, create, edit, delete
- [ ] Batch review: navigate between games in collection
- [ ] Progress indicator correct
- [ ] Shift+arrow switches games
- [ ] Position search (exact): finds matching games
- [ ] Position search (pawn structure): finds games with specified pawn config
- [ ] Click search result opens game at correct move
- [ ] python test.py passes
```

### 8B: Frontend

Panel alongside game viewer or standalone:
- Table: Move | Games | White% | Draw% | Black% | bar chart
- Click move -> board advances, tree recalculates for new position
- Navigate through your entire database move by move

### Checkpoint 8
```
- [ ] Opening tree shows correct statistics
- [ ] Click move advances board and recalculates
- [ ] Works with manually entered FEN
- [ ] Performance acceptable with 100+ games
```

---

## Phase 10: Repertoire Builder + Trainer

**Goal**: Define your opening repertoire as a move tree and train it with spaced repetition.

### 9A: Repertoire Model
- A repertoire is a tree of moves for one color (White or Black)
- Stored as PGN with variations, or as a tree structure in DB
- Each node: position FEN, your chosen move, alternative moves, notes

### 9B: Repertoire Trainer
- Quiz mode: shows position from repertoire, you play the move (drag-and-drop)
- Correct -> advance; Wrong -> show correct move + comparison
- Spaced repetition: missed positions return sooner
- Leverages existing quiz_attempts infrastructure

---

## Phase 11: Game Auto-Annotation + Eval Graph

### 10A: Auto-Annotation
- Run Stockfish WASM through every move of a game
- Compare engine eval to played move eval
- Flag: blunders (> 1.0 drop), mistakes (> 0.5), inaccuracies (> 0.2)
- Store as annotations on the game

### 10B: Evaluation Graph
- Chart: eval (y-axis) vs move number (x-axis)
- Positive = white advantage, negative = black
- Click point -> board jumps to that move
- Blunders/mistakes marked with colored dots

---

## Build Order Summary

| Phase | What | Depends On |
|-------|------|------------|
| 1 | Frontend split + board abstraction + AppState | None |
| 2 | Interactive board (cm-chessboard + chess.js) | Phase 1 |
| 3 | Game models + PGN service + Zobrist + pawn signatures | None (backend) |
| 4 | Game/Collection API + position search | Phase 3 |
| 5 | Game viewer + import + save-position (mainline + comments + collapsed variations) | Phase 2 + 4 |
| 6 | Opening tree explorer | Phase 4 + 5 |
| 7 | Engine integration + play vs engine | Phase 5 |
| 8 | Variation tree navigation (clickable sub-lines) | Phase 5 |
| 9 | Collection browser + batch review + search UI | Phase 5 |
| 10 | Repertoire builder + trainer | Phase 6 + 8 |
| 11 | Auto-annotation + eval graph | Phase 7 |

**Phases 1+2 can run in parallel with 3+4** (frontend vs backend).

**After every phase**: `python test.py` must pass.

---

## Test PGN Data

### Valid multi-game PGN:

```
[Event "Smith-Morra Gambit"]
[Site "Chess.com"]
[Date "2024.01.15"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]
[ECO "B21"]
[Opening "Sicilian Defense: Smith-Morra Gambit"]

1. e4 c5 2. d4 cxd4 3. c3 dxc3 4. Nxc3 Nc6 5. Nf3 d6 6. Bc4 e6 7. O-O Nf6 8. Qe2 Be7 9. Rd1 e5 10. Be3 O-O 11. Rac1 Bg4 12. Nd5 Bxf3 13. gxf3 Nxd5 14. Bxd5 Rc8 15. Bb6 Qd7 16. Rxc6 1-0

[Event "Another Smith-Morra"]
[Site "Lichess"]
[Date "2024.03.10"]
[White "Player3"]
[Black "Player4"]
[Result "0-1"]
[ECO "B21"]
[Opening "Sicilian Defense: Smith-Morra Gambit"]

1. e4 c5 2. d4 cxd4 3. c3 dxc3 4. Nxc3 Nc6 5. Nf3 e6 6. Bc4 a6 7. O-O Nge7 8. Bg5 h6 9. Be3 Ng6 10. Bb3 Be7 11. Qd2 O-O 12. Rad1 b5 13. f4 Bb7 14. f5 exf5 15. exf5 Nge5 16. Nxe5 Nxe5 17. Qf2 Nc4 0-1

[Event "Elephant Gambit"]
[Site "Online"]
[Date "2024.05.20"]
[White "Opponent"]
[Black "Ashish"]
[Result "0-1"]
[ECO "C40"]
[Opening "Elephant Gambit"]

1. e4 e5 2. Nf3 d5 3. exd5 Bd6 4. d4 e4 5. Ne5 Nf6 6. Bc4 O-O 7. O-O Bxe5 8. dxe5 Nxd5 9. Qh5 Nc6 10. Bxd5 Qxd5 11. Nc3 Qxe5 0-1
```

### Bad PGN (error handling):
```
[Event "Broken"]
[White "???"]

1. e4 zzz99 2. garbage_move LOL
```
