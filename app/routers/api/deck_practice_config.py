import uuid

from fastapi import APIRouter, HTTPException
from sqlmodel import Session

from app.database import SessionDep
from app.database_ops.deck import db_read_deck
from app.database_ops.deck_practice_config import (
    db_create_deck_practice_config,
    db_delete_deck_practice_config,
    db_read_deck_practice_config,
    db_read_deck_practice_configs_with_context,
)
from app.database_ops.subject import db_read_subject
from app.dependencies import CurrentUserDep
from app.models.deck import Deck
from app.models.deck_practice_config import (
    DeckPracticeConfigCreate,
    DeckPracticeConfigRead,
    DeckPracticeConfigSummary,
    DeckPracticeConfigUpdate,
)
from app.refusals import Refusal
from app.services.activity import touch
from app.services.deck_practice_config import (
    update_deck_practice_config,
    validate_deck_practice_config,
)

router = APIRouter(prefix="/deck_practice_configs", tags=["Practice Config"])


def _touch_deck_and_subject(db: Session, deck: Deck, user_id: uuid.UUID) -> None:
    subject = db_read_subject(db, deck.subject_id, user_id)
    assert subject is not None, "a deck's subject always exists"
    touch(db, deck, subject)

_ARRAY_FIELDS = (
    "prompt_field_ids",
    "answer_field_ids",
    "prompt_pool_ids",
    "prompt_pool_counts",
    "answer_pool_ids",
    "answer_pool_counts",
)


@router.post("", response_model=DeckPracticeConfigRead, status_code=201)
def create_deck_practice_config(
    db: SessionDep, current_user: CurrentUserDep, payload: DeckPracticeConfigCreate
):
    deck = db_read_deck(db, payload.deck_id, current_user.id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    try:
        validate_deck_practice_config(
            db,
            payload.deck_id,
            payload.prompt_field_ids,
            payload.answer_field_ids,
            payload.prompt_pool_ids,
            payload.prompt_pool_counts,
            payload.answer_pool_ids,
            payload.answer_pool_counts,
        )
        _touch_deck_and_subject(db, deck, current_user.id)
        return db_create_deck_practice_config(db, payload.model_dump())
    except Refusal as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("", response_model=list[DeckPracticeConfigSummary], status_code=200)
def read_deck_practice_configs(
    db: SessionDep,
    current_user: CurrentUserDep,
    subject_id: uuid.UUID | None = None,
    deck_id: uuid.UUID | None = None,
):
    """Every config the user owns unless narrowed by subject and/or deck. Each row
    carries its deck and subject: the creation page groups by deck, and two decks in
    different subjects may share a name, so the subject has to travel with the row
    rather than be joined back in on the client."""
    return db_read_deck_practice_configs_with_context(
        db, current_user.id, subject_id, deck_id
    )


@router.get("/{config_id}", response_model=DeckPracticeConfigRead, status_code=200)
def read_deck_practice_config(
    db: SessionDep, current_user: CurrentUserDep, config_id: uuid.UUID
):
    config = db_read_deck_practice_config(db, config_id, current_user.id)
    if not config:
        raise HTTPException(status_code=404, detail="Deck configuration not found")
    return config


@router.patch("/{config_id}", response_model=DeckPracticeConfigRead, status_code=200)
def patch_deck_practice_config(
    db: SessionDep,
    current_user: CurrentUserDep,
    config_id: uuid.UUID,
    payload: DeckPracticeConfigUpdate,
):
    config = db_read_deck_practice_config(db, config_id, current_user.id)
    if not config:
        raise HTTPException(status_code=404, detail="Deck configuration not found")

    data = payload.model_dump(exclude_unset=True)
    # Validation always runs against the full resulting config, not just the patched
    # fields — pairwise-disjointness and the other rules only mean something across
    # the complete set of six arrays.
    merged = {field: data.get(field, getattr(config, field)) for field in _ARRAY_FIELDS}
    try:
        validate_deck_practice_config(db, config.deck_id, **merged)
        deck = db_read_deck(db, config.deck_id, current_user.id)
        assert deck is not None, "a configuration's deck always exists"
        touch(db, config)
        _touch_deck_and_subject(db, deck, current_user.id)
        return update_deck_practice_config(db, config, data)
    except Refusal as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/{config_id}", status_code=204)
def delete_deck_practice_config(
    db: SessionDep, current_user: CurrentUserDep, config_id: uuid.UUID
):
    config = db_read_deck_practice_config(db, config_id, current_user.id)
    if not config:
        raise HTTPException(status_code=404, detail="Deck configuration not found")
    deck = db_read_deck(db, config.deck_id, current_user.id)
    assert deck is not None, "a configuration's deck always exists"
    _touch_deck_and_subject(db, deck, current_user.id)
    db_delete_deck_practice_config(db, config)
