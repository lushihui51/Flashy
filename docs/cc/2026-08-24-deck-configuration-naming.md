# "Practice config" was the wrong name; the schema was right all along

- **Date:** 2026-08-24
- **Prompted by:** the practice UI called `deck_practice_config` a "practice config", which
  inverted what the thing configures and made the New practice surface look redundant. The
  question raised: do the *database* names need to change too, since they are supposed to be
  the source of truth the frontend broke?
- **Outcome:** UI, routes and frontend artifacts renamed to "deck configuration" (commit
  `b24b4aa`); **the table, models and endpoints keep `deck_practice_config`** — the schema
  was already correct, and the evidence is below.

## The model, stated

Three distinct things, which the old UI vocabulary blurred into two:

1. **Practice** (`practice_session`) — one run. The overview lists them.
2. **New practice** — where a practice is made: choose deck configurations (at most one per
   deck), name the run, and it is created and started in one step (invariant 2).
3. **Deck configuration** (`deck_practice_config`) — belongs to **one deck**, and says which
   of that deck's `field_def`s act as prompts, which as answers, and how pools are drawn.
   Reusable; a practice is assembled *out of* them.

Calling (3) a "practice config" claims it configures a practice. It does not: it configures a
deck. What configures a practice is the *selection* of deck configurations plus its name,
which is (2). With the wrong name, (2) reads as a duplicate of (3), which is exactly the
confusion that surfaced.

## Does the schema need renaming? No.

`deck_practice_config` parses as "a deck's practice configuration" — deck first, with
"practice" naming what it is *for*, not what it configures. Everything the schema says about
the row agrees:

- `deck_id` is a `NOT NULL` FK with `ON DELETE CASCADE` (`app/models/deck_practice_config.py`):
  the row is deck-owned state and dies with the deck (ADR 015's "owned state cascades").
- `UNIQUE (deck_id, name)` — names are scoped *per deck*, which is only meaningful if the deck
  owns it.
- Every id inside its six arrays must resolve to a live `field_def` **of that deck**
  (`validate_deck_practice_config`, `app/services/deck_practice_config.py:38-52`). A
  configuration is unusable outside its deck by construction.
- Nothing in the practice tables points at it: `practice_deck` deliberately has no
  `source_config_id` (schema invariant 1, ADR 013). A practice never references a
  configuration — it *copies* what it needs at start. So the row has no relationship to a
  practice at all, only to a deck.

The one thing that can mislead is reading `practice_config` as a unit and treating `deck_` as
a qualifier — which is how this went wrong. That is a reading error, not a modelling error,
and renaming the table would cost an Alembic revision (table plus FK and constraint names),
the models, database_ops, services, routers, the endpoint path, regenerated OpenAPI types,
the api layer and every backend test — to make a correct name marginally harder to misread.
Rejected as not worth it. Revisit only if the same misreading recurs after the UI vocabulary
has settled.

Two backend strings *were* changed, because they are shown to the user verbatim rather than
being schema vocabulary: the duplicate-name error (now "A configuration with this name already
exists for this deck", which lands inline on the name input) and the 404 detail (now "Deck
configuration not found").

## Where deck configurations now live

A configuration belongs to a deck, so it lives on the deck's own page: `DeckDetailPage` gained
a **Cards / Configurations** tab pair, the same grammar `LibraryPage` uses for Subjects /
Decks. The tab is a URL param (`?tab=configurations`) so the builder can navigate away and
land back on the list it came from. The header's `+` follows the active tab.

The cross-deck "Practice configs" page is deleted. Nothing needs a list of configurations
spanning decks: the deck page covers management, and Phase 3's New practice surface will
present them grouped by deck as part of choosing what to practise.

Routes are `/deck-configurations/new` and `/deck-configurations/:configId/edit` — mirroring
`/cards/new`, which is the other deck-owned thing with both a deck-page entry point and a
standalone form that opens on a deck picker.

## Still carrying the old vocabulary

`docs/plans/004-frontend-rebuild-practice-setup.md` — its Canonical vocabulary table maps
"deck_config / config" to `deck_practice_config` and calls the surface the "config builder",
and Phase 3's text says "New config button" and "config list". The plan is not wrong, but its
wording predates this correction and should be brought in line before Phase 3 is executed, so
the next surface built does not reintroduce the blur. Not edited here — `docs/` outside `cc/`
needs explicit permission.
