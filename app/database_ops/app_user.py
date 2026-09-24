"""Persistence for the `app_user` table — the authenticated user, keyed by
`clerk_user_id`, and the root of every ownership chain. These are the only three
operations the table has: the row is created lazily on first sight of a Clerk id, its
timezone is kept in step with the `X-Timezone` header (ADR 019), and nothing else ever
writes it. Unlike every other module here the reads are not ownership-scoped, because
this table *is* the ownership scope."""

from sqlmodel import Session, select

from app.models.app_user import AppUser


def db_read_app_user_by_clerk_id(db: Session, clerk_user_id: str) -> AppUser | None:
    return db.exec(select(AppUser).where(AppUser.clerk_user_id == clerk_user_id)).first()


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
