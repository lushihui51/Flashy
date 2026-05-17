import uuid

from sqlmodel import Session

from app.models.subject import Subject


def db_create_subject(db: Session, name: str) -> Subject:
    subject = Subject(name=name)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


def db_read_subject(db: Session, id: uuid.UUID) -> Subject | None:
    return db.get(Subject, id)


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
