# 035 — Every form's action row

Canvas: https://claude.ai/artifact/Qp4d24tVLcppMCJCAh9mde

## Goal

Outcome: On New subject, Edit subject, New card and Edit card, the row holding Cancel and Create or Save stays on screen under the top bar while the user scrolls, as it already does on the deck, configuration and New practice forms, so the user saves or backs out from anywhere down any form and meets the row in the same place on every form.

Scope: The cycle covers the subject form's and the card form's row of Cancel, heading and Create or Save, each rendered in `StickyPageRow`, the one component for a page's sticky row, which stops under the header at its measured height with the banner showing or not. It leaves out the deck, configuration and New practice forms, which already use it; the deck form's "New subject…" overlay, which covers the viewport with no top bar and keeps its row in flow; and any other change to a form's words, layout or behaviour.

Judgement: The engineer judges in headless Chromium against the dev server at 390 wide: on Edit card for a deck with enough fields to run past the screen, scrolling to the last field keeps Cancel and Save on screen directly under the header, clear of the connection banner when it shows, as drawing 4 draws the row at rest; the same on New card, New subject and Edit subject; and the deck, configuration and New practice forms read as before.

## Records

- PDR 020: A block for everything that can be tapped
- ADR 100: A measured header height and one component for a page's sticky row

## Tasks

### T1 — The subject and card forms' rows

**Status**

- [ ]

**Goal**

The routed subject form and the card form render their row of Cancel, heading and Create or Save in `StickyPageRow`, and the deck form's subject overlay keeps its row in flow.

**Dependencies**

None.

**Files**

- `frontend/src/components/library/SubjectForm.tsx`
- `frontend/src/components/library/SubjectForm.test.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`

**Details**

The row, LPD14 and ADR 100:

- `CardStandaloneForm.tsx` must render its row, Cancel, the heading and Create or Save, inside `StickyPageRow` from `frontend/src/components/ui/StickyPageRow.tsx`, with the row's children as they are today. Nothing else in the form moves.
- `SubjectFormBody` in `SubjectForm.tsx` gains a prop `stickyRow: boolean`. The routed `SubjectForm` passes `true` and the body renders its row inside `StickyPageRow`; `DeckEditor.tsx`'s "New subject…" overlay passes `false` and the body renders its row in flow as today, since a `FullScreenDialog` covers the viewport with no header to stop under and LPD14 names the four routed pages. The prop has no default, so each caller says which it is.
- The row's look at rest must be drawing 4's: the same words, the same button, the same heading; `StickyPageRow`'s own padding and ground background are the deck form's today, and the two forms take them unchanged.
- The forms' outer container keeps `p-4`; `StickyPageRow` reaches the page's edges with its own negative margins, as it does on the deck form.

Tests: `SubjectForm.test.tsx` and `CardStandaloneForm.test.tsx` assert the heading's row carries `data-reveal-clear`, the mark `StickyPageRow` puts on every sticky row; `DeckEditor.test.tsx` asserts the overlay's "New subject" heading row does not.

**Out of scope**

- The deck, configuration and New practice forms: already built; never here.
- A sticky row inside the overlay: never in this cycle; the overlay has no top bar to stop under.
- Any change to a form's words, order of fields or return addresses: never here.

**Done when**

- `grep -c "StickyPageRow" frontend/src/components/library/SubjectForm.tsx frontend/src/components/library/CardStandaloneForm.tsx` prints `2` or more for each file, an import and a use.
- `cd frontend && npx vitest run src/components/library src/components/ui/StickyPageRow.test.tsx src/test/stickyOffset.test.ts` passes.
- A script in headless Chromium against `localhost:5173`, signed out of Clerk with `DEV_AUTH_USER_ID` and `ENV=development`, at 390 wide, with `/api/health` passing and with it aborted through `page.route` so the banner shows, opens `/cards/{id}/edit` for a card whose deck has six or more fields, `/cards/new` with a deck chosen by mouse, `/subjects/new` and `/subjects/{id}/edit`. Each run lowers the viewport's height from 300 until `window.scrollY` at the page's bottom is above `0`, then prints, at the bottom, the header's `getBoundingClientRect().bottom`, the row's `getBoundingClientRect().top` and whether they are within 1px of each other; every line reads true, the header's bottom is greater with the banner than without, and the output is the evidence.
- A screenshot of Edit card scrolled to its last field at 390 wide, with the banner showing, saved in the session scratchpad and named in the Debrief, for the engineer to set beside drawing 4.

**Debrief**

None.
