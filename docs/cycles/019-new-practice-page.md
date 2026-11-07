# 019 — New practice page

## Goal

Outcome: On New practice, the selection and the name can be cleared and survive every round trip, and each configuration can be edited from the list and return to the draft intact.

Scope: New practice (`/practice/new`) and the Edit configuration round trip from it; frontend only: no backend, schema, or `frontend/src/api/types.ts` change. Not covered: Delete on the Edit configuration page.

Judgement: None.

## Records

None.

## Tasks

### T1 — The selection is a checkbox list held in the URL

**Status**

- [x]

**Goal**

New practice's selection moves from component state to repeated `config` URL params and is toggled through checkboxes, so it can be cleared and survives every round trip.

**Dependencies**

None.

**Files**

- `frontend/src/lib/practiceSelection.ts` (new)
- `frontend/src/lib/practiceSelection.test.ts` (new)
- `frontend/src/components/practice/ConfigurationPickList.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/pages/practicePrefilterChain.test.tsx`

**Details**

The configuration list must use checkboxes, at most one per deck: tapping a ticked configuration unticks it, and ticking another in the same deck unticks the first.

A hand-edited URL must never be normalised: duplicate `config` ids are read once, and two ids from one deck stay ticked until the next tick in that deck, with the server's `duplicate_deck` as the backstop.

The `/practice/new` URL:

| Param | Meaning | Written by |
| --- | --- | --- |
| `subject`, `deck` | the filters, unchanged | `setFilters`; "Clear filters" deletes exactly these two |
| `status` | not read by New practice; arrives from the overview's New practice button | not written by this page; Cancel forwards it |
| `config` | repeated, one per selected configuration id, in the order they were selected | T1's helpers |
| `name` | the practice name verbatim, possibly empty; absent until the name is first edited | T2 |

- Every write from New practice passes `{ replace: true }`. It starts from a copy of the current params and changes only its own param or params.
- Cancel navigates to `/practice` carrying exactly those of `subject`, `deck`, `status` present on the current URL, and no other param.

`frontend/src/lib/practiceSelection.ts`:

```ts
/** The `config` params, de-duplicated, first occurrence first. */
export function readSelectedConfigIds(searchParams: URLSearchParams): string[];

/** A copy of `searchParams` whose `config` params are exactly `ids`, in order; every other param untouched. */
export function withSelectedConfigIds(
  searchParams: URLSearchParams,
  ids: readonly string[],
): URLSearchParams;

/** Makes `configId` its deck's one selection: drops every id in `deckConfigIds`, then appends `configId`. */
export function selectConfig(
  selectedIds: readonly string[],
  deckConfigIds: readonly string[],
  configId: string,
): string[];

/** One tap on a checkbox: removes `configId` if selected, otherwise `selectConfig`. */
export function toggleConfig(
  selectedIds: readonly string[],
  deckConfigIds: readonly string[],
  configId: string,
): string[];
```

`deckConfigIds` is every configuration id in the tapped configuration's deck, meaning its `ConfigurationGroup.configs` ids. A visible deck group always holds all of that deck's configurations, because the filters narrow by subject and deck, never within a deck.

`ConfigurationPickList` props (`frontend/src/components/practice/ConfigurationPickList.tsx`):

```ts
type ConfigurationPickListProps = {
  groups: ConfigurationGroup[];
  selectedIds: ReadonlySet<string>;
  rowError: { configId: string; message: string } | null;
  onToggle: (group: ConfigurationGroup, configId: string) => void;
  onEdit: (configId: string) => void; // added by T5
};
```

- The fieldset/legend per deck group is unchanged.
- Each row's `<label>` wraps `<input type="checkbox">` (no `name` attribute) and the configuration name. The checkbox's accessible name is therefore the configuration name, and tapping anywhere on the label toggles it.

Implement `practiceSelection.ts` as above.

Convert `ConfigurationPickList` to the shape above without `onEdit`: `checked={selectedIds.has(config.id)}` and `onChange={() => onToggle(group, config.id)}`. Rewrite its doc comment: at most one per deck is enforced by `toggleConfig`, not natively.

In `PracticeCreatePage`:

