# Opening Repertoire System Spec

Status: **FUTURE** — design reference for later implementation.

## Goal

Build a personal opening repertoire system where you define your moves
for one side (White or Black), map out the opponent responses you need
to prepare for, annotate every position, and practice against an engine
that plays the most common opponent responses weighted by probability.

---

## Core Concepts

### Repertoire

A repertoire is a tree of moves for ONE side (White or Black). You might
have one White repertoire and one Black repertoire, or multiple (e.g. a
main-line White repertoire and an aggressive one for blitz).

### Move types

At each position in the tree:
- **Your move** (one per position): the move YOU play. This is what you
  need to memorize.
- **Opponent responses** (multiple per position): the moves your opponent
  might play. Each has a weight/probability. You need to know your
  answer to each of these.

### Tree structure

```
Repertoire: "White Main"
Side: white

1. e4          ← your move (white)
├── 1...e5     ← opponent response (weight: 40%)
│   └── 2. Nf3         ← your move
│       ├── 2...Nc6     ← opponent response (weight: 60%)
│       │   └── 3. Bb5          ← your move
│       │       ├── 3...a6      ← opponent (weight: 70%)
│       │       │   └── 4. Ba4  ← your move
│       │       └── 3...Nf6     ← opponent (weight: 30%)
│       │           └── 4. O-O  ← your move
│       └── 2...Nf6     ← opponent response (weight: 30%)
│           └── 3. Nxe5         ← your move
├── 1...c5     ← opponent response (weight: 35%)
│   └── 2. Nf3         ← your move
│       └── ...
└── 1...e6     ← opponent response (weight: 15%)
    └── (not yet prepared — gap in repertoire)
```

---

## Data Model

### New table: `repertoires`

```sql
CREATE TABLE repertoires (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    side TEXT NOT NULL CHECK(side IN ('white', 'black')),
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### New table: `repertoire_moves`

```sql
CREATE TABLE repertoire_moves (
    id INTEGER PRIMARY KEY,
    repertoire_id INTEGER NOT NULL REFERENCES repertoires(id) ON DELETE CASCADE,
    fen_key TEXT NOT NULL,
    move_san TEXT NOT NULL,
    move_uci TEXT NOT NULL,
    move_type TEXT NOT NULL CHECK(move_type IN ('mine', 'opponent')),
    weight REAL DEFAULT 1.0,
    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repertoire_id, fen_key, move_san)
);
CREATE INDEX idx_rep_moves_fen ON repertoire_moves(repertoire_id, fen_key);
```

**Fields:**
- `fen_key`: normalized FEN (board + side to move), same as annotations
- `move_san`: the move in standard algebraic ("Nf3", "e4")
- `move_uci`: the move in UCI ("g1f3", "e2e4") — needed for engine play
- `move_type`: "mine" = your repertoire move, "opponent" = a response
  you're preparing against
- `weight`: probability weight for opponent moves (used in practice).
  Default 1.0. Higher = more likely to be chosen during drills.
  Weights are relative within a position (they don't need to sum to 100).
- `sort_order`: display order for multiple opponent responses
- `notes`: per-move notes (in addition to per-position annotations).
  "Why I chose this move" vs "what I notice about this position"

### Relationship to existing tables

- `fen_annotations` — position notes apply globally, including to
  repertoire positions. No change needed.
- `positions` (tabiyas/tactics) — a tabiya could be linked to a
  repertoire node, but this is optional. For v1, they're separate.
- `games` / `position_index` — used for "which of my games reached
  this position?" lookup. Already built.

---

## Backend API

### Repertoire CRUD

```
POST   /api/repertoires/                    — create repertoire
GET    /api/repertoires/                    — list all repertoires
GET    /api/repertoires/{id}               — get repertoire details
PUT    /api/repertoires/{id}               — update name/description
DELETE /api/repertoires/{id}               — delete repertoire + all moves
```

### Repertoire moves

```
GET    /api/repertoires/{id}/moves?fen=... — get all moves from a position
POST   /api/repertoires/{id}/moves         — add a move at a position
PUT    /api/repertoires/{id}/moves/{move_id} — update weight/notes
DELETE /api/repertoires/{id}/moves/{move_id} — remove a move
```

### Tree operations

```
GET    /api/repertoires/{id}/tree          — full tree (for visualization)
GET    /api/repertoires/{id}/coverage      — coverage report (gaps)
GET    /api/repertoires/{id}/drill         — get a random line to practice
POST   /api/repertoires/{id}/drill/result  — report drill result (for
                                              spaced repetition)
