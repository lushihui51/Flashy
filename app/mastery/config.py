from functools import lru_cache

from app.mastery.ema import EmaStrategy
from app.mastery.strategy import MasteryStrategy


@lru_cache
def get_mastery_strategy() -> MasteryStrategy:
    """The one place that constructs the active strategy. Everything else — routers,
    services, tests — receives a MasteryStrategy as a parameter instead of importing
    EmaStrategy directly. Swapping the default here later is a config change, not a
    search-and-replace."""
    return EmaStrategy()
