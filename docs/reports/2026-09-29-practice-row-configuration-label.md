# Practice list rows and configuration default names

- **Date:** 2026-09-29
- **Prompted by:** user feedback item 3. Each practice overview row shows subject · deck chips and dates. The user wants the row to show only its configuration's name, and says configuration default names (also dates) don't say what a configuration contains.
- **Outcome:** diagnosis only, no code changes. The design is deferred until the user answers the open questions below.
- **Code cited against:** `a2ed962`

## What the code does now

1. **A practice takes one configuration per deck, not one per practice.**
   - `PracticeRunCreate.deck_practice_config_ids` is a list (`app/models/practice_run.py:42-44`).
   - New practice stores its selection keyed by deck (`frontend/src/pages/PracticeCreatePage.tsx:217`).
   - `practice_deck` is unique per `(practice_run_id, deck_id)`.
   - A practice spanning three decks therefore has three configurations. ADR 040 considered making runs single-config and rejected it.
2. **The row** (`frontend/src/components/practice/PracticeRunRow.tsx:24-35`) renders four things:
   - the practice name;
   - the status badge;
   - `SessionDeckChips`, one `subject · deck` chip per snapshot;
   - `formatDate(created_at)`.
3. **Both names default to a timestamp.**
   - The practice name defaults to one at `frontend/src/pages/PracticeCreatePage.tsx:38`, and the configuration name at `frontend/src/components/library/DeckConfigurationEditor.tsx:136-139`.
   - A row whose practice kept the default name therefore shows its date twice.
   - The configuration picker shows nothing but dates for configurations that kept theirs.
4. **A run cannot reach its configuration's name.**
   - At run start the snapshot copies the six prompt/answer arrays but not the name.
   - `practice_deck.source_config_id` (`app/models/practice_deck.py:38-40`) is attribution only and appears on no payload (`app/models/practice_run_payloads.py:16-40`).
   - Any material edit sets it to null (`app/services/deck_practice_config.py:97-101`), and so does deleting the configuration (`ON DELETE SET NULL`).
   - A row that read the live name through this link would lose its label as soon as the configuration's fields changed.

## What this means for the request

- "Only the configuration" means one label per deck for a multi-deck practice, not a single label.
- The label needs a source that survives editing or deleting the configuration. There are two options:
  - Snapshot the configuration name onto `practice_deck` at start, the way ADR 013 snapshots the arrays, and have rerun copy it.
  - Build a label from the snapshot's own field arrays.
- If configuration names still default to dates, showing them on the row only replaces one date with another. The default name has to change first.

## Open questions

1. Should a configuration's default name be derived from its layout (prompt-side field names → answer-side field names), or should there be no default, making the name required?
2. On a multi-deck practice's row, should there be one chip per configuration name with no deck name?
3. Should the row label be the configuration name snapshotted at start (a rename after start doesn't reach the practice), or the live name with a fallback when the link is gone?
4. What label should existing runs show, given their snapshots carry no name?

## ADRs, tasks, and tests this touches

- **ADR 013:** adding a name column extends what the snapshot copies.
- **ADR 040:** `PracticeRunDeckSummary`'s docstring says `source_config_id` "is not surfaced on any API payload". A snapshotted name keeps that true, and reading the live name would contradict it.
- **ADR 021 and the vocabulary table in `docs/tasks/004-practice-setup.md`:** the row label is a "configuration" in user-facing copy.
- **Task 004 T5:** the `SessionDeckChips` Done-when. The same component renders on `PracticeDetailsPage`, so changing it changes both surfaces.
