# 033 — A form's return addresses

## Goal

Outcome: Every form carries where Cancel returns and where Create or Save returns as the two URL parameters `cancelTo` and `returnTo`, each read only through the one guard; an opener that needs the user back after both outcomes passes both, one that wants only Cancel back passes `cancelTo` alone, and neither falls back to the other; so Cancel on a deck form opened from a subject's page returns to that subject's page while Create still lands on the new deck.

Scope: The cycle covers the guard in `frontend/src/lib/returnTo.ts` reading either parameter by name; the subject, deck, card and configuration forms each sending Cancel to `cancelTo` and Create or Save to `returnTo`, with ADR 103's defaults when a parameter is absent and no fallback from one to the other; every opener of a form: the subject page's "Add deck" passing `cancelTo` alone, the card form's and the configuration form's "New deck…", New practice's "New configuration…" and its pencil passing both; one-shot arrival results staying in router state; and the one vocabulary row whose Code cell names the parameters. It leaves out the run page opening the card form, which a later cycle adds on these parameters; the deck form's subject overlay, which is a dialog on the page and not a form the router reaches; and any structural guard beyond the function, which ADR 103 names none of.

Judgement: The engineer judges on the live server: from a subject's page, "Add deck" then Cancel returns to that subject's page, and "Add deck" then Create lands on the new deck's page; from New card, "New deck…" then Cancel returns to New card, and "New deck…" then Create returns to New card with the new deck chosen; from New practice, "New configuration…" then Cancel and then Create each return to New practice with its draft intact, the created configuration chosen after Create; from the configuration editor, "New deck…" then Cancel returns to the editor; and `/decks/new` opened by a pasted address cancels to Your library while `/decks/{id}/edit` cancels to the deck's page.

## Records

- PDR 018: A form about one thing and nothing it holds, landing on the thing it made
- ADR 097: One hook for a page's URL search params, that never resets scroll
- ADR 103: Two URL parameters, `cancelTo` and `returnTo`, for a form's return addresses

## Tasks

### T1 — The guard, the deck form and its openers

**Status**

- [x]

**Goal**

The guard reads `cancelTo` or `returnTo` by name, the deck form sends Cancel to `cancelTo` and Create to `returnTo` with the defaults when either is absent, the subject page opens it with `cancelTo` alone, and the two "New deck…" pickers open it with both.

**Dependencies**

None.

**Files**

- `frontend/src/lib/returnTo.ts`
- `frontend/src/lib/returnTo.test.ts`
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/pages/SubjectDetailPage.tsx`
- `frontend/src/pages/SubjectDetailPage.test.tsx`
- `frontend/src/pages/practicePrefilterChain.test.tsx`

**Details**

The guard, ADR 103, in `frontend/src/lib/returnTo.ts`, the one reader of either parameter:

```ts
export type ReturnAddressKey = 'cancelTo' | 'returnTo';

/** The named return address, when it is an app-internal path: it starts with `/` and
 * not with `//`. Null when absent, empty or anything else. */
