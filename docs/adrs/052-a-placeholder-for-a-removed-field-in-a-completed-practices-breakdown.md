# ADR 052: A placeholder for a removed field in a completed practice's breakdown

## Status

Deprecated by the record rules' Type test

## Context

ADR 049 deletes a field outright, deletes the active runs naming it, and leaves completed runs alone, "their frozen arrays keeping the dead id, which rerun and the breakdown already tolerate". A follow-up on 2026-09-22, prompted by the wording of the editor's save confirm, asked what a completed practice actually shows once a field it used is gone. The answer, read from the code: the run, its snapshot, and its practice cards survive, and the practice cards still hold the dead id in their `prompts` and `answers` arrays. The breakdown resolves those ids against the deck's field rows and drops any id with no row (`_resolve_field_values` in `app/services/practice_run.py`), so the field vanishes from every attempt with no marker. Its ratings went with its review rows under ADR 048, so nothing could have shown them. An attempt's Passed or Failed status is stored on the practice card, so a Failed attempt whose only Again was on the deleted field now shows only Good or Easy badges, and an attempt whose sole answer field was the deleted one shows no answers at all. The Fields section lists the deck's current active fields with mastery from the rebuilt ledger. Nothing on the page says a field was removed.

ADR 049's Consequences accepted that history changes; "tolerate" understated what the page then says. Under ADR 047 an ephemeral thing goes only when it can no longer function, and a completed practice still functions: its breakdown renders. The question was whether to keep it and make it honest, or stop keeping it.

## Decision

We will keep, in a completed practice's breakdown, an attempt field whose field row no longer exists as a placeholder, rendered as **Removed field**, instead of dropping it silently.

- `ResolvedFieldValue` gains `removed: bool = False`. A placeholder carries the stored id, an empty name and value, `type` text, and `removed = True`; on the answer side its `rating` is `None`, which is now the one case that value has.
- Only the breakdown's resolution emits placeholders, through a `keep_removed` switch on `_resolve_field_values`. Live entries keep their position order; placeholders follow them, in the order the ids were stored. The live run's current-card path keeps dropping unknown ids: an active run naming a deleted field is deleted, so a placeholder there would be a bug, not history.
- The attempt sheet renders a placeholder as the muted label **Removed field**, with no value and no rating badge: the rating is gone, not absent. **Removed field** is a row in the vocabulary, matching the editor's own verb for a field delete.
- The Fields section, the completion buckets, the primary field, the mastery deltas, and Re-run's `nothing_to_rerun` refusal are unchanged.

## Alternatives considered

### Leave the silent gap

Rejected. A Failed attempt with no failing rating visible is a page that misrepresents what happened, and the premise that a warning and its outcome must agree applies to a record and its display just as well.

### Delete completed practices that name the field too

Rejected. It reverses the rule that completed runs are untouched, it strains the rule that an ephemeral thing goes only when it can no longer function, since the practice still functions, and the proportion is wrong: removing one field of six would erase every past practice that ever used it, which for an old deck is most of its history. The deck and subject delete paths already delete completed practices when their decks go; that is the deck going, not a field.

### Keep the field's review rows so the rating can be shown

Rejected. It reverses the ownership of a review row by its field, under which the row cascades with it, and it would keep the deleted field's influence alive in the ledger the rebuild reads. The placeholder is honest about the rating being gone.

### A page-level banner instead of per-attempt placeholders

Rejected. The attempts are where the page misleads, so the marker belongs there. A banner on top of the placeholders was left out as not needed; nothing here forbids adding one later.

### Show the removed field in the Fields section as well

Rejected. That section lists mastery and delta per active field, and the removed field has no mastery rows to report. A row with no numbers would be noise.

### Let the frontend infer removal

Rejected. The frontend has no list of live field ids to compare an attempt against, and field resolution is on the server precisely so the client never reasons from bare ids.

## Consequences

**Positive**

- The user sees an honest completed practice: a Failed attempt shows the field that failed it, as a placeholder, and an attempt keeps its shape.
- The developer keeps history with one flag on an existing shape plus one rendering branch.
- The developer gives `RatedFieldValue.rating`'s `None` case a real meaning again.

**Negative**

- The user cannot learn what the removed field was called or how it was rated; both are gone with the row.
- The developer carries `removed` on every resolved field, including the live run's current card, where it is always `False`.
- The developer's attempt field lists are no longer purely position-sorted; placeholders trail the live fields.

**Neutral**
