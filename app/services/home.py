from sqlmodel import Session

from app.database_ops.deck import db_read_deck_listings
from app.database_ops.home import db_read_home_steps
from app.database_ops.run import (
    db_read_active_run_reads,
    db_read_recent_deck_ids,
    db_read_run_decks,
)
from app.database_ops.run_card import db_read_run_cards_for_runs
from app.mastery.strategy import MasteryStrategy
from app.models.app_user import AppUser
from app.models.home_payloads import HomeRead, HomeRun
from app.services.deck_listing import deck_summaries
from app.services.run import run_progress

ACTIVE_RUN_LIMIT = 3
RECENT_DECK_LIMIT = 3


def get_home(db: Session, strategy: MasteryStrategy, user: AppUser) -> HomeRead:
    """Everything Home shows for `user`, in a number of statements that does not change
    with their practices, runs, decks or cards."""
    steps = None if user.first_practice_at is not None else db_read_home_steps(db, user.id)

    runs = db_read_active_run_reads(db, user.id, ACTIVE_RUN_LIMIT)
    run_ids = [run.id for run, _ in runs]
    decks_by_run = db_read_run_decks(db, run_ids)
    cards_by_run = db_read_run_cards_for_runs(db, run_ids)
    active_runs = [
        HomeRun(
            **run.model_dump(),
            practice_name=practice_name,
            decks=decks_by_run.get(run.id, []),
            progress=run_progress(cards_by_run.get(run.id, [])),
        )
        for run, practice_name in runs
    ]

    recent_deck_ids = db_read_recent_deck_ids(db, user.id, RECENT_DECK_LIMIT)
    listings = db_read_deck_listings(db, user.id, deck_ids=recent_deck_ids)
    summaries = {row.id: row for row in deck_summaries(db, strategy, listings)}

    return HomeRead(
        steps=steps,
        active_runs=active_runs,
        recent_decks=[summaries[deck_id] for deck_id in recent_deck_ids],
    )
