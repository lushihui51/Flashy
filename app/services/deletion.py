"""Deleting a persistent entity (deck, field, or card) deletes every record that
references its id and recomputes every value derived from what's gone, while an
ephemeral run goes only when it can no longer function.
compute_deletion_impact plans the whole closure and apply_deletion executes exactly
that plan — the only way any of these three types is ever deleted."""

import uuid
from collections import defaultdict
from collections.abc import Collection, Mapping
from dataclasses import dataclass

from sqlmodel import Session

from app.database_ops.card import (
    db_count_cards_for_decks,
    db_stage_delete_cards,
    db_read_card_ids_for_decks,
    db_read_owned_card_ids,
)
from app.database_ops.deck import (
    db_read_deck,
    db_stage_delete_decks,
    db_read_owned_deck_ids,
)
from app.database_ops.field_def import (
    db_read_deck_id_by_field,
    db_read_field_defs,
    db_read_field_defs_for_decks,
    db_read_field_ids_for_decks,
    db_read_owned_field_ids,
    db_stage_delete_field_defs,
)
from app.database_ops.practice_configuration import (
    db_read_practice_configurations_for_decks,
    db_read_practice_ids_for_decks,
    db_stage_update_practice_configuration,
)
from app.database_ops.run import (
    db_read_active_run_ids_naming_fields,
    db_read_run_ids_with_all_decks_in,
    db_stage_delete_runs,
)
from app.database_ops.run_card import db_stage_scrub_run_card_field_ids
from app.database_ops.run_configuration import (
    db_read_run_configurations_for_decks,
    db_stage_update_run_configuration,
)
from app.database_ops.review_log import db_stage_scrub_shown_prompt_ids
from app.mastery.strategy import MasteryStrategy
from app.models.card import Card
from app.models.deck import Deck
from app.models.field_def import FieldDef
from app.refusals import Refusal
from app.services.activity import touch
from app.services.mastery import rebuild_deck_mastery
from app.services.practice_configuration import (
    arrays_of,
    has_empty_side,
    starting_configuration,
    without_fields,
)


@dataclass(frozen=True)
class DeletionImpact:
    """The closure one deletion request touches — every set is the closure,
    explicit ids included, not just what the request named directly. A pure plan: no
    field here is ever mutated after compute_deletion_impact returns it."""

    deck_ids: frozenset[uuid.UUID]
    field_ids: frozenset[uuid.UUID]
    card_ids: frozenset[uuid.UUID]
    run_ids: frozenset[uuid.UUID]
    # The practices that hold a deleted deck, which lose it and keep the rest.
    practice_ids: frozenset[uuid.UUID]
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
    deck_ids: Collection[uuid.UUID] = (),
    field_ids: Collection[uuid.UUID] = (),
    card_ids: Collection[uuid.UUID] = (),
) -> DeletionImpact:
    """A pure read: plans everything one deletion request takes with it, without
    changing anything. Raises LookupError naming the first id (in
    caller order, deck then field then card) that's foreign or doesn't
    exist. A field whose deck is also in this request contributes nothing on its own
    — it's already covered by the deck's own cascade."""
    owned_deck_ids = db_read_owned_deck_ids(db, user_id, deck_ids)
    _raise_for_missing("deck", deck_ids, owned_deck_ids)
    owned_field_ids = db_read_owned_field_ids(db, user_id, field_ids)
    _raise_for_missing("field", field_ids, owned_field_ids)
    owned_card_ids = db_read_owned_card_ids(db, user_id, card_ids)
    _raise_for_missing("card", card_ids, owned_card_ids)

    decks = set(deck_ids)
    field_ids = set(field_ids)
    card_ids = set(card_ids)

    deck_id_by_field = db_read_deck_id_by_field(db, field_ids)
    explicit_fields = {fid for fid in field_ids if deck_id_by_field[fid] not in decks}

    fields = explicit_fields | db_read_field_ids_for_decks(db, decks)

    cards = card_ids | set(db_read_card_ids_for_decks(db, decks))

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
        deck_ids=frozenset(decks),
        field_ids=frozenset(fields),
        card_ids=frozenset(cards),
        run_ids=frozenset(runs),
        practice_ids=frozenset(db_read_practice_ids_for_decks(db, user_id, decks)),
        affected_card_count=affected_card_count,
        explicit_fields_by_deck={
            deck_id: frozenset(fids) for deck_id, fids in explicit_fields_by_deck.items()
        },
    )


