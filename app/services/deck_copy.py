import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.database_ops.card import db_read_cards_with_values_for_deck
from app.database_ops.deck import db_read_deck_for_copy
from app.database_ops.deck_practice_config import db_read_deck_practice_config_for_copy
from app.database_ops.field_def import db_read_field_defs_for_copy
from app.database_ops.subject import db_read_subject
from app.models.card import Card
from app.models.card_field_value import CardFieldValue
from app.models.deck import Deck
from app.models.deck_practice_config import DeckPracticeConfig
from app.models.field_def import FieldDef
from app.services.deck_practice_config import validate_deck_practice_config

_ID_ARRAY_FIELDS = (
    "prompt_field_ids",
    "answer_field_ids",
    "prompt_pool_ids",
    "answer_pool_ids",
)


def copy_deck(
    db: Session,
    user_id: uuid.UUID,
    source_deck_id: uuid.UUID,
    target_subject_id: uuid.UUID,
    deck_practice_config_ids: list[uuid.UUID] | None = None,
) -> Deck:
    """Copies a deck's content into one of the caller's own subjects — never shares it
    by reference. target_subject_id is ownership-scoped to user_id like every other
    query touching a user's own data; source_deck_id deliberately isn't (see
    db_read_deck_for_copy) — copying is the mechanism a future share-link phase
    authorizes, not something this function gates on its own.

    Single explicit transaction: one commit at the end. Any failure (a name collision
    on the new deck or a copied config, or a selected config that's gone stale since
    it was saved) rolls back the whole copy, not just the failed step.

    Never copied: card_field_mastery, review_log, sessions — a copy starts with no
    history of its own. deck_practice_config_ids is the sharer's choice of which
    configs to bring along, if any; omitted or empty copies none.
    """
    target_subject = db_read_subject(db, target_subject_id, user_id)
    if not target_subject:
        raise LookupError(f"subject {target_subject_id} not found")

    source_deck = db_read_deck_for_copy(db, source_deck_id)
    if not source_deck:
        raise LookupError(f"deck {source_deck_id} not found")

    new_deck = Deck(subject_id=target_subject_id, name=source_deck.name)
    db.add(new_deck)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise ValueError("A deck with this name already exists in this subject") from None

    field_map: dict[uuid.UUID, uuid.UUID] = {}
    for field_def in db_read_field_defs_for_copy(db, source_deck_id):
        new_field = FieldDef(
            deck_id=new_deck.id,
            name=field_def.name,
            type=field_def.type,
            position=field_def.position,
        )
        db.add(new_field)
        db.flush()
        field_map[field_def.id] = new_field.id

    for card in db_read_cards_with_values_for_deck(db, source_deck_id):
        new_card = Card(deck_id=new_deck.id)
        db.add(new_card)
        db.flush()
        for value in card.values:
            new_field_id = field_map.get(value.field_def_id)
            if new_field_id is None:
                continue  # value for an archived field — not copied, see field_map
            db.add(
                CardFieldValue(card_id=new_card.id, field_def_id=new_field_id, value=value.value)
            )

    for config_id in deck_practice_config_ids or []:
        config = db_read_deck_practice_config_for_copy(db, config_id)
        if not config or config.deck_id != source_deck_id:
            raise LookupError(f"deck_practice_config {config_id} not found on this deck")

        # Re-validate against the source deck — the config may have gone stale (a
        # field archived) since it was saved, and a stale config's ids wouldn't all
        # be in field_map.
        validate_deck_practice_config(
            db,
            source_deck_id,
            config.prompt_field_ids,
            config.answer_field_ids,
            config.prompt_pool_ids,
            config.prompt_pool_counts,
            config.answer_pool_ids,
            config.answer_pool_counts,
        )

        remapped = {
            field: [field_map[old_id] for old_id in getattr(config, field)]
            for field in _ID_ARRAY_FIELDS
        }
        new_config = DeckPracticeConfig(
            deck_id=new_deck.id,
            name=config.name,
            prompt_pool_counts=list(config.prompt_pool_counts),
            answer_pool_counts=list(config.answer_pool_counts),
            **remapped,
        )
        db.add(new_config)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            raise ValueError(
                f"A practice config named {config.name!r} already exists on the new deck"
            ) from None

    db.commit()
    db.refresh(new_deck)
    return new_deck
