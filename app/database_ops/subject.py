import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.models.subject import Subject


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


def db_read_subject(db: Session, subject_id: uuid.UUID) -> Subject | None:
    return db.get(Subject, subject_id)


def db_read_subjects(db: Session, user_id: uuid.UUID) -> list[Subject]:
    return list(db.exec(select(Subject).where(Subject.user_id == user_id)).all())


def db_update_subject(db: Session, subject: Subject, data: dict) -> Subject:
    for key, value in data.items():
        setattr(subject, key, value)
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
