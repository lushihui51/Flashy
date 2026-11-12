from sqlmodel import Session

from app.database_ops.home import db_read_home_steps
from app.database_ops.run import (
    db_read_active_run_listings,
    db_read_recent_run_listings,
    db_read_run_decks,
)
from app.database_ops.run_card import db_read_run_cards_for_runs
from app.models.app_user import AppUser
from app.models.home_payloads import HomeRead, HomeRun
from app.services.run import run_progress

ACTIVE_RUN_LIMIT = 3
RECENT_RUN_LIMIT = 3


def get_home(db: Session, user: AppUser) -> HomeRead:
    """Everything Home shows for `user`, in a number of statements that does not change
    with their practices, runs, decks or cards."""
    steps = None if user.first_practice_at is not None else db_read_home_steps(db, user.id)

    active = db_read_active_run_listings(db, user.id, ACTIVE_RUN_LIMIT)
    recent = db_read_recent_run_listings(db, user.id, RECENT_RUN_LIMIT)
    active_ids = [run.id for run, _ in active]
    decks_by_run = db_read_run_decks(db, active_ids + [run.id for run, _ in recent])
    cards_by_run = db_read_run_cards_for_runs(db, active_ids)

    def home_run(run, practice_name, progress):
        return HomeRun(
            **run.model_dump(),
            practice_name=practice_name,
            decks=decks_by_run.get(run.id, []),
            progress=progress,
        )

    return HomeRead(
        steps=steps,
        active_runs=[
            home_run(run, name, run_progress(cards_by_run.get(run.id, [])))
            for run, name in active
        ],
        recent_runs=[home_run(run, name, None) for run, name in recent],
    )
