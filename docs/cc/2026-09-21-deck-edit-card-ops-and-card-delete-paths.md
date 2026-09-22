# Deck edit "never carries card ops", and every path that deletes a card

- Date: 2026-09-21
- Prompted by: an /investigate session after task 013 T7 shipped the editor save confirm. The user saw `This removes 1 field from 20 cards, deletes 2 deck configurations and ends 1 practice in progress.` on the Ports deck and asked (1) how "a deck edit never carries card ops" is maintained when a field delete visibly changes every card, and (2) whether a card can only be deleted by cascade from its deck or subject, or from the edit-card page.
- Outcome: diagnosis only, no code changes. Two docs/code mismatches and one records gap found; listed under "Puts in question".

## Question 1 — what "card ops" means, and how the editor avoids them

"Card ops" are the entries under the `cards` key of the `PATCH /api/decks/{id}` body: `cards.create`, `cards.update`, `cards.delete` (`app/models/deck_payloads.py:62-65`, `:68-77`; contract in `docs/tasks/003-frontend-rebuild-creation-flows.md:146-165`). They act on `card` rows. A field delete is a `field_defs.delete` entry and acts on the `field_def` row. The two statements the user set against each other are about different things: the request's shape versus the server-side consequence of a field delete on card content.

### Frontend: the payload cannot contain `cards`, by omission (verified)

- `DeckEditorState` is `{ name, subjectId, fields, dirty }` — no cards (`frontend/src/lib/deckEditorReducer.ts:22-30`; the comment says "Cards are not here").
- `buildDeckBatchEditPayload` assigns only `name`, `subject_id`, and `field_defs` (`frontend/src/lib/deckEditorDiff.ts:20-38`, fields patch `:40-99`). No line in the file assigns `payload.cards`.
- `handleSaveEdit` hands that object to `updateDeck` unchanged (`frontend/src/components/library/DeckEditor.tsx:464-467`); `updateDeck` is the only caller of `PATCH /api/decks/{deck_id}` in the frontend (`frontend/src/api/deck.ts:18-20`), and `DeckEditor.tsx` is its only caller.
- Nothing strips or rejects a `cards` key; the diff simply never produces one. The generated `DeckBatchEdit` type still has `cards?: CardBatchOps | null`, so the compiler would accept it if a builder added it.
- Exactly one test pins this: `frontend/src/components/library/DeckEditor.test.tsx:547-548`, `expect(body.cards).toBeUndefined()`. The builder's own unit tests (`frontend/src/lib/deckEditorDiff.test.ts`) contain no assertion about `cards` at all (grep for `cards` returns nothing).
- History: task 003 line 15 records that the editor's Cards section and `EditorCard` staging were removed by commit `f4afa9a` under ADR 023 rule 3 ("Routine content (cards) belongs to neither form"). Before that, Phase 7.5 §1 (`docs/tasks/003-frontend-rebuild-creation-flows.md:834-836`) staged card removals and the diff did emit `cards.delete`.

### Backend: the endpoint still executes card ops (verified)

`apply_deck_batch_edit` handles `cards.delete` through the deletion closure (`app/services/deck_batch_edit.py:178-200`), then `cards.update` (`:202-231`) and `cards.create` (`:233-254`). Nothing rejects a `cards` key. Task 008 T2 left `DeckBatchEdit.cards` untouched when it removed `cards` from deck-create (`docs/tasks/008-dependency-cleanup.md:35`, out of scope at `:63`); task 013 MD-2 and T5 then wired `cards.delete` through the closure. Test `tests/api_tests/test_deck_batch_edit.py::TestCardsDeleteAlone::test_card_delete_removes_review_rows_and_issues_no_rebuild` exercises it end to end over HTTP and passes (run this session). So "never carries card ops" is a property of this client only; the API accepts them.

### What a field delete does to cards (verified)

1. The editor sends `field_defs.delete: [id]`. The service checks the id belongs to the deck, applies the two-field floor, then calls `apply_deletion(db, strategy, compute_deletion_impact(db, user_id, field_ids=ops.delete))` (`app/services/deck_batch_edit.py:136-155`).
2. `compute_deletion_impact` for a field-only request: `decks` is empty (`app/services/deletion.py:102`), so `cards = card_ids | cards-of-deleted-decks` is empty (`:109`) — no card row is planned for deletion. It collects configurations naming the field (`:111-113`), active runs naming it (`:115-117`), and `affected_card_count = db_count_cards_for_decks(explicit_field_decks, excluding=cards)` (`:123-127`; `app/database_ops/card.py:105-115`): every card on the deck that is not itself being deleted.
3. `apply_deletion` deletes runs, configurations, scrubs `shown_prompt_ids`, calls `db_delete_cards` with an empty set (no-op, `app/database_ops/card.py:118-122`), then `db_delete_field_defs`, which issues `DELETE FROM field_def WHERE id IN (...)` (`app/database_ops/field_def.py:164-168`), flushes, and rebuilds the deck's mastery (`app/services/deletion.py:149-159`).
4. The change to card content is a Postgres foreign-key cascade: `card_field_value.field_def_id` is `ondelete="CASCADE"` (`app/models/card_field_value.py:8-12`). Each card loses its one value row for that field; the `card` row survives. `tests/api_tests/test_deck_batch_edit.py::TestFieldDefsDeleteAlone::test_field_delete_cascades_card_field_value_rows` asserts exactly this and passes (run this session). Task 003 records it as designed: "A `field_defs.delete` entry needs no equivalent code: its rows go away via the existing FK cascade" (`docs/tasks/003-frontend-rebuild-creation-flows.md:167`).