export function internalReturnTo(searchParams: URLSearchParams, key: ReturnAddressKey): string | null;
```

- Its check stays as it is; only the key becomes a parameter, with no default, so every caller names which address it reads.
- `returnTo.test.ts` runs its cases for both keys and adds one: a params holding `returnTo` alone reads `null` for `cancelTo`, and the reverse.

The deck form, `DeckEditor.tsx`, ADR 103 and PDR 018:

- It must read both through the guard, in create and edit mode alike, and carry them to its body as `cancelTo: string | null` and `returnTo: string | null` in place of today's one `returnTo`.
- Cancel, confirmed or not needed, must go to `cancelTo`, else to `/library` in create mode and to `/decks/{deckId}` in edit mode. It must read `returnTo` nowhere.
- Create must go to `returnTo` with `{ state: { deckId } }`, else to the new deck's page. Done, the edit form's exit when nothing is unsaved, must go to `returnTo`, else to the deck's page.
- The subject the subject page hands over in router state, `contextualSubject`, stays in router state: it is a one-shot arrival input, not an address.
- `DeckEditor.test.tsx`: the round-trip tests pass both parameters; one test opens the form with `returnTo` alone and shows Cancel landing on `/library`, since neither parameter falls back to the other; the non-internal test holds for both keys.

The openers, ADR 103:

- `SubjectDetailPage.tsx`'s `addDeck` must pass `cancelTo` set to the page's own `pathname + search` through `URLSearchParams.set`, and no `returnTo`, keeping the subject in router state as today, so Cancel returns to the subject's page and Create lands on the new deck. `SubjectDetailPage.test.tsx` asserts the parameter and the absence of `returnTo`.
- `goToCreateDeck` in `CardStandaloneForm.tsx` and the deck picker's `onSelectCreate` in `DeckConfigurationEditor.tsx` must pass both parameters, each the opener's own full location. Their tests assert both; `practicePrefilterChain.test.tsx`'s builder-to-deck-editor hop asserts both and the nested address inside them.
- Guidance: a two-line helper in `returnTo.ts`, taking a location and the keys to set, keeps the four openers from repeating the `set` calls; its name is the builder's.

Nothing else in these files changes: the forms' words, their rows and their saves stay as they are.

**Out of scope**

- The subject, card and configuration forms reading `cancelTo`: T2.
- New practice's openers: T2.
- The run page opening the card form with both addresses: a later cycle.
- A lint rule or scan for readers of the parameters: never in this cycle; ADR 103 names no structural guard.

**Done when**

- `cd frontend && npx vitest run src/lib/returnTo.test.ts src/components/library/DeckEditor.test.tsx src/components/library/CardStandaloneForm.test.tsx src/components/library/DeckConfigurationEditor.test.tsx src/pages/SubjectDetailPage.test.tsx src/pages/practicePrefilterChain.test.tsx` passes.
- `grep -rn "internalReturnTo(" frontend/src --include=*.tsx --include=*.ts | grep -v "\.test\." | grep -v "lib/returnTo.ts"` prints only calls whose second argument is `'cancelTo'` or `'returnTo'`.
- In headless Chromium against `localhost:5173`, signed out of Clerk with `DEV_AUTH_USER_ID` and `ENV=development`, by mouse: on a subject's page, "Add deck" then Cancel lands on the subject's page, and "Add deck", a name typed, then Create lands on `/decks/{new id}`; on `/cards/new`, "New deck…" lands on `/decks/new` whose `cancelTo` and `returnTo` both decode to `/cards/new`, and Cancel there lands on `/cards/new`; `/decks/new?returnTo=%2Fcards%2Fnew` opened directly, then Cancel, lands on `/library`. The script prints each landing URL, and its output is the evidence.

**Debrief**

Evidence, in the order of Done when:

- The six named test files passed: `Test Files  6 passed (6)`, `Tests  137 passed (137)`.
- The grep printed three lines, each naming its key:
  - `frontend/src/components/library/DeckConfigurationEditor.tsx:119:      returnTo={internalReturnTo(params, 'returnTo')}`
  - `frontend/src/components/library/DeckEditor.tsx:281:      cancelTo={internalReturnTo(params, 'cancelTo')}`
  - `frontend/src/components/library/DeckEditor.tsx:282:      returnTo={internalReturnTo(params, 'returnTo')}`
- Headless Chromium against `localhost:5173`, clicks by mouse, the deck name typed from the keyboard, printed:
  - `Add deck opens: /decks/new?cancelTo=%2Fsubjects%2F8ab3a83d-5131-4b98-af18-beb5d4c73d36`
  - `  cancelTo = /subjects/8ab3a83d-5131-4b98-af18-beb5d4c73d36 | returnTo = null`
  - `Add deck then Cancel lands on: /subjects/8ab3a83d-5131-4b98-af18-beb5d4c73d36`
  - `Add deck, name typed, Create lands on: /decks/0c53b87c-ea15-4d1b-8a2c-7e45abeb0ae0`
  - `New deck… from /cards/new lands on: /decks/new?cancelTo=%2Fcards%2Fnew&returnTo=%2Fcards%2Fnew`
  - `  cancelTo decodes to /cards/new | returnTo decodes to /cards/new`
  - `Cancel lands on: /cards/new`
  - `/decks/new?returnTo=%2Fcards%2Fnew then Cancel lands on: /library`

Checks over the whole frontend: `npx vitest run` passed, 60 files and 627 tests; `npm run lint` and `npm run build` exited 0, the build printing its chunk-size warning.

Departures from Details and Files: none. The guidance's helper is `returnAddressParams(location, ...keys)` in `frontend/src/lib/returnTo.ts`, returning a new `URLSearchParams`; T2's openers can set their `subject` and `deck` on what it returns.

Beyond what Details lists:

- `ReturnAddressKey` carries an interface comment saying what each key means.
- `DeckEditor.test.tsx` also covers `cancelTo` alone with Create landing on the new deck, a confirmed Cancel in both modes, and both addresses in edit mode.
- `returnTo.test.ts` also covers the helper.

Until T2, `DeckConfigurationEditor`'s own Cancel still goes to `returnTo`, and New practice's openers still pass `returnTo` alone, so that round trip behaves as before.

The browser check left its deck, named "Cycle 033 T1 check" and a timestamp, in the dev database under the subject "Cycle 032 T3 judgement 2026-11-05 11:49".

Read in the code: `leaveByCancel` and `leaveByDone` in `DeckEditorBody` in `frontend/src/components/library/DeckEditor.tsx`, which replace the one `goBack` and are where the two addresses part. No opener passes an address to `/decks/{id}/edit` yet, so its landings are unchanged on the live server and covered only by tests.

### T2 — The other forms and New practice's openers

**Status**

- [ ]

**Goal**

The subject, card and configuration forms send Cancel to `cancelTo` and Create or Save to `returnTo` with ADR 103's defaults, New practice's "New configuration…" and pencil pass both, and the cycle's judgement holds.

**Dependencies**

- T1: `internalReturnTo(searchParams, key)` in `frontend/src/lib/returnTo.ts`, and the helper for openers if T1 wrote one.

**Files**

- `frontend/src/components/library/SubjectForm.tsx`
- `frontend/src/components/library/SubjectForm.test.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/pages/practicePrefilterChain.test.tsx`
- `docs/vocabulary.md`

**Details**

Every form below reads both parameters through the guard, sends Cancel to `cancelTo` and Create or Save to `returnTo`, reads `returnTo` nowhere for Cancel and `cancelTo` nowhere for a save, and falls back as ADR 103 has it, PDR 018:

- `SubjectForm.tsx`, routed as `/subjects/new` and `/subjects/{id}/edit`: Cancel to `cancelTo`, else `/library` on create and `/subjects/{id}` on edit; Create and Save to `returnTo`, else the subject's page. Delete keeps going to `/library`. The overlay the deck form opens for "New subject…" is not this route and does not change.
- `CardStandaloneForm.tsx`: Cancel to `cancelTo`, else the deck's page when a deck is chosen and `/library` otherwise; Create and Save to `returnTo`, else the deck's page. A card has no page of its own, so its deck's page stands as ADR 103's default for all three. Delete keeps going to the deck's page. The deck handed over in router state stays there, a one-shot arrival input.
- `DeckConfigurationEditor.tsx`: Cancel to `cancelTo`, else `/decks/{deckId}?tab=configurations` when the deck is known and `/library` otherwise; Create and Save to `returnTo`, Create with `{ state: { configurationId } }` as today, else the deck's Configurations tab.

The openers in `PracticeCreatePage.tsx`, `newConfiguration` and `editConfiguration`, must pass both parameters, each the page's own full location, so Cancel and Create or Save each bring the draft back; the `subject` and `deck` context parameters ride along as today.

Tests: each form's test opens it with `cancelTo` alone, with `returnTo` alone and with neither, and asserts where Cancel and where Create or Save land in each case, the absent parameter never standing in for the other; `PracticeCreatePage.test.tsx` and `practicePrefilterChain.test.tsx` assert both parameters on each hop, and the chain test's nested addresses hold both at each level.

The vocabulary, in `docs/vocabulary.md`: the row "Leaving New practice to make a configuration" gains `cancelTo` in its Code cell beside `returnTo`, and nothing else in the file changes.

**Out of scope**

- The run page opening the card form: a later cycle.
- A change to any form's words, layout or save: never in this cycle.

**Done when**

- `cd frontend && npx vitest run` passes over the whole frontend.
- `grep -rnE "get\('(returnTo|cancelTo)'\)" frontend/src --include=*.tsx --include=*.ts | grep -v "\.test\."` prints only lines in `frontend/src/lib/returnTo.ts`, and `grep -rnE "state: \{[^}]*(returnTo|cancelTo)" frontend/src` prints nothing.
- `grep -c "cancelTo" docs/vocabulary.md` prints `1`.
- The cycle's judgement, in headless Chromium against `localhost:5173`, signed out of Clerk with `DEV_AUTH_USER_ID` and `ENV=development`, by mouse, each landing URL printed as the evidence: from a subject's page, "Add deck" then Cancel lands on the subject's page, and "Add deck" then Create on the new deck's page; from `/cards/new`, "New deck…" then Cancel lands on `/cards/new`, and "New deck…" then Create on `/cards/new` with the new deck shown as chosen; from `/practice/new?subject={id}`, "New configuration…" then Cancel lands back with `subject` kept, and "New configuration…" then Create lands back with the new configuration in Selected; a row's pencil then Cancel lands back on `/practice/new` with its draft; from `/deck-configurations/new`, "New deck…" then Cancel lands back on `/deck-configurations/new`; `/decks/new` opened directly then Cancel lands on `/library`, and `/decks/{id}/edit` then Cancel on `/decks/{id}`; `/subjects/new` then Cancel lands on `/library`; and `/cards/new` opened directly then Create, after choosing a deck and typing a value, lands on that deck's page.

**Debrief**

None.