- Delete the `selection` state and the comment above it.
- Set `selectedIds = readSelectedConfigIds(searchParams)`.
- `onToggle` writes `withSelectedConfigIds(searchParams, toggleConfig(selectedIds, group.configs.map((c) => c.id), configId))` with `replace`.
- The count and Create's enabled state use `selectedIds.length`; the POST sends `selectedIds`.
- Update the component doc comment, which currently says "pick one configuration per deck".

The returned-config one-shot (`location.state.configurationId`):

- Keep capturing it at mount, and keep consuming it only once the id is found in `configsQuery.data`.
- On a match, write `selectConfig(selectedIds, <ids in configsQuery.data with the match's deck_id>, match.id)` to the URL with `replace`.
- Do the write inside a `useEffect`, guarded by a `useRef` flag rather than state. `setSearchParams` is a navigation and must not run during render, and a ref keeps the effect free of `setState` (the `react-hooks` lint rules).

Cancel and Clear filters:

- Cancel builds its `search` from exactly the present `subject`, `deck`, `status` values.
- The empty-state "Clear filters" button deletes only `subject` and `deck` from a copy of the current params, with `replace`.

Tests in `PracticeCreatePage.test.tsx`:

- Every `radio` role query becomes `checkbox`.
- `renderCreate` also renders, outside `<Routes>`, a probe with `data-testid="current-location"` showing `pathname + search`. Assert params by decoding them through `URLSearchParams`, never by comparing an encoded literal.
- Replace "enforces one selected configuration per deck" with a test of the at-most-one-per-deck checkboxes:
  1. Tick Recall: it is checked.
  2. Tick Recognition: Recognition is checked and Recall is not.
  3. Tick Recognition again: neither is checked, no "selected" count shows, and Create is disabled.
- Add:
  - Ticking Recall then Basics makes `getAll('config')` equal `['c1', 'c3']`.
  - Mounting at `/practice/new?config=c1&config=c3` shows Recall and Basics checked and "2 selected".
  - Round trip: tick Recall and Basics → New configuration → "Finish new config" (the stub returns `c2`, deck `d1`) → Recognition and Basics checked, Recall unchecked, "2 selected".
  - Mounting at `/practice/new?subject=s1&config=c3`, with the configurations mock returning `[]` for `s1`, then clicking Clear filters leaves no `subject` and `config` equal to `['c3']`.
- Change the Cancel test to mount at `/practice/new?subject=s1&status=completed&config=c1`. It asserts landing on pathname `/practice` with `subject=s1`, `status=completed`, and no `config`.

`practicePrefilterChain.test.tsx`:

- `radio` becomes `checkbox`.
- Retitle the save-direction test so it says earlier selections are kept, not gone, and update its two comments that say earlier selections are gone.
- After the return, it asserts pathname `/practice/new`; `config` params `c1`, `c3`, then the created configuration's id; Recall, Basics and Fresh Config all checked; and "3 selected".

**Out of scope**

- `name` in the URL: T2.
- The Selected section: T3.
- The missing-configuration check: T4.
- The pencil and the create-only hand-back: T5.
- Changing `PracticeOverviewPage`'s own forwarding.
- Normalising hand-edited URLs.

**Done when**

- `grep -n "radio" frontend/src/components/practice/ConfigurationPickList.tsx frontend/src/pages/PracticeCreatePage.tsx frontend/src/pages/PracticeCreatePage.test.tsx frontend/src/pages/practicePrefilterChain.test.tsx` prints nothing.
- `grep -n "useState<Record" frontend/src/pages/PracticeCreatePage.tsx` prints nothing.
- `practiceSelection.test.ts` covers: repeated ids read once; `withSelectedConfigIds` leaving `subject`, `name`, `status` untouched; toggling off; same-deck replacement; and `selectConfig` dropping two pre-existing same-deck ids.
- Every test named in Details passes.

**Debrief**

In `practicePrefilterChain.test.tsx` Basics is `c2` and the created configuration is `c9`, so the save-direction walk asserts `config` equal to `c1`, `c2`, `c9`; this file's `c3` was the page test's fixture id. "Clear filters" calls the existing `setFilters` with both filters null, which already deletes exactly `subject` and `deck` from a copy with `replace`. The existing auto-select test also asserts the URL ends with `config=c2`, and both round-trip tests wait for the tick rather than asserting on first render, since the one-shot now lands in an effect. Otherwise none.

