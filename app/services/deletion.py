"""Deleting a persistent entity (subject, deck, field, or card) deletes every record
that references its id and recomputes every value derived from what's gone, while an
ephemeral practice run goes only when it can no longer function (ADR 047).
compute_deletion_impact plans the whole closure and apply_deletion executes exactly
that plan — the only way any of these four types is ever deleted (ADR 051)."""

import uuid
from collections import defaultdict
from collections.abc import Collection, Mapping
from dataclasses import dataclass

from sqlmodel import Session

from app.database_ops.card import (
    db_count_cards_for_decks,
    db_delete_cards,
    db_read_card_ids_for_decks,
    db_read_owned_card_ids,
)
from app.database_ops.deck import (
    db_delete_decks,
    db_read_deck_ids_for_subjects,
    db_read_owned_deck_ids,
)
from app.database_ops.deck_practice_config import (
    db_delete_deck_practice_configs,
    db_read_config_ids_for_decks,
    db_read_config_ids_naming_fields,
)
from app.database_ops.field_def import (
    db_delete_field_defs,
    db_read_active_field_ids_for_decks,
    db_read_deck_id_by_field,
    db_read_owned_field_ids,
)
from app.database_ops.practice_run import (
    db_delete_practice_runs,
    db_read_active_run_ids_naming_fields,
    db_read_run_ids_with_all_decks_in,
)
from app.database_ops.review_log import db_scrub_shown_prompt_ids
from app.database_ops.subject import db_delete_subjects, db_read_owned_subject_ids
from app.mastery.strategy import MasteryStrategy
from app.models.card import Card
from app.models.deck import Deck
from app.models.subject import Subject
from app.services.activity import touch
from app.services.mastery import rebuild_deck_mastery


@dataclass(frozen=True)
class DeletionImpact:
    """The closure one deletion request touches (ADR 051) — every set is the closure,
    explicit ids included, not just what the request named directly. A pure plan: no
    field here is ever mutated after compute_deletion_impact returns it."""

    subject_ids: frozenset[uuid.UUID]
    deck_ids: frozenset[uuid.UUID]
    field_ids: frozenset[uuid.UUID]
    card_ids: frozenset[uuid.UUID]
    configuration_ids: frozenset[uuid.UUID]
    run_ids: frozenset[uuid.UUID]
    affected_card_count: int
    explicit_fields_by_deck: Mapping[uuid.UUID, frozenset[uuid.UUID]]


def _raise_for_missing(
    kind: str, requested: Collection[uuid.UUID], owned: set[uuid.UUID]
) -> None:
    for requested_id in requested:
        if requested_id not in owned:
            raise LookupError(f"{kind} {requested_id} not found")


