import uuid
from collections.abc import Collection

from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, func, select

from app.models.deck import Deck
from app.models.subject import Subject, SubjectListing
from app.refusals import Refusal


def db_create_subject(db: Session, data: dict) -> Subject:
    subject = Subject(**data)
    db.add(subject)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise Refusal(
            "subject_name_taken", "subject (user_id, name) already exists"
        ) from None
    db.refresh(subject)
    return subject


def db_read_subject(db: Session, subject_id: uuid.UUID, user_id: uuid.UUID) -> Subject | None:
    return db.exec(
        select(Subject).where(Subject.id == subject_id, Subject.user_id == user_id)
    ).first()


def db_read_subjects(db: Session, user_id: uuid.UUID) -> list[Subject]:
    # Recency order, server-side — the frontend never sorts this list.
    return list(
        db.exec(
            select(Subject)
            .where(Subject.user_id == user_id)
            .order_by(col(Subject.last_activity_at).desc(), col(Subject.id))
        ).all()
    )


def _with_deck_counts(db: Session, subjects: list[Subject]) -> list[SubjectListing]:
    deck_counts = dict(
        db.exec(
            select(Deck.subject_id, func.count())
            .where(col(Deck.subject_id).in_([subject.id for subject in subjects]))
            .group_by(col(Deck.subject_id))
        ).all()
    )
    return [
        SubjectListing(**subject.model_dump(), deck_count=deck_counts.get(subject.id, 0))
        for subject in subjects
    ]


def db_read_subject_listings(db: Session, user_id: uuid.UUID) -> list[SubjectListing]:
    """Same subjects as db_read_subjects, plus each one's deck_count — one grouped
    query regardless of how many subjects there are, never one query per subject."""
    subjects = db_read_subjects(db, user_id)
    if not subjects:
        return []
    return _with_deck_counts(db, subjects)


def db_read_subject_listing(
    db: Session, subject_id: uuid.UUID, user_id: uuid.UUID
) -> SubjectListing | None:
    """One subject with its deck_count; None when it does not exist or is another
    user's."""
    subject = db_read_subject(db, subject_id, user_id)
    if subject is None:
        return None
    return _with_deck_counts(db, [subject])[0]


def db_update_subject(db: Session, subject: Subject, data: dict) -> Subject:
    if not data:
        return subject
    for key, value in data.items():
        setattr(subject, key, value)
    db.add(subject)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise Refusal(
            "subject_name_taken", "subject (user_id, name) already exists"
        ) from None
    db.refresh(subject)
    return subject


def db_read_owned_subject_ids(
    db: Session, user_id: uuid.UUID, ids: Collection[uuid.UUID]
) -> set[uuid.UUID]:
    """The subset of `ids` that exist and belong to user_id — compute_deletion_impact's
    ownership check. Missing from the returned set means either
    foreign or nonexistent; the caller can't tell which and doesn't need to."""
    if not ids:
        return set()
    return set(
        db.exec(
            select(Subject.id).where(col(Subject.id).in_(ids), Subject.user_id == user_id)
        ).all()
    )


def db_stage_delete_subjects(db: Session, ids: Collection[uuid.UUID]) -> None:
    """Bulk delete by id, no commit — apply_deletion owns the transaction.
    FK cascades remove everything the subject owns; the caller has already computed
    exactly which decks, fields, cards, configurations, and runs go with them."""
    if not ids:
        return
    db.execute(delete(Subject).where(col(Subject.id).in_(ids)))