### T2 — The name sits at the top and rides the URL

**Status**

- [x]

**Goal**

The Name input moves under the sticky header and persists through round trips as the `name` param, and the general Create error moves up beside Create's other errors.

**Dependencies**

- T1

**Files**

- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`

**Details**

The Name input must sit directly under the sticky header with its hint beneath it, and the general Create error must render with Create's other errors above the configuration list, not at the page bottom.

Move the Name label and input to directly below the sticky header, above `PracticeFilterBar`.

Name state: `useState(() => (searchParams.has('name') ? searchParams.get('name')! : formatDateTime(new Date())))`. This reads the URL once, at mount.

- The input stays bound to that local state. Each change also writes `name` to the URL with `replace`.
- Binding the input's value straight to `searchParams` would route every keystroke through a router navigation. The page remounts on every return, so reading at mount is enough.
- The `name` param is absent until the first edit. Clearing the input writes `name=` (empty), which renders an empty input on return.

Hints:

- Split the bottom hint paragraph. "Give this practice a name to create it." renders directly beneath the Name input whenever `name.trim() === ''`.
- "Select at least one configuration to practise." stays at the page bottom, whenever `selectedIds.length === 0`; T3 moves it.
- The two hints are now independent; today only one shows at a time.

Move the `saveError` `<p role="alert">` from the page bottom to directly after the `topError` paragraph.

Tests:

- Mounting at `/practice/new` gives a non-empty input and no `name` param. Clearing the input and typing "Exam cram" makes the `name` param "Exam cram".
- Round trip: type "Exam cram" → New configuration → "Finish new config" → input value "Exam cram".
- Mounting at `/practice/new?name=&config=c1` gives an empty input, the name hint, and a disabled Create.
- Mounting at `/practice/new?name=Exam%20cram` gives input value "Exam cram".
- `compareDocumentPosition` shows the Name input before `getByPlaceholderText('All subjects')`.
- In the general-error test (retitle it "… above the configuration list"), the alert precedes the Recall checkbox.
- Adjust "Create stays disabled with the unmet condition shown…" to the independent hints.

**Out of scope**

- The Selected section, and moving the select hint: T3.
- Validating or trimming the `name` param on read.

**Done when**

- Every test named in Details passes.

**Debrief**

The name state reads `searchParams.get('name') ?? formatDateTime(new Date())`, which is the Details' `has`/`get!` expression without the non-null assertion, since `get` is `null` only when the param is absent. The independent-hints test also unticks the selection with the name cleared, so both hints are asserted at once. Otherwise none.

### T3 — A Selected section lists every selection

**Status**

- [x]

**Goal**

A Selected section under the name lists every selected configuration, including those a filter hides, each removable with ✕.

**Dependencies**

- T2

**Files**

- `frontend/src/components/practice/SelectedConfigurationList.tsx` (new)
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`

**Details**

The Selected section must resolve each selected id against one unfiltered query of all the user's configurations.

A "Selected" section above the filters must list every selected configuration, including those a filter hides: name, "deck · subject", and a ✕ remove button, in subject → deck → name order, with the "Select at least one configuration to practise." hint when empty. The header's "N selected" count stays.

While the list of all configurations loads, the Selected section must show no rows; if it fails, the section shows "Could not load your selected configurations." in place of its rows.

`SelectedConfigurationList` (`frontend/src/components/practice/SelectedConfigurationList.tsx`):

```ts
type SelectedConfigurationListProps = {
  /** Selected configs that resolved against the unfiltered list, in that list's order (subject → deck → name). */
  configs: DeckPracticeConfigSummary[];
  onRemove: (configId: string) => void;
};
```

- Renders a `<ul>` with one `<li>` per configuration: the name (`text-[15px] text-(--color-text)`), below it `{deck_name} · {subject_name}` (`text-[11px] text-(--color-text-muted)`), and a trailing `<button type="button" aria-label="Remove {name}">` holding lucide `X` (`h-4 w-4`, `aria-hidden`) in an `h-11 w-11` box.
- No fetching, no heading, no empty state of its own.

The unfiltered configs query:

