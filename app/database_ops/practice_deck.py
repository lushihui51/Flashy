import uuid

from sqlmodel import Session, col, select, update

from app.models.practice_deck import PracticeDeck


def db_stage_create_practice_deck(db: Session, data: dict) -> PracticeDeck:
    """Does not commit — see db_stage_create_practice_run."""
    practice_deck = PracticeDeck(**data)
    db.add(practice_deck)
    db.flush()
    return practice_deck


def db_stage_unlink_practice_decks_from_config(db: Session, config_id: uuid.UUID) -> None:
    """Severs attribution (ADR 040): every snapshot that names this configuration as its
    source stops naming it. Called before a material configuration edit, so the unlink
    and the edit commit together in the caller's transaction. Snapshots themselves are
    never touched otherwise — attribution is the only link a configuration has to them."""
    db.exec(
        update(PracticeDeck)
        .where(col(PracticeDeck.source_config_id) == config_id)
        .values(source_config_id=None)
    )


def db_read_practice_deck_for_deck(
    db: Session, practice_run_id: uuid.UUID, deck_id: uuid.UUID
) -> PracticeDeck | None:
    return db.exec(
        select(PracticeDeck).where(
            PracticeDeck.practice_run_id == practice_run_id,
            PracticeDeck.deck_id == deck_id,
        )
    ).first()


def db_read_practice_decks_for_run(
    db: Session, practice_run_id: uuid.UUID
) -> list[PracticeDeck]:
    """Every snapshot a session took at start (ADR 013) — the re-run path's only
    source material (ADR 030); `source_config_id` is attribution only and is never
    read here (ADR 040). Unscoped by user, like
    db_read_practice_cards_for_run — the caller reaches this session through an
    ownership-checked lookup first."""
    return list(
        db.exec(
            select(PracticeDeck).where(PracticeDeck.practice_run_id == practice_run_id)
        ).all()
    )
