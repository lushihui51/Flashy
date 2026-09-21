import uuid
from collections.abc import Collection

from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, func, select

from app.models.deck import Deck
from app.models.subject import Subject, SubjectSummary
from app.services.activity import touch


def db_create_subject(db: Session, data: dict) -> Subject:
    subject = Subject(**data)
    db.add(subject)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("Subject with this name already exists for this user") from None
    db.refresh(subject)
    return subject


def db_read_subject(db: Session, subject_id: uuid.UUID, user_id: uuid.UUID) -> Subject | None:
    return db.exec(
        select(Subject).where(Subject.id == subject_id, Subject.user_id == user_id)
    ).first()


def db_read_subjects(db: Session, user_id: uuid.UUID) -> list[Subject]:
    # D13: recency order, server-side — the frontend never sorts this list.
    return list(
        db.exec(
            select(Subject)
            .where(Subject.user_id == user_id)
            .order_by(col(Subject.last_activity_at).desc(), col(Subject.id))
        ).all()
    )


def db_read_subjects_with_summary(db: Session, user_id: uuid.UUID) -> list[SubjectSummary]:
    """Same subjects as db_read_subjects, plus each one's deck_count — one grouped
    query regardless of how many subjects there are, never one query per subject
    (Phase 2.6)."""
    subjects = db_read_subjects(db, user_id)
    if not subjects:
        return []
    subject_ids = [subject.id for subject in subjects]

    deck_counts = dict(
        db.exec(
            select(Deck.subject_id, func.count())
            .where(col(Deck.subject_id).in_(subject_ids))
            .group_by(col(Deck.subject_id))
        ).all()
    )

    return [
        SubjectSummary(**subject.model_dump(), deck_count=deck_counts.get(subject.id, 0))
        for subject in subjects
    ]


def db_update_subject(db: Session, subject: Subject, data: dict) -> Subject:
    if not data:
        return subject
    for key, value in data.items():
        setattr(subject, key, value)
    # D13: own-column edit — touch() bumps the recency sort key.
    touch(db, subject)
    db.add(subject)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("Subject with this name already exists for this user") from None
    db.refresh(subject)
    return subject


def db_delete_subject(db: Session, subject: Subject) -> None:
    db.delete(subject)
    db.commit()


def db_read_owned_subject_ids(
    db: Session, user_id: uuid.UUID, ids: Collection[uuid.UUID]
) -> set[uuid.UUID]:
    """The subset of `ids` that exist and belong to user_id — compute_deletion_impact's
    ownership check (ADR 051 step 1). Missing from the returned set means either
    foreign or nonexistent; the caller can't tell which and doesn't need to."""
    if not ids:
        return set()
    return set(
        db.exec(
            select(Subject.id).where(col(Subject.id).in_(ids), Subject.user_id == user_id)
        ).all()
    )


def db_delete_subjects(db: Session, ids: Collection[uuid.UUID]) -> None:
    """Bulk delete by id, no commit — apply_deletion (ADR 051) owns the transaction.
    FK cascades remove everything the subject owns; the caller has already computed
    exactly which decks, fields, cards, configurations, and runs go with them."""
    if not ids:
        return
    db.execute(delete(Subject).where(col(Subject.id).in_(ids)))
