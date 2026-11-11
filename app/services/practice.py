import uuid

from sqlmodel import Session

from app.database_ops.app_user import db_stage_set_first_practice_at
from app.database_ops.field_def import db_read_field_defs_for_decks
from app.database_ops.practice import (
    db_read_owned_deck_names,
    db_read_practice_names_from,
    db_read_practice_listings,
    db_try_stage_create_practice,
)
from app.database_ops.practice_configuration import (
    db_try_stage_create_practice_configurations,
)
from app.database_ops.run_configuration import db_read_last_run_configurations
from app.mastery.strategy import MasteryStrategy
from app.models.base import utcnow
from app.models.practice_payloads import PracticeSummary
from app.refusals import Refusal
from app.services.mastery import practice_readiness
from app.services.practice_configuration import (
    arrays_of,
    starting_configuration,
    validate_configuration,
)


def _owned_deck_names(
    db: Session, user_id: uuid.UUID, deck_ids: list[uuid.UUID]
) -> dict[uuid.UUID, str]:
    """The names of `deck_ids` by id. Raises LookupError naming the first deck that is
    missing or not the user's."""
    names = db_read_owned_deck_names(db, user_id, deck_ids)
    for deck_id in deck_ids:
        if deck_id not in names:
            raise LookupError(f"deck {deck_id} not found")
    return names


def suggest_practice_name(db: Session, user_id: uuid.UUID, deck_ids: list[uuid.UUID]) -> str:
    """The decks' names in the order given, joined by " + ", with the first number from 1
    that no practice of the user's has added in parentheses, as "Ports (1)", when a
    practice already has that name. Raises LookupError naming the first deck that is
    missing or not the user's."""
    names = _owned_deck_names(db, user_id, deck_ids)
    base = " + ".join(names[deck_id] for deck_id in deck_ids)
    taken = db_read_practice_names_from(db, user_id, base)
    if base not in taken:
        return base
    number = 1
    while f"{base} ({number})" in taken:
        number += 1
    return f"{base} ({number})"


def practice_summaries(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    practice_id: uuid.UUID | None = None,
) -> list[PracticeSummary]:
    """The user's practices, or only `practice_id` when given, empty when it is not the
    user's: most recently run first, a practice never run by when it was made, then id; each
    with its decks, most recently changed first, its active run and its readiness."""
    listings = db_read_practice_listings(db, user_id, practice_id)
    readiness = practice_readiness(db, strategy, [row.id for row in listings])
    return [
        PracticeSummary(**row.model_dump(), readiness=readiness[row.id]) for row in listings
    ]


def _starting_arrays(db: Session, deck_ids: list[uuid.UUID]) -> dict[uuid.UUID, dict[str, list]]:
    live_by_deck: dict[uuid.UUID, list[uuid.UUID]] = {deck_id: [] for deck_id in deck_ids}
    for field_def in db_read_field_defs_for_decks(db, deck_ids):
        live_by_deck[field_def.deck_id].append(field_def.id)
    return {deck_id: starting_configuration(live) for deck_id, live in live_by_deck.items()}


def create_practice(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    name: str | None,
    deck_ids: list[uuid.UUID],
) -> PracticeSummary:
    """Creates a practice of `deck_ids` named `name`, or the suggested name when `name` is
    None or blank, and stamps the user's first practice. Each deck's configuration is the
    one its most recently rated card was last asked by, when that still passes
    `validate_configuration`, and otherwise the deck's starting configuration. Raises
    LookupError naming the first deck that is missing or not the user's, ValueError when
    `deck_ids` is empty or repeats a deck, and `Refusal("practice_name_taken")` when the
    user already has a practice of that name."""
    if not deck_ids:
        raise ValueError("a practice needs at least one deck")
    _owned_deck_names(db, user_id, deck_ids)

    typed = name.strip() if name is not None else ""
    practice = db_try_stage_create_practice(
        db, user_id, typed or suggest_practice_name(db, user_id, deck_ids)
    )
    if practice is None and not typed:
        # Another create took the suggestion between reading and writing it.
        practice = db_try_stage_create_practice(
            db, user_id, suggest_practice_name(db, user_id, deck_ids)
        )
    if practice is None:
        raise Refusal("practice_name_taken", "the user already has a practice of this name")

    last = db_read_last_run_configurations(db, user_id, deck_ids)
    starting = _starting_arrays(db, deck_ids)
    rows = []
    for deck_id in deck_ids:
        arrays = starting[deck_id]
        if deck_id in last:
            copied = arrays_of(last[deck_id])
            try:
                validate_configuration(db, deck_id, copied)
                arrays = copied
            except ValueError:
                pass
        rows.append({"id": uuid.uuid4(), "practice_id": practice.id, "deck_id": deck_id, **arrays})
    if db_try_stage_create_practice_configurations(db, rows) is None:
        raise ValueError("a deck is picked twice, or is gone")

    db_stage_set_first_practice_at(db, user_id, utcnow())
    db.commit()
    return practice_summaries(db, strategy, user_id, practice.id)[0]