def _remove_fields_from_configurations(
    db: Session, fields_by_deck: Mapping[uuid.UUID, frozenset[uuid.UUID]]
) -> None:
    """Removes each deck's deleted fields from every practice's configuration of the deck,
    a configuration left with a side naming no field taking the deck's starting
    configuration, and from every remaining run's copy of it, with no reset."""
    decks = list(fields_by_deck)
    live_by_deck: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    for field_def in db_read_field_defs_for_decks(db, decks):
        if field_def.id not in fields_by_deck[field_def.deck_id]:
            live_by_deck[field_def.deck_id].append(field_def.id)

    for configuration in db_read_practice_configurations_for_decks(db, decks):
        arrays = without_fields(arrays_of(configuration), fields_by_deck[configuration.deck_id])
        if has_empty_side(arrays):
            arrays = starting_configuration(live_by_deck[configuration.deck_id])
        db_stage_update_practice_configuration(db, configuration, arrays)
    for copy in db_read_run_configurations_for_decks(db, decks):
        arrays = without_fields(arrays_of(copy), fields_by_deck[copy.deck_id])
        db_stage_update_run_configuration(db, copy, arrays)


def apply_deletion(db: Session, strategy: MasteryStrategy, impact: DeletionImpact) -> None:
    """Executes exactly the plan compute_deletion_impact returned — the only way a
    deck, field, or card is ever deleted. No commit, no touch, no
    two-field-floor validation: those are each caller's own job. An object loaded
    before this call is not updated for rows the FK cascades below remove; reload
    after, don't reuse what you read before."""
    db_stage_delete_runs(db, impact.run_ids)
    if impact.explicit_fields_by_deck:
        db.flush()
        _remove_fields_from_configurations(db, impact.explicit_fields_by_deck)
    for deck_id, field_ids in impact.explicit_fields_by_deck.items():
        db_stage_scrub_shown_prompt_ids(db, deck_id, field_ids)
        db_stage_scrub_run_card_field_ids(db, deck_id, field_ids)
    db_stage_delete_cards(db, impact.card_ids)
    db_stage_delete_field_defs(db, impact.field_ids)
    db_stage_delete_decks(db, impact.deck_ids)
    db.flush()
    for deck_id in impact.explicit_fields_by_deck:
        rebuild_deck_mastery(db, strategy, deck_id)


def delete_deck(
    db: Session, strategy: MasteryStrategy, user_id: uuid.UUID, deck: Deck
) -> None:
    impact = compute_deletion_impact(db, user_id, deck_ids=[deck.id])
    apply_deletion(db, strategy, impact)
    db.commit()


def delete_card(
    db: Session, strategy: MasteryStrategy, user_id: uuid.UUID, card: Card
) -> None:
    deck = db_read_deck(db, card.deck_id, user_id)
    assert deck is not None, "a card's deck always exists"
    impact = compute_deletion_impact(db, user_id, card_ids=[card.id])
    apply_deletion(db, strategy, impact)
    touch(db, deck)
    db.commit()


def delete_field(
    db: Session, strategy: MasteryStrategy, user_id: uuid.UUID, field_def: FieldDef
) -> None:
    """Raises Refusal("too_few_fields", ...) before anything is staged when the deck
    has two fields; otherwise compute_deletion_impact over the one field, apply_deletion,
    touch(deck), commit."""
    deck = db_read_deck(db, field_def.deck_id, user_id)
    assert deck is not None, "a field's deck always exists"
    if len(db_read_field_defs(db, deck.id, user_id)) <= 2:
        raise Refusal("too_few_fields", "the deck would keep fewer than two active field_defs")
    impact = compute_deletion_impact(db, user_id, field_ids=[field_def.id])
    apply_deletion(db, strategy, impact)
    touch(db, deck)
    db.commit()
