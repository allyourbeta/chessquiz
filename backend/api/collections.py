"""Collection API routes. All DB calls for collections happen here."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from backend.api.game_schemas import (
    CollectionCreate,
    CollectionDetail,
    CollectionOut,
    CollectionUpdate,
)
from backend.database import get_db
from backend.models import Game, GameCollection

router = APIRouter(prefix="/collections", tags=["collections"])


@router.post("/", response_model=CollectionOut, status_code=201)
def create_collection(data: CollectionCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(GameCollection)
        .filter(GameCollection.name == data.name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Collection name already exists")

    coll = GameCollection(name=data.name, description=data.description)
    db.add(coll)
    db.commit()
    db.refresh(coll)
    return CollectionOut(
        id=coll.id,
        name=coll.name,
        description=coll.description,
        game_count=len(coll.games),
        created_at=coll.created_at,
    )


@router.get("/", response_model=list[CollectionOut])
def list_collections(db: Session = Depends(get_db)):
    colls = (
        db.query(GameCollection)
        .options(joinedload(GameCollection.games))
        .all()
    )
    return [
        CollectionOut(
            id=c.id,
            name=c.name,
            description=c.description,
            game_count=len(c.games),
            created_at=c.created_at,
        )
        for c in colls
    ]


@router.get("/{collection_id}", response_model=CollectionDetail)
def get_collection(collection_id: int, db: Session = Depends(get_db)):
    coll = (
        db.query(GameCollection)
        .options(joinedload(GameCollection.games).joinedload(Game.tags))
        .filter(GameCollection.id == collection_id)
        .first()
    )
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")
    return coll


@router.put("/{collection_id}", response_model=CollectionOut)
def update_collection(
    collection_id: int, data: CollectionUpdate, db: Session = Depends(get_db)
):
    coll = (
        db.query(GameCollection)
        .filter(GameCollection.id == collection_id)
        .first()
    )
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")

    if data.name is not None:
        dup = (
            db.query(GameCollection)
            .filter(GameCollection.name == data.name, GameCollection.id != collection_id)
            .first()
        )
        if dup:
            raise HTTPException(status_code=409, detail="Collection name already exists")
        coll.name = data.name

    if data.description is not None:
        coll.description = data.description

    db.commit()
    db.refresh(coll)
    return CollectionOut(
        id=coll.id,
        name=coll.name,
        description=coll.description,
        game_count=len(coll.games),
        created_at=coll.created_at,
    )


@router.delete("/{collection_id}", status_code=204)
def delete_collection(collection_id: int, db: Session = Depends(get_db)):
    coll = (
        db.query(GameCollection)
        .filter(GameCollection.id == collection_id)
        .first()
    )
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")
    db.delete(coll)
    db.commit()


@router.post("/{collection_id}/games", status_code=204)
def add_game_to_collection(
    collection_id: int, game_id: int, db: Session = Depends(get_db)
):
    coll = (
        db.query(GameCollection)
        .filter(GameCollection.id == collection_id)
        .first()
    )
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")

    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if game not in coll.games:
        coll.games.append(game)
        db.commit()


@router.delete("/{collection_id}/games/{game_id}", status_code=204)
def remove_game_from_collection(
    collection_id: int, game_id: int, db: Session = Depends(get_db)
):
    coll = (
        db.query(GameCollection)
        .options(joinedload(GameCollection.games))
        .filter(GameCollection.id == collection_id)
        .first()
    )
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")

    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if game in coll.games:
        coll.games.remove(game)
        db.commit()
