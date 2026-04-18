"""Bulk PGN import: atomic transaction + streaming progress.

This module centralizes the heavy lifting so both the JSON and SSE endpoints
can share a single implementation. The core (`run_import`) runs the full
import under a single transaction and emits progress via a callback.
`stream_import` wraps it in a thread + queue to produce SSE events.

Failure modes guarded against:
  - Partial import on crash: everything runs inside one transaction; we
    commit only after every game is processed. Any exception or cancel
    signal => rollback, DB untouched.
  - Long Python-side work between yields: progress is emitted at least
    every 100 games and every ~2 seconds of wall clock.
  - Cancel race: cancel flag is checked before every DB write so an
    already-committed game isn't partially indexed.
  - Thread/session safety: stream_import uses a fresh SessionLocal for
    the worker thread, independent of the request-scoped session.
"""

import threading
import time
import uuid
from typing import Callable, Iterator

from sqlalchemy.orm import Session

from backend.api.game_helpers import (
    create_game_from_parsed,
    is_duplicate_game,
)
from backend.database import SessionLocal
from backend.models import PositionIndex
from backend.services import compute_position_index, parse_multi_pgn

_CHUNK = 1000

# In-process cancel registry. Keys are job_ids; values are threading.Event.
_cancel_events: dict[str, threading.Event] = {}
_cancel_lock = threading.Lock()


def new_job_id() -> str:
    jid = uuid.uuid4().hex
    with _cancel_lock:
        _cancel_events[jid] = threading.Event()
    return jid


def signal_cancel(job_id: str) -> bool:
    with _cancel_lock:
        ev = _cancel_events.get(job_id)
    if ev is None:
        return False
    ev.set()
    return True


def _is_cancelled(job_id: str | None) -> bool:
    if not job_id:
        return False
    with _cancel_lock:
        ev = _cancel_events.get(job_id)
    return bool(ev and ev.is_set())


def _release_job(job_id: str | None):
    if not job_id:
        return
    with _cancel_lock:
        _cancel_events.pop(job_id, None)


def run_import(
    db: Session,
    pgn_text: str,
    user_tags: list[str],
    collection_ids: list[int],
    force: bool,
    job_id: str | None = None,
    emit: Callable[[dict], None] | None = None,
) -> dict:
    """Run a bulk import in an atomic transaction on the given session.

    Commits on success; rolls back on cancel or exception. Returns a
    result dict. On exception (not cancel), re-raises after rollback.
    """
    start = time.time()
    results = parse_multi_pgn(pgn_text)
    total = len(results)
    if total == 0:
        return {
            "imported": 0, "failed": 0, "duplicates": 0,
            "errors": [], "game_ids": [],
            "cancelled": False, "total": 0,
            "elapsed_seconds": 0.0,
        }

    imported = 0
    failed = 0
    duplicates = 0
    errors: list[str] = []
    game_ids: list[int] = []
    pending_index_rows: list[dict] = []
    last_emit = 0.0

    def _flush_index():
        nonlocal pending_index_rows
        if not pending_index_rows:
            return
        db.bulk_insert_mappings(PositionIndex, pending_index_rows)
        pending_index_rows = []

    def _emit_progress(force_emit: bool = False):
        nonlocal last_emit
        now = time.time()
        processed = imported + failed + duplicates
        if not force_emit and (now - last_emit) < 2.0 and processed % 100 != 0:
            return
        last_emit = now
        if emit:
            emit({
                "type": "progress",
                "imported": imported,
                "failed": failed,
                "duplicates": duplicates,
                "processed": processed,
                "total": total,
                "elapsed_seconds": round(now - start, 2),
            })

    try:
        for i, parsed in enumerate(results):
            if _is_cancelled(job_id):
                db.rollback()
                return {
                    "imported": 0, "failed": 0, "duplicates": 0,
                    "errors": [], "game_ids": [],
                    "cancelled": True, "total": total,
                    "elapsed_seconds": round(time.time() - start, 2),
                }

            if parsed.get("error"):
                failed += 1
                errors.append(f"Game {i + 1}: {parsed['error']}")
                _emit_progress()
                continue

            try:
                index_data = compute_position_index(parsed["pgn_text"])
                if not force and is_duplicate_game(db, parsed, index_data):
                    duplicates += 1
                    _emit_progress()
                    continue

                game = create_game_from_parsed(
                    db, parsed, user_tags, collection_ids, index_data=[]
                )
                db.flush()
                for entry in index_data:
                    pending_index_rows.append({
                        "game_id": game.id,
                        "half_move": entry["half_move"],
                        "zobrist_hash": entry["zobrist_hash"],
                        "fen": entry["fen"],
                        "pawn_sig": entry["pawn_sig"],
                    })
                if len(pending_index_rows) >= _CHUNK:
                    _flush_index()

                game_ids.append(game.id)
                imported += 1
            except Exception as e:
                failed += 1
                errors.append(f"Game {i + 1}: {str(e)}")

            _emit_progress()

        _flush_index()
        db.commit()
        _emit_progress(force_emit=True)
        return {
            "imported": imported, "failed": failed, "duplicates": duplicates,
            "errors": errors, "game_ids": game_ids,
            "cancelled": False, "total": total,
            "elapsed_seconds": round(time.time() - start, 2),
        }
    except Exception:
        db.rollback()
        raise


def stream_import(
    pgn_text: str,
    user_tags: list[str],
    collection_ids: list[int],
    force: bool,
    job_id: str,
) -> Iterator[str]:
    """Yield Server-Sent Events for a bulk import.

    Uses a dedicated worker thread with its own DB session so we can
    produce events incrementally without the request-scoped session
    being torn down mid-stream.
    """
    import json
    import queue as _queue

    q: _queue.Queue = _queue.Queue()

    def _runner():
        worker_db = SessionLocal()
        try:
            def _emit_to_q(ev: dict):
                q.put(("event", ev))
            result = run_import(
                worker_db, pgn_text, user_tags, collection_ids, force,
                job_id=job_id, emit=_emit_to_q,
            )
            q.put(("done", result))
        except Exception as e:
            q.put(("error", {"detail": str(e)}))
        finally:
            worker_db.close()

    yield f"data: {json.dumps({'type': 'start', 'job_id': job_id})}\n\n"

    t = threading.Thread(target=_runner, daemon=True)
    t.start()

    try:
        while True:
            kind, payload = q.get()
            if kind == "event":
                yield f"data: {json.dumps(payload)}\n\n"
            elif kind == "done":
                payload["type"] = "done"
                yield f"data: {json.dumps(payload)}\n\n"
                return
            elif kind == "error":
                payload["type"] = "error"
                yield f"data: {json.dumps(payload)}\n\n"
                return
    finally:
        _release_job(job_id)
