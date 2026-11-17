"""Persistence for the `app_user` table — one row per user, the root of every ownership
chain. A user's row is keyed by `clerk_user_id` and created lazily on first sight of a
Clerk id; the example user's row is the one row with no Clerk identity, and nothing here
creates it. These are the only operations the table has: a row is created, its timezone
is kept in step with the `X-Timezone` header, its first practice is stamped once, its
Clerk identity is taken off to make it the example user or given back to the example
user, and nothing else ever writes it. A guest's request, answered as the example user,
has its transaction made read only here once that row is read. Unlike every other module
here the reads are not ownership-scoped, because this table *is* the ownership scope."""

import uuid
from datetime import datetime

from sqlalchemy import text, update
from sqlmodel import Session, col, select

from app.models.app_user import AppUser


def db_read_app_user_by_clerk_id(db: Session, clerk_user_id: str) -> AppUser | None:
    return db.exec(select(AppUser).where(AppUser.clerk_user_id == clerk_user_id)).first()


def db_read_example_app_user(db: Session) -> AppUser | None:
    """The example user, the one row with no Clerk identity, or None when the database has none."""
    return db.exec(select(AppUser).where(col(AppUser.clerk_user_id).is_(None))).first()


def db_lock_transaction_read_only(db: Session) -> None:
    """Makes the session's open transaction read only, so a later statement that writes raises in PostgreSQL. No commit."""
    db.execute(text("SET TRANSACTION READ ONLY"))


def db_create_app_user(db: Session, clerk_user_id: str, timezone: str) -> AppUser:
    """Commits, so an `IntegrityError` on the unique `clerk_user_id` surfaces here and
    propagates: two concurrent first-sight requests race, and the caller answers that by
    rolling back and re-reading the winner's row."""
    user = AppUser(clerk_user_id=clerk_user_id, timezone=timezone)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def db_update_app_user_timezone(db: Session, user: AppUser, timezone: str) -> AppUser:
    """`user` is a row this session already loaded, so assigning the attribute is
    enough for the unit of work to track it — no `add` is needed."""
    user.timezone = timezone
    db.commit()
    db.refresh(user)
    return user


def db_update_app_user_clerk_id(db: Session, user: AppUser, clerk_user_id: str | None) -> AppUser:
    """Sets the Clerk identity of `user`, a row this session already loaded, and commits;
    None makes the row the example user. Raises `IntegrityError` when another row
    already holds `clerk_user_id`, or, for None, when an example user already exists."""
    user.clerk_user_id = clerk_user_id
    db.commit()
    db.refresh(user)
    return user


def db_stage_set_first_practice_at(db: Session, user_id: uuid.UUID, at: datetime) -> None:
    """Stamps the user's first practice, leaving a stamp already there untouched. No
    commit: the caller's transaction is the practice's own, so a refused practice leaves
    it unwritten."""
    db.execute(
        update(AppUser)
        .where(col(AppUser.id) == user_id, col(AppUser.first_practice_at).is_(None))
        .values(first_practice_at=at)
    )
