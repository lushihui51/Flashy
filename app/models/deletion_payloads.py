from app.models.base import AppModel


class DeletionImpactRead(AppModel):
    """The `GET /api/deletion-impact` response (ADR 051): the deletion closure's size,
    by type, for a delete confirm to word its warning (task 013 MD-2, MD-3). Each
    field is the count of one closure set `compute_deletion_impact` returns —
    `cards_affected` is `DeletionImpact.affected_card_count`, every other field is
    `len()` of the matching id set. Never nests another shape."""

    subjects_deleted: int
    decks_deleted: int
    fields_deleted: int
    cards_deleted: int
    cards_affected: int
    configurations_deleted: int
    runs_deleted: int
