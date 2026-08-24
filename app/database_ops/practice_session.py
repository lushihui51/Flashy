import uuid

from sqlmodel import Session, col, func, select

from app.models.deck import Deck
from app.models.practice_deck import PracticeDeck
from app.models.practice_session import (
    PracticeSession,
    PracticeSessionDeckSummary,
    PracticeSessionSummary,
    SessionStatus,
)
from app.models.subject import Subject


def db_create_practice_session(db: Session, user_id: uuid.UUID, name: str) -> PracticeSession:
    """Does not commit — the caller owns the transaction (session start is one
    explicit transaction: the session, its practice_decks, and its practice_cards)."""
    session = PracticeSession(user_id=user_id, name=name)
    db.add(session)
    db.flush()
    return session


def db_read_practice_session(
    db: Session, practice_session_id: uuid.UUID, user_id: uuid.UUID
) -> PracticeSession | None:
    return db.exec(
        select(PracticeSession).where(
            PracticeSession.id == practice_session_id, PracticeSession.user_id == user_id
        )
    ).first()


def db_read_practice_sessions_with_decks(
    db: Session,
    user_id: uuid.UUID,
    subject_id: uuid.UUID | None = None,
    deck_id: uuid.UUID | None = None,
) -> list[PracticeSessionSummary]:
    """The user's sessions, newest first, each with the decks it snapshotted — two
    queries regardless of how many sessions there are, never one per session (the same
    shape as db_read_decks_with_summary).

    `subject_id`/`deck_id` filter by EXISTS over `practice_deck → deck`: a session
    matches if *any* of its snapshots points at a matching deck. That join is inner, so
    a snapshot whose deck was deleted (deck_id NULL, ADR 015) neither matches a filter
    nor contributes a chip."""
    query = select(PracticeSession).where(PracticeSession.user_id == user_id)

    if subject_id is not None or deck_id is not None:
        matching = (
            select(PracticeDeck.id)
            .join(Deck, Deck.id == PracticeDeck.deck_id)
            .where(PracticeDeck.practice_session_id == PracticeSession.id)
        )
        if subject_id is not None:
            matching = matching.where(Deck.subject_id == subject_id)
        if deck_id is not None:
            matching = matching.where(PracticeDeck.deck_id == deck_id)
        query = query.where(matching.exists())

    query = query.order_by(col(PracticeSession.created_at).desc(), col(PracticeSession.id))
    sessions = list(db.exec(query).all())
    if not sessions:
        return []

    session_ids = [s.id for s in sessions]
    rows = db.exec(
        select(
            PracticeDeck.practice_session_id,
            Deck.id,
            Deck.name,
            Subject.id,
            Subject.name,
        )
        .join(Deck, Deck.id == PracticeDeck.deck_id)
        .join(Subject, Subject.id == Deck.subject_id)
        .where(col(PracticeDeck.practice_session_id).in_(session_ids))
        .order_by(col(Subject.name), col(Deck.name))
    ).all()

    decks_by_session: dict[uuid.UUID, list[PracticeSessionDeckSummary]] = {}
    for session_id, deck_id_, deck_name, subject_id_, subject_name in rows:
        decks_by_session.setdefault(session_id, []).append(
            PracticeSessionDeckSummary(
                deck_id=deck_id_,
                deck_name=deck_name,
                subject_id=subject_id_,
                subject_name=subject_name,
            )
        )

    # Snapshots whose deck has since been deleted are counted, not listed — there is no
    # name or subject left to put in a chip, but the client still has to show *something*
    # (ADR 015 as amended — a session stranded that way now reads as Completed, and these chips are
    # what distinguishes it from one the user actually finished).
    deleted_counts = dict(
        db.exec(
            select(PracticeDeck.practice_session_id, func.count())
            .where(
                col(PracticeDeck.practice_session_id).in_(session_ids),
                col(PracticeDeck.deck_id).is_(None),
            )
            .group_by(col(PracticeDeck.practice_session_id))
        ).all()
    )

    # model_validate over the ORM row rather than **model_dump(): `status` is stored in
    # a plain String column, so dumping the table model hands back a bare str and
    # pydantic then complains about the enum field it lands in.
    return [
        PracticeSessionSummary.model_validate(
            session,
            update={
                "decks": decks_by_session.get(session.id, []),
                "deleted_deck_count": deleted_counts.get(session.id, 0),
            },
        )
        for session in sessions
    ]


def db_delete_practice_session(db: Session, session: PracticeSession) -> None:
    """The session's practice_cards and practice_decks go with it (ON DELETE CASCADE,
    ADR 015 as amended) — they are session-owned state, not history. review_log rows are not
    touched: their practice_card_id nulls out, their card_id/field_def_id stay, and
    rebuild_mastery replays exactly as before."""
    db.delete(session)
    db.commit()


def db_update_practice_session_status(
    db: Session, session: PracticeSession, status: SessionStatus
) -> PracticeSession:
    session.status = status
    db.add(session)
    db.commit()
    db.refresh(session)
    return session
