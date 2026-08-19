# Frontend rewrite survey

Written at the end of Phase 7 (`docs/plans/001-flashy-schema-rewrite.md`). This is raw
input for the frontend execution plan that follows — not a design document itself.

## Per-screen status

| Screen | Route | Status | Notes |
|---|---|---|---|
| Dashboard | `/dashboard` | **Rebuild from scratch** | `DashboardOverview.tsx` is a Clerk sign-in/sign-up stub with no real content and a stray debug `console.log` of the publishable key. Never had a product surface; still doesn't. |
| Subjects | `/subjects` | **Works against new API** | Full CRUD (`SubjectsOverview.tsx`) rewritten this phase against `/api/subjects`. The `deck_count` aggregate it used to display is gone (dropped by design in Phase 1); the summary line now just says "N subjects." |
| Decks | `/decks` | **Works against new API** | Full CRUD (`DecksOverview.tsx`) rewritten against `/api/decks`. The old `deck_schema` inline field editor (a `KeyValueList` of name→type pairs) is gone — fields are now first-class `field_def` rows managed on the deck's own page, not at deck-creation time. Subject filter chips still work. |
| Deck detail | `/decks/:deckId` | **Rebuild from scratch (smoke path only)** | Brand new page (`DeckDetail.tsx`) — didn't exist before this phase, since decks previously had no drill-down. Covers fields, cards, and practice configs with bespoke inline forms (no `FormModal`, since its `FieldProperties` union doesn't support the dynamic per-deck field sets this page needs). Deliberately ugly and pool-less per the plan's "ugly is fine" instruction — the real rewrite should redesign this screen, not extend it. |
| Practice runner | `/practices/:sessionId` | **Rebuild from scratch (smoke path only)** | Brand new page (`PracticeRunner.tsx`). Chains three requests (current practice card → underlying card → field defs) just to render readable prompt/answer text — see API awkwardness below. Shows mastery after rating. Functional but not a design to build on. |
| Practices list | `/practices` | **Broken stub** | `PracticesOverview.tsx` is literally `<div>Decks Overview</div>` — a copy-pasted placeholder, not wired to any API, mislabeled. No practice-session list ever existed. Needs building from nothing. |

## Components carried forward as inventory (not dead code)

Per the plan's instruction, nothing was deleted just because it's currently unused:

- `KeyValueList.tsx` — the old deck-schema key/value editor. No current screen invokes it (the `deck_schema` concept it edited no longer exists), but it's still wired as a `FormModal` field type (`type: 'keyvalue'`) and left in place as a reusable pattern.
- `Icon.tsx` / `CardIcon.tsx` — the icon picker used by `SubjectsOverview`'s `type: 'icon'` field. Untouched, still working.
- `FilterChips.tsx`, `FormModal.tsx`, `EntityCard.tsx`, `Select.tsx`, `FieldLabel.tsx`, `NewButton.tsx`, `All.tsx` — all untouched, all still working as designed. `DeckDetail.tsx` and `PracticeRunner.tsx` deliberately did **not** use `FormModal` (dynamic field sets don't fit its static `FieldProperties` shape) — the rewrite should decide whether `FormModal` grows to cover that case or whether dynamic forms get their own pattern.

## API awkwardnesses found

**Fixed at the API layer this phase** (per the plan's "last cheap moment to change the contract"):

- **No way to list a deck's cards.** Only single-card CRUD existed. Added `GET /api/cards?deck_id=` (`db_read_cards_for_deck` in `app/database_ops/card.py`, tested in `TestCardList`).
- **No way to read a card's computed mastery.** Added `GET /api/cards/{card_id}/mastery` (`CardMasteryRead`, backed by `card_mastery()`/`MasteryStrategy`, tested in `TestCardMastery`).

**Deliberately deferred, noted here for the rewrite:**

- **`SubjectRead`/`DeckRead` dropped their `deck_count`/`card_count` aggregates.** The old UI displayed running totals ("N subjects, M decks total"); the new schema has no cheap place to compute that (it would mean a join+count on every list read). Not required for the smoke path. The rewrite should decide whether this is worth a dedicated aggregate endpoint or a UI redesign that doesn't need it.
- **`practice_card.prompts`/`answers` are field-id arrays, not text.** Rendering an actual prompt/answer requires a second fetch of the card's `values` plus a third fetch of the deck's `field_def`s just to get human-readable labels (`PracticeRunner.tsx` chains all three). A real rewrite probably wants the practice-card read (or a dedicated "current card" endpoint) to embed resolved field name + value pairs directly, sized for how a practice screen actually renders.
- **Errors collapse to a single string, losing the HTTP status code.** `displayError()` in `client.ts` always throws a generic `Error` built from the response body's `detail`, with no status code attached. `PracticeRunner.tsx` has to distinguish "session complete" (a 404 for "no pending practice card") from a genuine failure by lowercasing and substring-matching the error message — fragile, and it couples the frontend to exact backend wording. The rewrite's API client should preserve `error.status` (or throw a typed error class) so callers can branch on it instead of the message text.
- **No PATCH/PUT distinction was consistently applied before this phase** — decks and cards both moved from `PUT` to `PATCH` for updates during Phase 7's contract regeneration. Worth a final audit in the rewrite that every partial-update endpoint is `PATCH`.

## Capabilities the new schema enables with no current UI surface

These exist in the backend (Phases 1–6) but have zero frontend presence, smoke path included:

- **Per-field mastery display.** `card_field_mastery` tracks mastery per `(card_id, field_id)`, not just per card. The smoke path only shows the card-level aggregate (`CardMasteryRead`) after a rating; there's no screen showing which specific fields of a card are weak versus strong, which is the more interesting product surface the new schema was built for.
- **Practice configs as reusable, named objects.** `deck_practice_config` supports prompt/answer field selection plus **pool fields with counts** (extra fields shown alongside the required prompt/answer set, e.g. "show 2 of these 5 hint fields"). `DeckDetail.tsx`'s inline config form only exposes prompt/answer checkboxes and submits empty arrays for every pool field — there's no pool-selection UI at all yet.
- **Deck copy.** `copy_deck` (Phase 6) lets a user duplicate an entire deck — fields, cards, and (by field/card id remapping) practice configs — into a subject they own, including from decks they don't own once a share-link layer exists. No frontend entry point exists for this anywhere.
- **Multiple practice configs feeding one session.** `PracticeSessionCreate.deck_practice_config_ids` is a list — a session can be seeded from more than one config at once. The smoke path always starts a session from exactly one config.
- **Session status tracking.** `PracticeSessionRead.status` (`active`/`completed`/`abandoned`) exists but nothing in the frontend reads or surfaces it — there's no session history or resume view.

## Testing notes

- `tsc -b --force` is clean across the whole frontend.
- Backend: 109/109 pytest passing (includes the two new endpoints' tests).
- Frontend: 37/37 vitest passing, covering every touched API wrapper file (`subject`, `deck`, `card`, `field_def`, `deck_practice_config`, `practice_session`) against the regenerated contract. `deck_config.test.ts` was deleted — its endpoint and types no longer exist.
- **Manual browser verification was partial.** Both dev servers were started and driven headlessly: the app shell, routing, and page rendering all work with no console errors beyond the *expected* 401s (no Clerk session was available in the automated environment — there's no test/bypass credential wired up for local dev). Actually exercising the authenticated create-subject → deck → fields → cards → practice → rate → mastery path needs a real signed-in browser session, which this session couldn't provide. Recommend the user run the smoke path once by hand before treating it as verified end-to-end.
