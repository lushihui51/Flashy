# ADR 096: `last_activity_at` on cards and configurations, for the order of their lists

## Status

Superseded by ADR 117

## Context

PDR 029 lists what the user changed most recently first in every collection, from the moment the change is saved, wherever it was made. A card or a configuration changes when the user adds or edits it, a deck changes with its cards and configurations, and a change that reaches many items at once moves none of them.

New practice lists configurations grouped under their decks.

`card` and `deck_practice_config` carry `created_at` only.

`db_read_cards_for_deck` in `app/database_ops/card.py` has no `ORDER BY`. `db_read_deck_practice_configs_with_context` in `app/database_ops/deck_practice_config.py` orders by subject name, deck name and configuration name, and `groupConfigurationsByDeck` groups configurations by the deck it meets first.

`last_activity_at` is the only recency column on subjects and decks, written only by `touch()` in `app/services/activity.py`; a column-level `onupdate` stamps every update of a row, whether or not the row's own content changed (ADR 018).

`touch()` makes no session call, and every statement, ordering included, is a `db_*` function (ADR 055).

A card is updated by id through its own route or through `cards.update` in the batch edit (ADR 079), and its create and update routes touch its deck.

Several writes reach every card of a deck at once: the batch edit's field operations rewrite every card's values (ADR 079), every path that adds a field writes a value row for every card (ADR 057), and the deletion closure scrubs ids across a deck's rows (ADR 093).

Every instant is stamped by the server in UTC (ADR 019).

## Decision

We will give `card` and `deck_practice_config` each a `last_activity_at`, written only by `touch()` in `app/services/activity.py`, which accepts a card and a configuration as well as a subject and a deck.

We will touch a card when it is created and when it is updated by id, through its own route or through the batch edit's card update, and a configuration when it is created and when it is updated. A write that reaches many cards at once touches none of them.

We will order a deck's cards by `last_activity_at` descending, then by id; and configurations by their deck's `last_activity_at` descending, then the deck's id, then their own `last_activity_at` descending, then their id. The frontend groups configurations by deck in the order it receives them and sorts nothing.

We will set each existing row's `last_activity_at` to its `created_at` in the migration that adds the columns.

## Alternatives considered

### A separate `edited_at`

Rejected because it is a second recency column, which leaves the next collection to pick one and needs a writer and a guard of its own.

### A stamp the database sets on every update of the row

Rejected because a field change would then reorder the whole deck.

### `created_at` alone

Rejected because an edit would move nothing, against PDR 029.

### Configurations ordered by their own recency alone

Rejected because a deck whose card was just edited would stay below a deck whose configuration changed earlier, though PDR 029 has a deck change with its cards.

### The frontend sorting the groups by the decks list

Rejected because it is a second request, and a second source of order for one screen.

## Consequences

**Positive**

- The developer has one column and one writer ordering every collection PDR 029 orders by recency.
- The user's change that reaches every card of a deck moves none of them.
- The user finds a card just added or edited at the top of its deck.
- The user finds New practice's groups following their decks, with a configuration just made at the top of its group.

**Negative**

- The developer who adds a write that is the user's activity on a card or a configuration must call `touch()`, and a missed call leaves the item where it was with no error.
- The developer runs a migration that adds two columns and fills them.

**Neutral**

- The developer finds existing cards and configurations in the order they were made until each is next edited.
