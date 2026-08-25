# Deck Details & Config Builder Fixes — Execution Plan

Two UI defects found on review of the shipped surfaces (screenshots reviewed 2026-08-25): the deck details page mixes action scopes, and the config builder's drag interaction is unusable. Both fixes land on `feat/practice-setup` **before Phase 3 of the practice-setup decompose begins** — Phase 3's creation page links into the builder, and its entry points assume the corrected deck-details routing.

Execute one fix per session; stop and report against acceptance before starting the next. Component and route names follow current project conventions.

---

## Guiding principles

These are the rules the fixes exist to restore. Apply them anywhere else they turn out to be violated, and raise it if a fix seems to require breaking one.

1. **Entity actions live in the page header; collection actions live inside the collection they act on.** A button whose meaning depends on invisible state (the active tab) must sit visually inside that tab's content, and be labeled.
2. **Creation = identity + schema at birth. Editing = identity + schema over time. Cards belong to neither form** — they are routine content, managed from the card list.
3. **Tap/click-to-assign is the builder's primary and universal interaction.** Drag may only ever return as an enhancement layered on the same state (dnd-kit, wide viewports), never as the only path, and not in this task.
4. Config invariant unchanged: **the four field arrays stay pairwise disjoint by construction** — assigning a field moves it; a field lives in exactly one place.

---

## Fix 1 — Deck details: scope the actions, split the mega-form

**Deck details header:**

- Remove the bare `+` from the header entirely.
- The pencil remains, targeting a slimmed **Edit deck** form (below).
- **Delete deck** moves out of the routine edit path — into the header's overflow menu (or, if no overflow exists yet, stays at the edit form's bottom) behind a confirm that states what cascades per ADR 015 (cards, fields, configurations) and that review history survives.

**Per-tab, labeled add affordances in the tab content area:**

- Cards tab: an **“+ Add card”** button inside the tab, and the same button in the empty state ("No cards in this deck yet" + button). Tapping a card row opens that card's own edit surface.
- Configurations tab: a **“+ New configuration”** button inside the tab, routing to the builder with this deck pre-selected — this is the decompose's deck-context pre-filter chain; reuse that wiring, don't fork it.

**Edit deck form (pencil target):** deck name, subject, and the fields list only. Remove the cards section and its "Add card" row. This form is where the field-lifecycle rules surface (rename free, delete = archive, type change refused) — keep those behaviors, now uncluttered by card entry.

**New deck form:** deck name, subject, fields. Remove the "Add card" section and whatever buffering or eager-creation supported it. On save, land on the new deck's details page, where the empty Cards tab invites adding cards.

**Consistency check (report, don't silently expand scope):** if the subject details page uses the same header `+`/pencil pattern, note it in the phase report with the same fix sketched — do not apply it in this task without confirmation.

**Acceptance:** header has no `+`; each tab's add button is labeled, lives in the tab content, and routes correctly (Configurations → builder with deck pre-selected); Edit deck and New deck forms contain no card entry; card edit is reachable from the card list; deck delete requires the cascade-stating confirm; existing tests updated, `tsc` clean.

**Commit:** `refactor: scope deck actions to their collections and split card entry from deck edit`

> **Status: done** — `f4afa9a`, all acceptance criteria met. Consistency check reported SubjectDetailPage with the same header pattern → confirmed as Fix 1b.

---

## Fix 1b — Subject details: same rule, same shape

Approved follow-up from Fix 1's consistency check. Small and mechanical — mirror `f4afa9a` on `SubjectDetailPage`. Run as its own short session before Fix 2.

- Remove the icon-only `+` ("New deck") from the subject header; the header keeps Practice and Edit subject only.
- Add a labeled **“+ Add deck”** button above the deck list, repeated in the deck list's empty state, carrying the subject context the way the deck page's buttons carry the deck.
- No form-splitting half here: the subject form has no nested collection editing, so this fix is the header/collection move only.

**Acceptance:** subject header has no `+`; labeled add button in the collection area and empty state; deck creation still lands with the subject pre-selected; tests updated, `tsc` and suites clean.

**Commit:** `refactor: scope subject add-deck action to the deck list`

**Deferred cleanup (noted, not in this task):** the deck-create contract still accepts a `cards` array that the client now always sends empty — remove the field from the API and regenerate types in a later cleanup pass.

---

## Fix 2 — Config builder: tap-to-assign, drag removed

The authoritative spec is the **revised assignment-board section of `2026-08-24-practice-setup-decompose.md` (Phase 2, revision dated 2026-08-25)**. Summary of what changes relative to the shipped builder:

- **Layout:** five stacked sections at every viewport — Unassigned · Prompt fields · Answer fields · Prompt pool · Answer pool. The two-column table (Fields / Frequency) is removed; there is no responsive fork.
- **Interaction:** each field chip is a single whole-chip tap/click target that opens a destination picker (bottom sheet on narrow viewports, popover on wide) listing the other four sections; choosing one moves the chip. The per-chip embedded `<select>` is removed.
- **Drag:** delete all HTML5 drag-and-drop code and its tests. Replace the simulated dragstart→drop test with tests of the tap-to-assign path.
- **Frequency:** a pool section renders its 1…n checkbox footer only when it has ≥1 field; empty sections show a short hint line, never `N/A`. The count-pruning rule (checked values > new n are pruned when a field leaves a pool) is unchanged. Move the random-draw explanation sentence to sit beside the first visible frequency row instead of the page bottom.
- **Unchanged:** deck picker behavior and context rules, name input with inline duplicate-name error, archived-field exclusion, client-side validation mirroring the backend, payload mapping (section contents → the six arrays, uuids only).

**Acceptance:** the revised Phase 2 acceptance list in the decompose, notably: every assignment reachable by tap/click alone on a phone-width viewport; MSW tests cover board state → payload arrays; frequency pruning verified on removal from a pool; no HTML5 DnD code remains (grep `draggable`/`ondragstart`/`ondrop` in the builder returns nothing).

**Commit:** `refactor: rebuild config board as tap-to-assign sections, remove html5 drag`
