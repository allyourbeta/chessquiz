"""Annotation API routes — global position notes keyed by FEN."""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import FenAnnotation

router = APIRouter(prefix="/annotations", tags=["annotations"])


def _normalize_fen_key(full_fen: str) -> str:
    parts = full_fen.strip().split()
    board = parts[0]
    side = parts[1] if len(parts) > 1 else 'w'
    return f"{board} {side}"


class AnnotationPut(BaseModel):
    fen: str
    note_text: str


class AnnotationBatchRequest(BaseModel):
    fens: list[str]


@router.get("/")
def get_annotation(fen: str = Query(...), db: Session = Depends(get_db)):
    key = _normalize_fen_key(fen)
    row = db.query(FenAnnotation).filter(FenAnnotation.fen_key == key).first()
    if row:
        return {"fen_key": key, "note_text": row.note_text, "exists": True}
    return {"fen_key": key, "note_text": "", "exists": False}


@router.put("/")
def put_annotation(body: AnnotationPut, db: Session = Depends(get_db)):
    key = _normalize_fen_key(body.fen)
    trimmed = body.note_text.strip()
    row = db.query(FenAnnotation).filter(FenAnnotation.fen_key == key).first()

    if not trimmed:
        if row:
            db.delete(row)
            db.commit()
        return {"fen_key": key, "note_text": "", "saved": True}

    if row:
        if row.note_text.strip() == trimmed:
            return {"fen_key": key, "note_text": row.note_text, "saved": True}
        row.note_text = body.note_text
    else:
        row = FenAnnotation(fen_key=key, note_text=body.note_text)
        db.add(row)

    db.commit()
    db.refresh(row)
    return {"fen_key": key, "note_text": row.note_text, "saved": True}


@router.post("/batch")
def batch_annotations(body: AnnotationBatchRequest, db: Session = Depends(get_db)):
    keys = [_normalize_fen_key(f) for f in body.fens]
    unique_keys = list(set(keys))
    rows = db.query(FenAnnotation).filter(FenAnnotation.fen_key.in_(unique_keys)).all()
    result = {r.fen_key: r.note_text for r in rows}
    return {"annotations": result}
