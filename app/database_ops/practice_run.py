import uuid
from collections.abc import Collection

from sqlalchemy import delete, exists, or_
from sqlmodel import Session, col, select

from app.models.deck import Deck
from app.models.practice_deck import PracticeDeck
from app.models.practice_run import PracticeRun, RunStatus
from app.models.practice_run_payloads import PracticeRunDeckSummary, PracticeRunSummary
from app.models.subject import Subject


def db_stage_create_practice_run(db: Session, user_id: uuid.UUID, name: str) -> PracticeRun:
    """Does not commit — the caller owns the transaction (session start is one
    explicit transaction: the session, its practice_decks, and its practice_cards)."""
    session = PracticeRun(user_id=user_id, name=name)
    db.add(session)
    db.flush()
    return session


def db_read_practice_run(
    db: Session, practice_run_id: uuid.UUID, user_id: uuid.UUID
) -> PracticeRun | None:
    return db.exec(
        select(PracticeRun).where(
            PracticeRun.id == practice_run_id, PracticeRun.user_id == user_id
        )
    ).first()


def _summaries_for_runs(
    db: Session, sessions: list[PracticeRun]
) -> list[PracticeRunSummary]:
    """Two queries regardless of how many sessions are passed in — shared by the list
    read and the single-session read below, so a detail fetch is a narrowed instance of
    the same read rather than a per-row loop over it."""
    if not sessions:
        return []

    session_ids = [s.id for s in sessions]
    rows = db.exec(
        select(
            PracticeDeck.practice_run_id,
            Deck.id,
            Deck.name,
            Subject.id,
            Subject.name,
        )
        .join(Deck, Deck.id == PracticeDeck.deck_id)
        .join(Subject, Subject.id == Deck.subject_id)
        .where(col(PracticeDeck.practice_run_id).in_(session_ids))
        .order_by(col(Subject.name), col(Deck.name))
    ).all()

    decks_by_session: dict[uuid.UUID, list[PracticeRunDeckSummary]] = {}
    for session_id, deck_id_, deck_name, subject_id_, subject_name in rows:
        decks_by_session.setdefault(session_id, []).append(
            PracticeRunDeckSummary(
                deck_id=deck_id_,
                deck_name=deck_name,
                subject_id=subject_id_,
                subject_name=subject_name,
            )
        )

    # model_validate over the ORM row rather than **model_dump(): `status` is stored in
    # a plain String column, so dumping the table model hands back a bare str and
    # pydantic then complains about the enum field it lands in.
    return [
        PracticeRunSummary.model_validate(
            session, update={"decks": decks_by_session.get(session.id, [])}
        )
        for session in sessions
    ]


def db_read_practice_runs_with_decks(
    db: Session,
    user_id: uuid.UUID,
    subject_id: uuid.UUID | None = None,
    deck_id: uuid.UUID | None = None,
) -> list[PracticeRunSummary]:
    """The user's sessions, newest first, each with the decks it snapshotted — two
    queries regardless of how many sessions there are, never one per session (the same
    shape as db_read_decks_with_summary).

    `subject_id`/`deck_id` filter by EXISTS over `practice_deck → deck`: a session
    matches if *any* of its snapshots points at a matching deck. A run left with no
    snapshot at all is deleted alongside its last deck (ADR 047, ADR 048), so there is
    no dangling snapshot state for this filter to have to account for."""
    query = select(PracticeRun).where(PracticeRun.user_id == user_id)

    if subject_id is not None or deck_id is not None:
        matching = (
            select(PracticeDeck.id)
            .join(Deck, Deck.id == PracticeDeck.deck_id)
            .where(PracticeDeck.practice_run_id == PracticeRun.id)
        )
        if subject_id is not None:
            matching = matching.where(Deck.subject_id == subject_id)
        if deck_id is not None:
            matching = matching.where(PracticeDeck.deck_id == deck_id)
        query = query.where(matching.exists())

    query = query.order_by(col(PracticeRun.created_at).desc(), col(PracticeRun.id))
    sessions = list(db.exec(query).all())
    return _summaries_for_runs(db, sessions)


def db_read_practice_run_with_decks(
    db: Session, practice_run_id: uuid.UUID, user_id: uuid.UUID
) -> PracticeRunSummary | None:
    """The detail read (MD-3): the same summary shape as the list, narrowed to one
    session via the existing ownership-scoped lookup. None for a missing or foreign
    session, same as db_read_practice_run."""
    session = db_read_practice_run(db, practice_run_id, user_id)
    if session is None:
        return None
    return _summaries_for_runs(db, [session])[0]


def db_delete_practice_run(db: Session, session: PracticeRun) -> None:
    """The session's practice_cards and practice_decks go with it (ON DELETE CASCADE,
    ADR 015 as amended) — they are session-owned state, not history. review_log rows
    are not touched at all: a run is a shell for the reviews inside it, not a resource
    in its own right, so deleting it costs exactly its own attribution and nothing
    else (ADR 047)."""
    db.delete(session)
    db.commit()


def db_read_run_ids_with_all_decks_in(
    db: Session, user_id: uuid.UUID, deck_ids: Collection[uuid.UUID]
) -> set[uuid.UUID]:
    """Runs of user_id with at least one practice_deck, none of whose practice_decks
    points at a deck outside deck_ids — ADR 051 step 7's first half: a run entirely
    contained in this closure of decks."""
    if not deck_ids:
        return set()
    has_a_deck = exists().where(PracticeDeck.practice_run_id == PracticeRun.id)
    has_an_outside_deck = exists().where(
        PracticeDeck.practice_run_id == PracticeRun.id,
        col(PracticeDeck.deck_id).not_in(deck_ids),
    )
    query = select(PracticeRun.id).where(
        PracticeRun.user_id == user_id, has_a_deck, ~has_an_outside_deck
    )
    return set(db.exec(query).all())


def db_read_active_run_ids_naming_fields(
    db: Session, user_id: uuid.UUID, field_ids: Collection[uuid.UUID]
) -> set[uuid.UUID]:
    """Active runs of user_id with a practice_deck whose prompt/answer/pool field
    arrays overlap field_ids — ADR 051 step 7's second half. Completed runs are never
    touched by a field-only deletion: they still show their attempts, they just don't
    need to be rateable any more (ADR 047)."""
    if not field_ids:
        return set()
    ids = list(field_ids)
    query = (
        select(PracticeRun.id)
        .join(PracticeDeck, PracticeDeck.practice_run_id == PracticeRun.id)
        .where(
            PracticeRun.user_id == user_id,
            PracticeRun.status == RunStatus.active,
            or_(
                PracticeDeck.prompt_field_ids.op("&&")(ids),
                PracticeDeck.answer_field_ids.op("&&")(ids),
                PracticeDeck.prompt_pool_ids.op("&&")(ids),
                PracticeDeck.answer_pool_ids.op("&&")(ids),
            ),
        )
    )
    return set(db.exec(query).all())


def db_stage_delete_practice_runs(db: Session, ids: Collection[uuid.UUID]) -> None:
    """Bulk delete by id, no commit — apply_deletion (ADR 051) owns the transaction.
    Its practice_decks and practice_cards cascade away with it; every review and
    mastery value it produced stays (ADR 047, ADR 039)."""
    if not ids:
        return
    db.execute(delete(PracticeRun).where(col(PracticeRun.id).in_(ids)))


def db_update_practice_run_status(
    db: Session, session: PracticeRun, status: RunStatus
) -> PracticeRun:
    session.status = status
    db.add(session)
    db.commit()
    db.refresh(session)
    return session
