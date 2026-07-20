import uuid
from typing import List, Tuple

from sqlmodel import Session, col, func, select

from app.models.deck import Deck
from app.models.subject import Subject


def db_create_subject(db: Session, payload: dict) -> Subject:
    subject = Subject(**payload)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


def db_read_subject(db: Session, id: uuid.UUID) -> Tuple[Subject, int] | None:
    deck_count = (
        select(func.count(col(Deck.id)))
        .where(Deck.subject_id == Subject.id)
        .correlate(Subject)
        .scalar_subquery()
        .label("deck_count")
    )
    row = db.exec(select(Subject, deck_count).where(Subject.id == id)).first()

    # subject = db.get(Subject, id)
    return row


def db_read_subjects(db: Session) -> List[Tuple[Subject, int]]:
    deck_count = (
        select(func.count(col(Deck.id)))
        .where(Deck.subject_id == Subject.id)
        .correlate(Subject)
        .scalar_subquery()
        .label("deck_count")
    )
    rows = db.exec(select(Subject, deck_count)).all()
    return list(rows)


def db_update_subject(db: Session, subject: Subject, payload: dict) -> Subject:
    for key, value in payload.items():
        setattr(subject, key, value)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


def db_delete_subject(db: Session, subject: Subject) -> None:
    db.delete(subject)
    db.commit()


def db_read_all_subjects(db: Session) -> List[Subject]:
    subjects = db.exec(select(Subject)).all()
    return list(subjects)