`useQuery({ queryKey: ['deck_practice_configs', null, null], queryFn: () => readDeckPracticeConfigs() })`

This is the same key the filtered query uses when neither filter is set, so an unfiltered page still makes one request. Every existing invalidation of `['deck_practice_configs']` covers it.

The page layout, top to bottom, complete after this task:

1. Sticky header: Cancel · "New practice" · "{N} selected" (when N > 0) and Create. N = `readSelectedConfigIds(searchParams).length`.
2. Label "Name" and its input. Directly beneath, whenever `name.trim() === ''`: "Give this practice a name to create it."
3. `<section aria-labelledby={id}>` with `<h2 id={id}>Selected</h2>`, containing exactly one of:
   - "Select at least one configuration to practise." when the URL has no `config` id;
   - `<p role="alert">Could not load your selected configurations.</p>` when the unfiltered query failed;
   - otherwise `SelectedConfigurationList`, which renders no rows while the query loads or when no id resolves.
4. `PracticeFilterBar`.
5. The New configuration button row.
6. "Could not load deck configurations." (existing).
7. Create's page-level errors: `topError`, then `saveError`.
8. The empty state or `ConfigurationPickList`.

New user-facing copy:

- "Selected"
- "Remove {name}"
- "Edit {name}"
- "Could not load your selected configurations."

Every other string on the page is existing copy, some of it moved.

Add the unfiltered query as above.

Resolve `allConfigs.filter((c) => selectedIdSet.has(c.id))`, which keeps the backend's subject → deck → name order.

Build the component and the section as above. The section goes between the Name block and `PracticeFilterBar`, with exactly one of its three contents.

`onRemove` writes the URL without that id, with `replace`.

Delete the page-bottom "Select at least one…" paragraph; the hint now renders only inside the section.

The header count stays the URL-id count, done by T1; T4 makes it agree with the rows.

Tests:

- Where a test mounts with a selection, use `findByRole('checkbox', { name: 'Recall' })` as its load signal, not `findByText('Recall')`, which now matches twice.
- Ticking Basics then Recall lists, within `getByRole('region', { name: 'Selected' })`, Recall ("Shared Deck Name · Alpha") before Basics ("Shared Deck Name · Beta").
- "Remove Recall" unticks Recall's checkbox, removes its row, and drops `c1` from the URL.
- Unticking a checkbox removes its row.
- Rewrite the existing test of the selected count once its group is filtered out of view: after filtering to Beta, no Recall checkbox exists, the Selected region still lists Recall, and "1 selected" shows.
- At `/practice/new?config=gone`, the region lists no row. T4 then removes the id; this test asserts only the row.
- At `/practice/new?subject=s1&config=c1`, with MSW returning 500 only for a request carrying neither `subject_id` nor `deck_id`: the region shows "Could not load your selected configurations." and the filtered list still renders.
- With nothing selected, the hint renders inside the region.
- At `?subject=s1`, the recorded requests include one with neither `subject_id` nor `deck_id`.

**Out of scope**

- Removing missing selections: T4.
- A pencil or a link on Selected rows; editing belongs in the configuration list only.
- Collapsing or truncating a long Selected list.

**Done when**

- Every test named in Details passes.

**Debrief**

`practicePrefilterChain.test.tsx` is also in this commit, outside the task's Files: its first two chains asserted the filter on the _last_ recorded configurations request, and the unfiltered query now arrives last, so they assert that _some_ request carries the filter (confirmed in the build session). The section's branch follows the layout's order, so the select hint wins over the load error when nothing is selected. Otherwise none.

### T4 — A selection that no longer exists is removed with a warning

**Status**

- [x]

**Goal**

A selected configuration that no longer exists is removed from the URL, with a warning, as soon as the settled list of all configurations shows it gone, and Create's `config_not_found` path removes it the same way.

**Dependencies**

- T3

**Files**

