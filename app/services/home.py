from sqlmodel import Session

from app.database_ops.deck import db_read_deck_listings
from app.database_ops.home import db_read_home_steps
from app.database_ops.practice_card import db_read_practice_cards_for_runs
from app.database_ops.practice_run import (
    db_read_active_practice_runs_with_decks,
    db_read_recent_deck_ids,
)
from app.mastery.strategy import MasteryStrategy
from app.models.app_user import AppUser
from app.models.home_payloads import HomeActivePractice, HomeRead
from app.services.deck_listing import deck_summaries
from app.services.practice_run import run_progress

ACTIVE_PRACTICE_LIMIT = 3
RECENT_DECK_LIMIT = 3


def get_home(db: Session, strategy: MasteryStrategy, user: AppUser) -> HomeRead:
    """Everything Home shows for `user`, in a number of statements that does not change
    with their practices, decks or cards."""
    steps = None if user.first_practice_at is not None else db_read_home_steps(db, user.id)

    runs = db_read_active_practice_runs_with_decks(db, user.id, ACTIVE_PRACTICE_LIMIT)
    cards_by_run = db_read_practice_cards_for_runs(db, [run.id for run in runs])
    active_practices = [
        HomeActivePractice(**run.model_dump(), progress=run_progress(cards_by_run.get(run.id, [])))
        for run in runs
    ]

    recent_deck_ids = db_read_recent_deck_ids(db, user.id, RECENT_DECK_LIMIT)
    listings = db_read_deck_listings(db, user.id, deck_ids=recent_deck_ids)
    summaries = {row.id: row for row in deck_summaries(db, strategy, listings)}

    return HomeRead(
        steps=steps,
        active_practices=active_practices,
        recent_decks=[summaries[deck_id] for deck_id in recent_deck_ids],
    )