So the confirm's "removes 1 field from 20 cards" describes the cascade's effect on card content. It is not evidence of a card op.

### Where the confirm's numbers come from (verified)

`handleSaveClick` (`frontend/src/components/library/DeckEditor.tsx:554-594`) reads `fieldsDeleted` and `cardsDeleted` off the diff, `cardsAffected` as `deck?.cards.length ?? 0` (`:563`) from the `readDeck` query (`:295`), and only `configurations_deleted` and `runs_deleted` from `readDeletionImpact({ fieldIds })` (`:577-584`); the response's `cards_affected` is not read. Dev database, read-only query this session: deck `Ports` has 20 cards and five fields including `Category Hint`, not archived — so the screenshot's 20 is the deck's card count and the delete was not confirmed. The server's `cards_affected` for the same request would also be 20 (all cards minus an empty deletion set). Inferred, not tested: the two agree unless cards were added or removed between the deck load and the click.

## Question 2 — every path that deletes a card row (verified)

A grep of `app/` for card deletion finds four paths, all ending in `db_delete_cards` (`app/database_ops/card.py:118-122`) inside `apply_deletion`:

1. `DELETE /api/cards/{card_id}` (`app/routers/api/card.py:129-134`) → `delete_card` (`app/services/deletion.py:179-187`). UI: `CardStandaloneForm` in edit mode at `/cards/:cardId/edit` (`frontend/src/App.tsx:44`), `Delete card` → confirm titled `Delete card?` with description `This can't be undone.` (`frontend/src/components/library/CardStandaloneForm.tsx:192-204`, `:313-323`). `deleteCard` (`frontend/src/api/card.ts:22-23`) has no other caller.
2. `DELETE /api/decks/{deck_id}` (`app/routers/api/deck.py:105`) → `delete_deck` → the closure lists the deck's cards (`app/services/deletion.py:109`) and bulk-deletes them explicitly (`:153`). UI: `Delete deck` in `DeckEditor.tsx:507`.
3. `DELETE /api/subjects/{subject_id}` (`app/routers/api/subject.py:54`) → `delete_subject` → decks of the subject (`app/services/deletion.py:102`) → their cards. UI: `Delete subject` in `SubjectForm.tsx:149`.
4. `PATCH /api/decks/{deck_id}` with `cards.delete` (`app/services/deck_batch_edit.py:184-199`). API only; no frontend code sends it.

`card.deck_id` is `ondelete="CASCADE"` (`app/models/card.py:11`, ADR 015), but the closure deletes cards before decks (`app/services/deletion.py:153` then `:155`), so that cascade never fires on the app's own paths — consistent with ADR 051's "Foreign-key cascades remove only what the closure does not count." No practice, copy, or field endpoint deletes a card. A grep of `app/` for direct `db.delete(` or `delete(Card|FieldDef|Deck|Subject)` outside `services/deletion.py` and `database_ops/` returns nothing.

Answer: true for the user interface (card edit page, deck delete, subject delete) and false for the API, which has the fourth path.

## Puts in question

1. **Task 013 Contracts, `docs/tasks/013-deletion-drops-influence.md:156`, and MD-2 (`:20`)** describe the editor save confirm as firing when "`cards.delete` is non-empty" and define `cards_affected` as "the count of cards in editor state not pending removal". That is the pre-`f4afa9a` editor. Under ADR 023 the editor has no card state, `cards.delete` is never non-empty from this client, and the code reads `deck.cards.length`. T7's Notes record the gap; the Contracts text itself has not been reconciled. A /sync item.
2. **ADR 023's alternatives** name only deck-create's vestigial `cards` array. The batch edit's `cards` ops remain a supported, tested API surface with no UI caller; task 008 marks them "untouched" and out of scope (`docs/tasks/008-dependency-cleanup.md:35`, `:63`) and task 013 builds on them, but no ADR or minor decision states why they are kept. A records gap, not a defect.
3. **AGENTS.md line 25** ("Every deletion of a subject, deck, field, or card goes through `compute_deletion_impact` then `apply_deletion`") has no source-scan guard test; the three source-scan tests are `test_mastery.py`, `test_models_layout_guard.py`, and `test_schema_guard.py`, none about deletion. AGENTS.md's own convention says a rule that can drift silently gets one. Today nothing drifts (grep above), so this is a maintenance observation, not a bug.

## Not settled

- Whether keeping the batch edit's card ops as an API-only surface was decided or merely deferred — no document says.
- Client/server agreement of `cards_affected` under a concurrent card add or delete between deck load and Save: reasoned from the code, not reproduced.

## Noticed in passing

- `DELETE /fields/{field_id}/hard` (`app/routers/api/field_def.py:124-140`) deletes a field with `db.delete(field_def)` (`app/database_ops/field_def.py:110-112`), bypassing the closure. ADR 049 exempts it as dormant and AGENTS.md line 68 says the archive endpoints are unexposed, but the route is mounted and callable; AGENTS.md line 25 reads as if it did not exist.
- `frontend/src/lib/deckEditorDiff.test.ts` has no test that the builder omits `cards`; the only pin is one integration test in `DeckEditor.test.tsx`.