- `frontend/src/lib/practiceCopy.ts`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`

**Details**

A selected configuration that no longer exists must be removed from the URL, with "A selected configuration no longer exists.", as soon as the settled list of all configurations lacks it. A `config_not_found` at Create must remove it the same way and create nothing, and pressing Create again proceeds with the rest. Count, ticks, and rows must always agree, and a selection that vanished entirely must still warn.

Create:

- On press: clear `rowError`, `topError`, `saveError`, then POST `{ name: name.trim(), deck_practice_config_ids: <selected ids, URL order> }`. There is no page-side check.
- On `config_not_found`: set `topError` to `MISSING_CONFIGURATION_MESSAGE`, write the URL without `detail.config_id` (`withSelectedConfigIds`, `replace`), and invalidate `['deck_practice_configs']`.
- All other error branches are unchanged.

Removing a selection that no longer exists:

- Acts only on settled data: the unfiltered query has `data` and `isFetching === false`. After a round trip the page remounts onto the cached list while the invalidated refetch runs, and a configuration created on that trip exists only in the refetched list. Acting on the cached list would remove it.
- `missingIds` is the selected ids absent from that data, computed during render.
- When `missingIds` is non-empty:
  - During render, set `topError` to `MISSING_CONFIGURATION_MESSAGE` unless it already holds it. This uses the file's existing adjust-state-during-render pattern, so no `setState` runs inside an effect. The sentence stays until the next Create press clears it, as every `topError` does today.
  - In a `useEffect`, write the URL without `missingIds` (`withSelectedConfigIds`, `replace`).
- One effect owns every URL write that reacts to fetched data: T1's returned-configuration one-shot and this removal. Two `setSearchParams` calls made after one render both start from that render's params, and the second overwrites the first. The effect removes `missingIds` first, then applies the one-shot's `selectConfig` if it is due, then calls `setSearchParams` once.
- The header count stays `readSelectedConfigIds(searchParams).length`. Once the effect has run, it equals the number of Selected rows.

`frontend/src/lib/practiceCopy.ts`:

`export const MISSING_CONFIGURATION_MESSAGE = 'A selected configuration no longer exists.';` Both removal paths render it.

Add `MISSING_CONFIGURATION_MESSAGE` as above. The existing `config_not_found` branch's string literal is replaced by it.

Implement the removal of a selection that no longer exists as above. This moves T1's one-shot URL write into the same effect.

Implement Create as above: the `config_not_found` branch now also writes the URL without `detail.config_id`.

Tests:

- At `/practice/new?config=c1&config=gone`, once the list loads:
  - The sentence shows, and the `config` params are `['c1']`.
  - Recall is checked, "1 selected" shows, and the Selected region lists Recall only.
  - No POST was sent.
- At `/practice/new?config=gone`, once the list loads:
  - The sentence shows and no count shows.
  - Create is disabled, and the Selected region shows the select hint.
- Settled-data rule:
  - Build a `QueryClient` (`retry: false`) and call `setQueryData(['deck_practice_configs', null, null], [configRecall])` before rendering. Render the page inside `QueryClientProvider` and `MemoryRouter` directly, as `renderWithProviders` does. MSW returns `ALL_CONFIGS`.
  - Mount at `/practice/new?config=c3`.
  - Once Basics's checkbox renders, Basics is checked, the `config` params are `['c3']`, and the sentence is absent.
- Extend the existing `config_not_found` test: it also asserts Recall is unchecked and `c1` is absent from the URL, alongside its existing sentence and refetch assertions.
- At `/practice/new?subject=s1&config=c1`, with the unfiltered GET returning 500:
  - Pressing Create POSTs `['c1']`.
  - The sentence is absent before the press.

**Out of scope**

- Pluralising or rewording the sentence.
- Naming which configuration was removed.
- Any page-side check at Create.
- Changing when `topError` clears.

**Done when**

- Every test named in Details passes.

**Debrief**

`missingIds` is wrapped in `useMemo` over the settled list and `searchParams`, since `react-hooks/exhaustive-deps` flags an array rebuilt each render as an effect dependency. The `config_not_found` branch skips the URL write when `detail.config_id` is null. The settled-data test was checked by removing the `isFetching` guard, under which it fails. Otherwise none.

### T5 — Edit a configuration from New practice and come back

**Status**

- [x]

**Goal**

Each configuration row gets a pencil that opens Edit configuration and returns to New practice with the draft intact, and an edit's Save no longer auto-selects the edited configuration.

**Dependencies**

- T1
- T4: shared file.

**Files**

- `frontend/src/components/practice/ConfigurationPickList.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/pages/practicePrefilterChain.test.tsx`

**Details**

Tapping a configuration row must tick it; a trailing pencil button, "Edit <name>", must open Edit configuration with `returnTo` set to the page's URL.

Delete on the Edit configuration page is deferred; configurations stay deletable from the deck page's Configurations tab.

In `ConfigurationPickList`, make the label `flex-1` and add a sibling `<button type="button" aria-label="Edit {name}">`. It holds lucide `Pencil` (`h-4 w-4`, `aria-hidden`) in an `h-11 w-11` box, styled like `DeckConfigurationRow`'s delete button.

The edit round trip:

- Pencil: navigates to `pathname: /deck-configurations/{configId}/edit`, with a `search` built by `URLSearchParams.set('returnTo', location.pathname + location.search)`. No router state.
- `DeckConfigurationEditor` Save success:
  ```ts
  navigate(
    returnTo ?? `/decks/${saved.deck_id}?tab=configurations`,
    mode === "create" ? { state: { configurationId: saved.id } } : undefined,
  );
  ```
  Cancel is unchanged.

Add `onEdit` and the pencil button as above. The page's `onEdit` navigates as above.

In the editor, apply the create-only hand-back as above, and update the comment on the `{configurationId}` hand-back to say it is create-only.

Tests in `PracticeCreatePage.test.tsx`:

- Add a `/deck-configurations/:configId/edit` stub route that shows its location.
- At `/practice/new?subject=s1&config=c1&name=Exam`, clicking "Edit Recognition" lands on pathname `/deck-configurations/c2/edit`, whose decoded `returnTo` equals `/practice/new?subject=s1&config=c1&name=Exam`.
- Clicking the Recognition label still ticks it and stays on `/practice/new`.

Tests in `DeckConfigurationEditor.test.tsx`: a state probe on the landing route shows:

- An edit-mode Save entered with `?returnTo=/practice/new` lands there with `location.state` null.
- A create-mode Save entered with the same `returnTo` lands there with `{ configurationId: <saved id> }`.

Tests in `practicePrefilterChain.test.tsx`:

- Add the `/deck-configurations/:configId/edit` route with the real `DeckConfigurationEditor mode="edit"`, and MSW handlers for `GET` and `PATCH /api/deck_practice_configs/:id`.
- New walk:
  1. At `/practice/new`, tick Recall and Basics, set the name to "Exam cram", and capture the full location.
  2. "Edit Recognition" → Cancel: the location equals the captured one, Recall and Basics are checked, and the name reads "Exam cram".
  3. "Edit Recognition" → Save with no change: the same location, Recognition unchecked, "2 selected".

Browser check per AGENTS.md's Browser checks line, against the dev servers:

1. New practice → type a name → tick two configurations from different decks.
2. Pencil on a third → Cancel: the name and both ticks are intact.
3. Pencil → Save with no change: intact, and the edited configuration is not ticked.
4. ✕ on a Selected row unticks its checkbox.

Never press Create and never delete anything. Record the outcome in the Debrief.

**Out of scope**

- Delete on Edit configuration.
- A pencil on Selected rows.
- Any change to the editor's Cancel or to the deck page's configuration rows.

**Done when**

- Every test named in Details passes.
- The browser walk's outcome is in the Debrief.

**Debrief**

`practicePrefilterChain.test.tsx`'s fixtures had no Recognition, so a `c3` Recognition in deck `d1` was added for the edit walk; the earlier chains are unaffected. Restoring the always-hand-back Save fails both the editor's edit-mode test and the chain walk. Browser walk (2026-10-01, headless Chromium at 390px against the dev servers, ADR 007 bypass): named the practice, ticked Command to Purpose (Commands) and Port Number to Protocol Name (Ports); the pencil on Test purpose → Cancel returned to the identical URL with the name and both ticks intact; pencil → Save with no change returned to the identical URL, intact, Test purpose unticked, "2 selected"; ✕ on the Ports row unticked its checkbox, removed the row, and read "1 selected". No page errors. The script was run twice, because the first run read step 4 before the update rendered, which a screenshot showed had succeeded; so Test purpose received four no-change PATCHes and is otherwise unchanged. Create was never pressed and nothing was deleted. Otherwise none.
