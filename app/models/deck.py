import uuid
from datetime import datetime

from sqlmodel import DateTime, Field, UniqueConstraint, func

from app.models.base import AppModel, TimestampMixin
from app.models.card import CardRead
from app.models.field_def import FieldDefCreate, FieldType

DeckFieldOrderKey = str
"""Either a real field_def uuid (as a string) or a `field_defs.create` entry's
`client_key` — §2.3's "(uuid | client_key)" union has no natural Python type, so this
is validated by resolving each entry against both sets in the batch-edit service
rather than at the Pydantic layer."""


class DeckBase(AppModel):
    subject_id: uuid.UUID = Field(foreign_key="subject.id", ondelete="CASCADE")
    name: str

    __table_args__ = (UniqueConstraint("subject_id", "name"),)


class Deck(DeckBase, TimestampMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # D13 — see Subject's identical field (app/models/subject.py) for the full
    # rationale. No `onupdate`; the only writer is `touch()`.
    last_activity_at: datetime = Field(
        sa_type=DateTime(timezone=True), sa_column_kwargs={"server_default": func.now()}
    )


class DeckRead(DeckBase):
    id: uuid.UUID
    created_at: datetime
    last_activity_at: datetime


class DeckSummary(DeckRead):
    """DeckRead plus preview data for a list row (Phase 2.6) — card_count and
    field_names (position order, active fields only). Only `GET /api/decks` returns
    this; the single-deck reads (`GET`/`POST`/`PATCH /api/decks/{id}`) return the
    richer `DeckDetail` instead, which already includes everything here except these
    two list-row-only fields."""

    card_count: int
    field_names: list[str]


class FieldDefBatchCreate(AppModel):
    client_key: str
    name: str
    type: FieldType


class FieldDefBatchUpdate(AppModel):
    id: uuid.UUID
    name: str | None = None
    type: FieldType | None = None


class FieldDefBatchOps(AppModel):
    """§2.3's `field_defs` changeset. Applied in the stated order (create → update →
    delete → reorder) inside the batch-edit transaction — this model just carries the
    four lists; the service resolves ids/client_keys and enforces D3."""

    create: list[FieldDefBatchCreate] = Field(default_factory=list)
    update: list[FieldDefBatchUpdate] = Field(default_factory=list)
    delete: list[uuid.UUID] = Field(default_factory=list)
    order: list[DeckFieldOrderKey] = Field(default_factory=list)


class CardBatchCreate(AppModel):
    """`values` is keyed by a real field_def id or a same-request `client_key`
    (§2.3, widened in Phase 7 — see `CardBatchUpdate`)."""

    values: dict[str, str | None] = Field(default_factory=dict)


class CardBatchUpdate(AppModel):
    """`values` is partial (only changed fields), keyed by a real field_def id or a
    same-request `client_key` — the deck editor's edit-mode diff (Phase 7) can set an
    existing card's value for a field created in the very same request (field
    creates are always applied before card updates, per the stated operation order,
    so the field already has a real row by the time this runs)."""

    id: uuid.UUID
    values: dict[str, str | None] = Field(default_factory=dict)


class CardBatchOps(AppModel):
    create: list[CardBatchCreate] = Field(default_factory=list)
    update: list[CardBatchUpdate] = Field(default_factory=list)
    delete: list[uuid.UUID] = Field(default_factory=list)


class DeckBatchEdit(AppModel):
    """`PATCH /api/decks/{id}` body (§2.3, Phase 6). Every top-level key is optional —
    a request can touch just `name`, just `field_defs`, or any combination — but the
    whole thing is applied as one transaction: a failure anywhere rolls back
    everything, including an already-changed `name`."""

    name: str | None = None
    subject_id: uuid.UUID | None = None
    field_defs: FieldDefBatchOps | None = None
    cards: CardBatchOps | None = None


class DeckCardCreate(AppModel):
    """One card in an atomic deck-create payload: `values[i]` belongs to
    `field_defs[i]` by position (D6) — no client-side field ids yet to key by."""

    values: list[str | None]


class DeckCreate(AppModel):
    name: str
    subject_id: uuid.UUID
    field_defs: list[FieldDefCreate]
    cards: list[DeckCardCreate]


class DeckFieldDefRead(AppModel):
    id: uuid.UUID
    name: str
    type: FieldType
    position: int


class DeckDetail(AppModel):
    id: uuid.UUID
    name: str
    subject_id: uuid.UUID
    created_at: datetime
    last_activity_at: datetime
    field_defs: list[DeckFieldDefRead]
    cards: list[CardRead]