```

### Practice endpoint

```
POST   /api/repertoires/{id}/opponent-move
  body: { "fen": "current position" }
  response: { "move_san": "Nc6", "move_uci": "b8c6", "weight": 0.6 }
```

Picks an opponent response from the repertoire weighted by probability.
If no repertoire move exists for this position, falls back to engine.

---

## Weighted Opponent Selection (Practice Mode)

When practicing your repertoire, the engine should play the opponent's
moves from your repertoire, weighted by the probabilities you assign.

### Algorithm

```python
def pick_opponent_move(repertoire_id, fen_key):
    """Pick an opponent move weighted by probability."""
    moves = get_moves(repertoire_id, fen_key, move_type='opponent')
    if not moves:
        return None  # fall back to Stockfish

    # Normalize weights to probabilities
    total = sum(m.weight for m in moves)
    r = random.random() * total
    cumulative = 0
    for m in moves:
        cumulative += m.weight
        if r <= cumulative:
            return m

    return moves[-1]  # safety fallback
```

### Practice flow

1. System picks a starting position from the repertoire (or starts
   from the initial position)
2. If it's YOUR turn: you make a move. System checks if it matches
   your repertoire move. If wrong, shows the correct move.
3. If it's OPPONENT's turn: system picks from opponent responses
   weighted by probability. If no repertoire moves exist for this
   position, falls back to Stockfish at a configured level.
4. Continue until the line ends (no more repertoire moves) or you
   make a mistake.
5. Track results for spaced repetition.

### Weight guidelines for users

Suggest these defaults in the UI:
- Very common response: weight 5
- Common response: weight 3
- Occasional response: weight 1
- Rare but important: weight 0.5

Or let users enter percentages and convert internally.

---

## Frontend

### Repertoire Explorer View

A new view (or extension of the existing opening tree view):

```
┌──────────────────────────────────────────────────┐
│  My White Repertoire                    [Edit] [Drill] │
├──────────────┬───────────────────────────────────┤
│              │  From this position:              │
│              │                                   │
│   Board      │  YOUR MOVE:                       │
│              │  ● 2. Nf3  [edit] [delete]        │
│              │                                   │
│              │  OPPONENT RESPONSES:               │
│              │  ○ 2...Nc6  (60%)  [edit] [delete]│
│              │  ○ 2...Nf6  (30%)  [edit] [delete]│
│              │  ○ 2...d6   (10%)  [edit] [delete]│
│              │  [+ Add opponent response]         │
│              │                                   │
│              │  Position notes:                   │
│              │  ┌────────────────────────────┐   │
│              │  │ Main line Ruy Lopez. Key   │   │
│              │  │ idea is to maintain tension │   │
│              │  └────────────────────────────┘   │
│              │                                   │
│              │  Games reaching this position: 12  │
├──────────────┴───────────────────────────────────┤
│  Move tree (collapsible):                         │
│  1. e4 ─ 1...e5 ─ 2. Nf3 ─ 2...Nc6 ─ 3. Bb5    │
│                  └ 2...Nf6 ─ 3. Nxe5             │
│       └ 1...c5 ─ 2. Nf3 ─ ...                    │
│       └ 1...e6 ─ ⚠ NOT PREPARED                  │
└──────────────────────────────────────────────────┘
```

### Adding moves

Two interaction models:

1. **Click to add**: Make a move on the board (drag piece). System asks
   "Add this as your move or as an opponent response?" Save it.

2. **Import from game**: Open a game from your database, click "Add to
   repertoire" at any point. System adds the move to your repertoire
   tree at that position.

### Coverage view

Shows which lines are complete vs gaps:

```
White Repertoire Coverage:
✓ 1. e4 e5 — prepared to depth 12
✓ 1. e4 c5 — prepared to depth 8
⚠ 1. e4 e6 — only prepared to depth 3
✗ 1. e4 d5 — not prepared at all
✗ 1. e4 c6 — not prepared at all
```

"Depth" = how many half-moves deep your repertoire goes in that line.

### Drill mode

1. User clicks "Drill" on a repertoire
2. System picks a random line (weighted toward lines the user gets
   wrong more often, if spaced repetition is implemented)
3. Board shows a position from the repertoire
4. If it's your turn: you must play your repertoire move
5. If correct: opponent plays a weighted random response
6. If wrong: board highlights the correct move, adds to "review" pile
7. Continue until end of line or mistake
8. Show score: "8/10 moves correct"

---

## Spaced Repetition (optional, v2)

### New table: `drill_results`

```sql
CREATE TABLE drill_results (
    id INTEGER PRIMARY KEY,
    repertoire_id INTEGER NOT NULL REFERENCES repertoires(id),
    fen_key TEXT NOT NULL,
    move_san TEXT NOT NULL,
    correct BOOLEAN NOT NULL,
    drilled_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Use a simple SM-2 style algorithm:
- Moves you get right → drill less often
- Moves you get wrong → drill more often
- New/undrilled moves → prioritize

This makes the drill feature progressively harder and focuses practice
on your weak spots.

---

## Integration with Existing Features

### Position annotations

Already built. Annotations are global by FEN. When you're in the
repertoire explorer and navigate to a position, your annotations appear
automatically.

### Game search

Already built. "Which of my games reached this position?" is already
available via the position search endpoint. The repertoire explorer
could show a "Games: 12" link that opens the search results.

### Engine analysis

Already built. Show Stockfish eval alongside repertoire moves so you
can verify your choices are sound.

### Practice mode

Currently plays against Stockfish with random moves. The repertoire
practice mode replaces Stockfish's move selection with weighted
repertoire moves — Stockfish only kicks in when the position leaves
your repertoire.

---

## Implementation Order

### Phase 1: Data model + CRUD (1-2 days)
- Create tables and migration
- Repertoire CRUD endpoints
- Move CRUD endpoints
- Basic repertoire explorer view (board + move list)

### Phase 2: Tree building (1-2 days)
- Add moves by making them on the board
- Import moves from existing games
- Tree visualization (collapsible move tree)
- Coverage report

### Phase 3: Repertoire practice (2-3 days)
- Weighted opponent move selection
- Drill mode with scoring
- "Wrong move" feedback with correct move highlight
- Practice statistics

### Phase 4: Spaced repetition (1-2 days)
- Drill results tracking
- SM-2 scheduling
- Priority queue for drills
- Progress dashboard

### Phase 5: PGN variation import/export (1-2 days)
- Parse PGN with nested variations into repertoire tree
- Export repertoire as PGN with variations
- Import from Lichess Studies / ChessBase exported PGNs

### Phase 6: Polish and adoption features (1-2 days)
- Move evaluation markers (!, !!, ?, ?!, =)
- Model game references per move
- Opponent preparation filters

Total estimated scope: 8-13 days of focused work.

---

## PGN Variation Import

### How variation PGN differs from game PGN

A normal game PGN is a flat sequence of moves:

```
1. e4 e5 2. Nf3 Nc6 3. Bb5 a6
```

A repertoire PGN has nested branches using parentheses:

```
1. e4 e5 (1... c5 2. Nf3 d6 (2... Nc6 3. d4) 3. d4) 2. Nf3 Nc6
(2... Nf6 3. Nxe5) 3. Bb5
```

This encodes: after 1. e4, the main line is 1...e5, but there's a side
branch for 1...c5 (with its own sub-branches). After 2. Nf3, the main
line is 2...Nc6, but there's a side branch for 2...Nf6.

### Parsing algorithm

```
function parsePgnVariations(pgn):
    tokens = tokenize(pgn)  // split into moves, '(', ')', comments
    root = { fen: STARTING_FEN, children: [] }
    stack = [root]  // stack of branch points

    for token in tokens:
        if token == '(':
            // Start a variation: push current position onto stack
            // Next moves branch from the PARENT of the last move
            stack.push(currentNode.parent)
        elif token == ')':
            // End variation: pop back to the branch point
            stack.pop()
        elif token is a move:
            parent = stack[top]
            newFen = apply(parent.fen, token)
            child = { fen: newFen, move: token, children: [] }
            parent.children.append(child)
            currentNode = child
        elif token is a comment { ... }:
            currentNode.notes = token
```

### Import flow

1. User pastes or uploads a PGN with variations
2. Backend parses the variation tree
3. User selects which side they're playing (White or Black)
4. System walks the tree:
   - Moves on YOUR side → saved as `move_type: 'mine'`
   - Moves on OPPONENT's side → saved as `move_type: 'opponent'`
   - If multiple moves exist for your side at the same position,
     the first (main line) is marked as 'mine', others are flagged
     for user review
5. Default weights assigned to opponent moves based on tree order:
   main line = weight 5, first variation = weight 3,
   subsequent variations = weight 1
6. User can adjust weights after import

### Export flow

Walk the repertoire tree depth-first. Main line (highest-weight
opponent response at each branch) goes in the main line. Lower-weight
responses go in parenthesized variations. Include annotations as
PGN comments { ... }.

### Existing PGN parser

The current game import parser (`backend/api/import_service.py`) handles
single-game PGN without variations. It uses `python-chess` which
supports `chess.pgn.read_game()` — this DOES parse variations natively.
The variation tree is accessible via `game.variations` and
`node.variations` on each move node. So the hard parsing work is
already done by the library.

The import service just needs to:
1. Use `chess.pgn.read_game()` (already used)
2. Walk `node.variations` recursively instead of only following the
   main line
3. Build repertoire_moves records from each node

---

## Transposition Handling

### Data level (already solved)

Because `repertoire_moves.fen_key` uses normalized FEN (board + side to
move), transpositions are automatically recognized. If the Sicilian
Najdorf position is reached via 1.e4 c5 2.Nf3 d6 3.d4 OR via
1.Nf3 c5 2.e4 d6 3.d4, both share the same `fen_key`. Any repertoire
move stored for that position applies regardless of move order.

### Tree display

The tree visualization needs to show transposition links:

```
1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6
                                                  ↑
1. Nf3 c5 2. e4 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6
    (transposition — same position, same repertoire moves apply)
```

Implementation: when building the tree view, check if a position's
`fen_key` appears elsewhere in the tree. If so, show a "↗ transposition"
link instead of duplicating the subtree. Clicking the link jumps to the
canonical location.

### Drill implications

During drills, the system should recognize when a transposition leads
to a position already in the repertoire and continue the drill from
there. This means drills can cross branch boundaries — which is
actually what happens in real games.

---

## Move Evaluation Markers

Standard chess annotation symbols stored as an optional field on
`repertoire_moves`:

```sql
ALTER TABLE repertoire_moves ADD COLUMN eval_marker TEXT;
```

Valid values: `!`, `!!`, `?`, `??`, `?!`, `!?`, `=`, `+=`, `=+`, `+-`, `-+`

Displayed as small colored badges next to moves in the tree:
- `!` / `!!` — green
- `?` / `??` — red
- `?!` / `!?` — orange
- `=` and eval symbols — grey

---

## Model Game References

Link a reference game to a repertoire move — "I play 3.Bb5 here,
study Caruana-Carlsen 2018."

```sql
CREATE TABLE repertoire_game_refs (
    id INTEGER PRIMARY KEY,
    repertoire_move_id INTEGER NOT NULL REFERENCES repertoire_moves(id),
    game_id INTEGER REFERENCES games(id),
    external_url TEXT,
    label TEXT,
    UNIQUE(repertoire_move_id, game_id)
);
```

A reference can be either a game in your local database (`game_id`) or
an external link (`external_url`) to a Lichess/Chess.com game. The
`label` field is for display ("Caruana-Carlsen, Candidates 2018").

---

## Opponent Preparation

Filter your game database by player name to see what openings they play:

```
GET /api/games/?search=Carlsen&color=black
```

Returns all games where "Carlsen" played Black. The existing position
index lets you then see: "Carlsen plays 1...e5 (40%), 1...c5 (35%),
1...e6 (15%)." You can then set your repertoire weights to match.

This is mostly a UI feature — a "Prepare for opponent" view that:
1. Lets you search games by player name
2. Shows their opening distribution
3. Lets you one-click set repertoire weights to match their preferences

---

## Files to create

- `backend/models/repertoire_models.py`
- `backend/api/repertoires.py`
- `backend/services/pgn_variation_parser.py`
- `frontend/js/repertoire-explorer.js`
- `frontend/js/repertoire-drill.js`
- `frontend/js/repertoire-import.js`
- `frontend/css/repertoire.css`

## Files to modify

- `backend/database.py` — migration
- `backend/api/__init__.py` — register router
- `backend/main.py` — include router
- `frontend/index.html` — new views, nav item
- `frontend/js/shared.js` — new routes
- `frontend/js/router.js` — new routes
- `frontend/js/practice.js` — integrate weighted opponent selection