def compute_deletion_impact(
    db: Session,
    user_id: uuid.UUID,
    subject_ids: Collection[uuid.UUID] = (),
    deck_ids: Collection[uuid.UUID] = (),
    field_ids: Collection[uuid.UUID] = (),
    card_ids: Collection[uuid.UUID] = (),
) -> DeletionImpact:
    """A pure read: plans everything one deletion request takes with it (ADR 047,
    ADR 051), without changing anything. Raises LookupError naming the first id (in
    caller order, subject then deck then field then card) that's foreign or doesn't
    exist. A field whose deck is also in this request contributes nothing on its own
    — it's already covered by the deck's own cascade."""
    owned_subject_ids = db_read_owned_subject_ids(db, user_id, subject_ids)
    _raise_for_missing("subject", subject_ids, owned_subject_ids)
    owned_deck_ids = db_read_owned_deck_ids(db, user_id, deck_ids)
    _raise_for_missing("deck", deck_ids, owned_deck_ids)
    owned_field_ids = db_read_owned_field_ids(db, user_id, field_ids)
    _raise_for_missing("field", field_ids, owned_field_ids)
    owned_card_ids = db_read_owned_card_ids(db, user_id, card_ids)
    _raise_for_missing("card", card_ids, owned_card_ids)

    subject_ids = set(subject_ids)
    deck_ids = set(deck_ids)
    field_ids = set(field_ids)
    card_ids = set(card_ids)

    decks = deck_ids | db_read_deck_ids_for_subjects(db, subject_ids)

    deck_id_by_field = db_read_deck_id_by_field(db, field_ids)
    explicit_fields = {fid for fid in field_ids if deck_id_by_field[fid] not in decks}

    fields = explicit_fields | db_read_active_field_ids_for_decks(db, decks)

    cards = card_ids | set(db_read_card_ids_for_decks(db, decks))

    configurations = db_read_config_ids_for_decks(db, decks) | db_read_config_ids_naming_fields(
        db, explicit_fields
    )

    runs = db_read_run_ids_with_all_decks_in(
        db, user_id, decks
    ) | db_read_active_run_ids_naming_fields(db, user_id, explicit_fields)

    explicit_fields_by_deck: dict[uuid.UUID, set[uuid.UUID]] = defaultdict(set)
    for fid in explicit_fields:
        explicit_fields_by_deck[deck_id_by_field[fid]].add(fid)

    if explicit_fields:
        explicit_field_decks = set(explicit_fields_by_deck.keys())
        affected_card_count = db_count_cards_for_decks(db, explicit_field_decks, excluding=cards)
    else:
        affected_card_count = 0

    return DeletionImpact(
        subject_ids=frozenset(subject_ids),
        deck_ids=frozenset(decks),
        field_ids=frozenset(fields),
        card_ids=frozenset(cards),
        configuration_ids=frozenset(configurations),
        run_ids=frozenset(runs),
        affected_card_count=affected_card_count,
        explicit_fields_by_deck={
            deck_id: frozenset(fids) for deck_id, fids in explicit_fields_by_deck.items()
        },
    )


def apply_deletion(db: Session, strategy: MasteryStrategy, impact: DeletionImpact) -> None:
    """Executes exactly the plan compute_deletion_impact returned — the only way a
    subject, deck, field, or card is ever deleted (ADR 051). No commit, no touch, no
    two-field-floor validation: those are each caller's own job. An object loaded
    before this call is not updated for rows the FK cascades below remove; reload
    after, don't reuse what you read before."""
    db_delete_practice_runs(db, impact.run_ids)
    db_delete_deck_practice_configs(db, impact.configuration_ids)
    for deck_id, field_ids in impact.explicit_fields_by_deck.items():
        db_scrub_shown_prompt_ids(db, deck_id, field_ids)
    db_delete_cards(db, impact.card_ids)
    db_delete_field_defs(db, impact.field_ids)
    db_delete_decks(db, impact.deck_ids)
    db_delete_subjects(db, impact.subject_ids)
    db.flush()
    for deck_id in impact.explicit_fields_by_deck:
        rebuild_deck_mastery(db, strategy, deck_id)


def delete_subject(db: Session, strategy: MasteryStrategy, subject: Subject) -> None:
    """A subject has no parent to touch — deleting it is the end of its own
    ownership chain."""
    impact = compute_deletion_impact(db, subject.user_id, subject_ids=[subject.id])
    apply_deletion(db, strategy, impact)
    db.commit()


def delete_deck(db: Session, strategy: MasteryStrategy, deck: Deck) -> None:
    subject = db.get(Subject, deck.subject_id)
    assert subject is not None, "a deck's subject always exists"
    impact = compute_deletion_impact(db, subject.user_id, deck_ids=[deck.id])
    apply_deletion(db, strategy, impact)
    touch(db, subject)
    db.commit()


def delete_card(db: Session, strategy: MasteryStrategy, card: Card) -> None:
    deck = db.get(Deck, card.deck_id)
    assert deck is not None, "a card's deck always exists"
    subject = db.get(Subject, deck.subject_id)
    assert subject is not None, "a deck's subject always exists"
    impact = compute_deletion_impact(db, subject.user_id, card_ids=[card.id])
    apply_deletion(db, strategy, impact)
    touch(db, deck)
    db.commit()
