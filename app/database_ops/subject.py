import uuid
from typing import List

from sqlmodel import Session, select

from app.models.subject import Subject


def db_create_subject(
    db: Session, name: str, icon: str | None = None, description: str | None = None
) -> Subject:
    subject = Subject(name=name, icon=icon, description=description)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


def db_read_subject(db: Session, id: uuid.UUID) -> Subject | None:
    return db.get(Subject, id)


def db_read_subjects(db: Session) -> List[Subject]:
    subjects = db.exec(select(Subject)).all()
    return list(subjects)


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
