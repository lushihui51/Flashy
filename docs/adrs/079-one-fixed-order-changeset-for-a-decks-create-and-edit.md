# ADR 079: One fixed-order changeset for a deck's create and edit

## Status

Active

## Context

A deck's structure is its `field_def` rows, referenced by id everywhere (ADR 009), and a deck always has at least two active fields. A card's content is one `card_field_value` row per active field of its deck, `""` when unfilled, so every path that adds a field writes a row for every existing card in the same transaction.

The deck form collects every change to a deck's name, fields and cards and saves them at once. One save can create a field and fill it on a card, and the field has no id until the server writes it.

The backend commits a request's writes once, and a failure before the commit rolls every write back. A flow that spans several operations is a service.

## Decision

We will have `PATCH /api/decks/{deck_id}` take one `DeckBatchEdit` changeset, field operations and card operations together, and `apply_deck_batch_edit` in `app/services/deck_batch_edit.py` apply it in one transaction in a fixed order: field create, update, delete, reorder, then card delete, update, create.

A field created in the request is named by a `client_key` the client chooses, valid in that request alone and accepted wherever a field id is, a card update included. A duplicated `client_key`, or a card named twice in `cards.update`, is refused before anything is applied, and any failure rolls the whole changeset back.

`POST /api/decks` likewise writes the deck and its fields in one transaction, through `create_deck_atomic` in `app/services/deck_create.py`.

## Alternatives considered

### Client-minted uuids for new fields

Rejected because an id minted in the browser becomes the row's identity, while a `client_key` dies with the request.

### Order-independent application with a resolver

Rejected because the fixed order is what lets a card update name a field created in the same request for free.

## Consequences

**Positive**

- The developer adds a deck operation as one phase in a known order, and a card update names a field created in the same request with no resolver.
- The developer of the deck form builds one diff for one request shape.
- The user's save lands whole or not at all; nothing half-applied reaches the database.

**Negative**

- The developer who adds a phase places it by hand after everything it names, since a phase placed earlier fails for every request that combines them.

**Neutral**

- The developer treats a `client_key` as a name that dies with the response; the row's identity is the id the server minted.
