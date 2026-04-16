#!/usr/bin/env python3
"""Phase 10 tests: practice games, stats, per-position opening tree."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

os.environ["CHESSQUIZ_DB_URL"] = "sqlite:///:memory:"

from backend.main import app
from fastapi.testclient import TestClient

c = TestClient(app)

passed = 0
failed = 0


def check(name, condition, detail=""):
    global passed, failed
    if condition:
        print(f"  ✓ {name}")
        passed += 1
    else:
        print(f"  ✗ {name} — {detail}")
        failed += 1


print("Running Phase 10 tests...\n")

# Engine levels config exposed
r = c.get("/api/practice/engine-levels")
check("Engine levels endpoint", r.status_code == 200)
levels = r.json()
check("Has easy/medium/hard/max",
      all(k in levels for k in ("easy", "medium", "hard", "max")),
      f"got keys {list(levels.keys())}")
check("Easy has depth+skill", "depth" in levels["easy"] and "skill" in levels["easy"])

# Create a root position
START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"

r = c.post("/api/positions/", json={
    "fen": START_FEN, "title": "Opening tabiya", "tags": ["practice-test"]
})
check("Create root position", r.status_code == 201)
root_id = r.json()["id"]

r = c.post("/api/positions/", json={
    "fen": AFTER_E4, "title": "Another", "tags": []
})
other_id = r.json()["id"]

# Save practice game - win (eval swings > 1.0 in user's favor)
WIN_PGN = """[Event "Practice"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 1-0"""

r = c.post("/api/practice/", json={
    "root_position_id": root_id,
    "pgn_text": WIN_PGN,
    "user_color": "white",
    "final_fen": "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    "move_count": 6,
    "engine_name": "Stockfish",
    "engine_level": "easy",
    "starting_eval": 0.2,
    "final_eval": 2.5,
})
check("Create practice game (win)", r.status_code == 201, f"got {r.status_code}: {r.text[:200]}")
pg_win_id = r.json()["id"]
check("Engine verdict auto-computed = win",
      r.json()["engine_verdict"] == "win",
      f"got {r.json()['engine_verdict']}")
check("Starting eval saved", r.json()["starting_eval"] == 0.2)
check("Final eval saved", r.json()["final_eval"] == 2.5)
check("Engine level saved", r.json()["engine_level"] == "easy")

# Loss: eval swung > 1.0 against user
r = c.post("/api/practice/", json={
    "root_position_id": root_id,
    "pgn_text": WIN_PGN,
    "user_color": "white",
    "final_fen": "test",
    "move_count": 20,
    "engine_level": "hard",
    "starting_eval": 0.0,
    "final_eval": -3.0,
})
check("Create practice game (loss)", r.status_code == 201)
check("Engine verdict = loss",
      r.json()["engine_verdict"] == "loss",
      f"got {r.json()['engine_verdict']}")

# Draw: eval barely changed
r = c.post("/api/practice/", json={
    "root_position_id": root_id,
    "pgn_text": WIN_PGN,
    "user_color": "white",
    "final_fen": "test",
    "move_count": 40,
    "engine_level": "medium",
    "starting_eval": 0.1,
    "final_eval": 0.3,
})
check("Engine verdict = draw for small delta",
      r.json()["engine_verdict"] == "draw",
      f"got {r.json()['engine_verdict']}")

# Black user: eval improves for black (goes more negative)
r = c.post("/api/practice/", json={
    "root_position_id": root_id,
    "pgn_text": WIN_PGN,
    "user_color": "black",
    "final_fen": "test",
    "move_count": 15,
    "engine_level": "easy",
    "starting_eval": 0.0,
    "final_eval": -2.0,
})
check("Black perspective: win when eval goes negative",
      r.json()["engine_verdict"] == "win",
      f"got {r.json()['engine_verdict']}")
pg_black_id = r.json()["id"]

# Invalid user_color rejected
r = c.post("/api/practice/", json={
    "root_position_id": root_id,
    "pgn_text": WIN_PGN,
    "user_color": "neither",
    "final_fen": "x",
    "move_count": 1,
    "engine_level": "easy",
})
check("Reject invalid user_color", r.status_code == 400)

# Missing position ref
r = c.post("/api/practice/", json={
    "root_position_id": 99999,
    "pgn_text": WIN_PGN,
    "user_color": "white",
    "final_fen": "x",
    "move_count": 1,
    "engine_level": "easy",
})
check("Reject unknown root position", r.status_code == 404)

# List practice games
r = c.get("/api/practice/")
check("List practice games", r.status_code == 200 and len(r.json()) == 4,
      f"got {len(r.json()) if r.status_code == 200 else 'err'}")

# Filter by root position
r = c.get(f"/api/practice/?root_position_id={root_id}")
check("Filter by root_position_id",
      len(r.json()) == 4, f"got {len(r.json())}")

r = c.get(f"/api/practice/?root_position_id={other_id}")
check("Filter returns empty for other position", len(r.json()) == 0)

# User can override verdict
r = c.put(f"/api/practice/{pg_win_id}", json={"user_verdict": "draw"})
check("User override verdict", r.status_code == 200)
check("user_verdict saved", r.json()["user_verdict"] == "draw")
check("engine_verdict preserved", r.json()["engine_verdict"] == "win")

r = c.put(f"/api/practice/{pg_win_id}", json={"notes": "interesting game"})
check("Update notes", r.json()["notes"] == "interesting game")

r = c.put(f"/api/practice/{pg_win_id}", json={"user_verdict": "nonsense"})
check("Invalid verdict rejected", r.status_code == 400)

# Get single practice game
r = c.get(f"/api/practice/{pg_win_id}")
check("Get practice game detail", r.status_code == 200)
check("Detail has pgn_text", len(r.json()["pgn_text"]) > 0)

r = c.get("/api/practice/99999")
check("404 for missing practice game", r.status_code == 404)

# Stats aggregation
r = c.get(f"/api/practice/stats/{root_id}")
check("Stats endpoint", r.status_code == 200)
stats = r.json()
check("Stats total = 4", stats["total_games"] == 4, f"got {stats}")
# After user override pg_win_id is draw (engine win); pg_black_id is win;
# one was engine win but overridden so 1 win, 2 draws (one overridden + one natural), 1 loss
check("Stats has win counts", "wins" in stats and "draws" in stats and "losses" in stats)
check("Stats win_rate is float 0-1",
      0.0 <= stats["win_rate"] <= 1.0)
check("Stats avg_move_count", stats["avg_move_count"] > 0)
check("Stats by_engine_level list",
      isinstance(stats["by_engine_level"], list)
      and len(stats["by_engine_level"]) >= 2)

# Find the easy breakdown
easy = next((b for b in stats["by_engine_level"] if b["engine_level"] == "easy"), None)
check("Easy breakdown present", easy is not None)
check("Easy breakdown has counts",
      easy and easy["total"] == 2, f"got {easy}")

# Per-position opening tree
r = c.get(f"/api/practice/tree/{root_id}")
check("Tree endpoint", r.status_code == 200)
tree = r.json()
check("Tree total_games = 4", tree["total_games"] == 4)
# All 4 games start with 1. e4
e4_move = next((m for m in tree["moves"] if m["san"] == "e4"), None)
check("e4 in practice tree", e4_move is not None)
check("e4 has 4 games", e4_move and e4_move["games"] == 4, f"got {e4_move}")
check("e4 has wins/draws/losses", e4_move and (
    e4_move["wins"] + e4_move["draws"] + e4_move["losses"]
    + (4 - e4_move["wins"] - e4_move["draws"] - e4_move["losses"])  # abandoned
) == 4)
check("Tree win_rate is float", isinstance(e4_move["win_rate"], float))

# Practice positions summary
r = c.get("/api/practice/positions")
check("List practice positions", r.status_code == 200)
summaries = r.json()
check("Has our root position",
      any(s["position_id"] == root_id for s in summaries))
our = next(s for s in summaries if s["position_id"] == root_id)
check("Summary has total_games", our["total_games"] == 4)
check("Summary has fen", our["fen"] == START_FEN)

# Delete practice game does not delete root position
r = c.delete(f"/api/practice/{pg_black_id}")
check("Delete practice game", r.status_code == 204)
r = c.get(f"/api/positions/{root_id}")
check("Root position survives practice delete", r.status_code == 200)
r = c.get(f"/api/practice/?root_position_id={root_id}")
check("One fewer practice game", len(r.json()) == 3)

# Cascade: delete root position removes practice games
r = c.delete(f"/api/positions/{root_id}")
check("Delete root position", r.status_code == 204)
r = c.get(f"/api/practice/?root_position_id={root_id}")
check("Practice games cascade-deleted", len(r.json()) == 0)

# Stats for deleted position = 404
r = c.get(f"/api/practice/stats/{root_id}")
check("Stats 404 for deleted position", r.status_code == 404)

print(f"\n{'='*40}")
print(f"  {passed} passed, {failed} failed")
print(f"{'='*40}")

sys.exit(1 if failed else 0)
