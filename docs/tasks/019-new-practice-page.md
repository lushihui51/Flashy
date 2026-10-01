# 019 — New practice: a cancellable selection, a draft that survives, edit from the list

Fix cycle from the 2026-09-29 /plan session, prompted by a screenshot review of New practice (`/practice/new`). It found four problems:

- A selected configuration could not be unselected, because the list used native radio buttons.
- Nothing listed what was selected.
- A configuration could not be opened for editing from the page.
- The name sat at the bottom.

Frontend only: no backend, schema, or `frontend/src/api/types.ts` change. Branch: `fix/new-practice-page`, cut from `main`.

Earlier task files affected, recorded here for the next sync's Superseded bullets; this file does not edit them:

- Task 004's MD-6 is reversed by ADR 061.
- Task 004's carried invariant 7, "radio-per-deck in UI", becomes checkboxes (MD-1).
- Task 004's Round-trip navigation contract loses its MD-6 bullet (ADR 061), and its `{configurationId}` save-return narrows to create mode (ADR 061).
- Task 004 T3's Details ("Selection is a radio per deck group") and T6's save-direction assertion that earlier selections are gone were built against the old rules. They stay checked as history; T1 here rewrites the tests they left.

## ADRs

Decisions this file implements; full context and rejected alternatives live in the ADRs.

- **ADR 061 — New practice's draft rides the URL**: selections as repeated `config` params and an edited name as `name`, written with `replace`, so every round trip, refresh, and back keeps the draft; Cancel forwards only `subject`, `deck`, `status`; an edit's Save hands back no `{configurationId}`. Reverses task 004 MD-6.

## Minor decisions

- **MD-1**: The configuration list uses checkboxes, at most one per deck: tapping a ticked configuration unticks it, and ticking another in the same deck unticks the first. Zero or one per deck is a checkbox's meaning, and unticking then works for keyboard and screen-reader users. Amends task 004 invariant 7's "radio-per-deck in UI". Rejected: radios that uncheck on a second tap; strict radios plus a "None" row per deck.
- **MD-2**: Delete on the Edit configuration page is deferred; configurations stay deletable from the deck page's Configurations tab.
- **MD-3**: The Selected section resolves each selected id against one unfiltered query of all the user's configurations, since the filtered list lacks any selection a filter hides. Rejected: copying names into state at selection time (ADR 033; stale after a rename); per-id queries or a fetch-by-ids endpoint.
- **MD-4**: A selected configuration that no longer exists is removed from the URL, with "A selected configuration no longer exists.", as soon as the settled list of all configurations lacks it. A `config_not_found` at Create removes it the same way and creates nothing, and pressing Create again proceeds with the rest. Count, ticks, and rows always agree, and a selection that vanished entirely still warns. Rejected: checking only when Create is pressed, counting the URL's ids until then (decided first and reversed before build, since the count and the rows disagreed); counting only resolved ids (a fully vanished selection would disappear without a warning); creating from what remains and warning afterwards.
- **MD-5**: A "Selected" section above the filters lists every selected configuration, including those a filter hides: name, "deck · subject", and a ✕ remove button, in subject → deck → name order, with the "Select at least one configuration to practise." hint when empty. The header's "N selected" count stays, because the section scrolls away. Rejected: dropping the count.
- **MD-6**: Tapping a configuration row ticks it; a trailing pencil button, "Edit <name>", opens Edit configuration with `returnTo` set to the page's URL (ADR 061). Rejected: the name as an edit link with only the checkbox ticking.
- **MD-7**: The Name input sits directly under the sticky header with its hint beneath it, and the general Create error renders with Create's other errors above the configuration list, not at the page bottom (ADR 035).
- **MD-8**: A hand-edited URL is not normalised: duplicate `config` ids are read once, and two ids from one deck stay ticked until the next tick in that deck, with the server's `duplicate_deck` as the backstop. Rejected: rewriting the URL on load.
- **MD-9**: While the list of all configurations loads, the Selected section shows no rows; if it fails, the section shows "Could not load your selected configurations." in place of its rows.

## Contracts

### `/practice/new` URL (ADR 061)

| Param | Meaning | Written by |
| --- | --- | --- |
| `subject`, `deck` | the filters, unchanged | `setFilters`; "Clear filters" deletes exactly these two |
| `status` | not read by New practice; arrives from the overview's New practice button | not written by this page; Cancel forwards it |
| `config` | repeated, one per selected configuration id, in the order they were selected | T1's helpers |
| `name` | the practice name verbatim, possibly empty; absent until the name is first edited | T2 |

- Every write from New practice passes `{ replace: true }`. It starts from a copy of the current params and changes only its own param or params.
- Cancel navigates to `/practice` carrying exactly those of `subject`, `deck`, `status` present on the current URL, and no other param.

### `frontend/src/lib/practiceSelection.ts` (new, T1)

```ts
/** The `config` params, de-duplicated, first occurrence first (MD-8). */
export function readSelectedConfigIds(searchParams: URLSearchParams): string[];

/** A copy of `searchParams` whose `config` params are exactly `ids`, in order; every other param untouched. */
export function withSelectedConfigIds(
  searchParams: URLSearchParams,
  ids: readonly string[],
): URLSearchParams;

/** Makes `configId` its deck's one selection (MD-1): drops every id in `deckConfigIds`, then appends `configId`. */
export function selectConfig(
  selectedIds: readonly string[],
  deckConfigIds: readonly string[],
  configId: string,
): string[];

/** One tap on a checkbox (MD-1): removes `configId` if selected, otherwise `selectConfig`. */
export function toggleConfig(
  selectedIds: readonly string[],
  deckConfigIds: readonly string[],
  configId: string,
): string[];
```

`deckConfigIds` is every configuration id in the tapped configuration's deck, meaning its `ConfigurationGroup.configs` ids. A visible deck group always holds all of that deck's configurations, because the filters narrow by subject and deck, never within a deck.

### `ConfigurationPickList` props (`frontend/src/components/practice/ConfigurationPickList.tsx`)

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
- T5 makes the label `flex-1` and adds a sibling `<button type="button" aria-label="Edit {name}">`. It holds lucide `Pencil` (`h-4 w-4`, `aria-hidden`) in an `h-11 w-11` box, styled like `DeckConfigurationRow`'s delete button.

### `SelectedConfigurationList` (new, T3; `frontend/src/components/practice/SelectedConfigurationList.tsx`)

```ts
type SelectedConfigurationListProps = {
  /** Selected configs that resolved against the unfiltered list, in that list's order (subject → deck → name). */
  configs: DeckPracticeConfigSummary[];
  onRemove: (configId: string) => void;
};
```

- Renders a `<ul>` with one `<li>` per configuration: the name (`text-[15px] text-(--color-text)`), below it `{deck_name} · {subject_name}` (`text-[11px] text-(--color-text-muted)`), and a trailing `<button type="button" aria-label="Remove {name}">` holding lucide `X` (`h-4 w-4`, `aria-hidden`) in an `h-11 w-11` box.
- No fetching, no heading, no empty state of its own.

### Unfiltered configs query (MD-3, T3)

`useQuery({ queryKey: ['deck_practice_configs', null, null], queryFn: () => readDeckPracticeConfigs() })`

This is the same key the filtered query uses when neither filter is set, so an unfiltered page still makes one request. Every existing invalidation of `['deck_practice_configs']` covers it.

### Page layout, top to bottom (MD-5, MD-7, MD-9; complete after T3)

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

### Create (MD-4; T4)

- **On press:** clear `rowError`, `topError`, `saveError`, then POST `{ name: name.trim(), deck_practice_config_ids: <selected ids, URL order> }`. There is no page-side check (MD-4).
- **On `config_not_found`:** set `topError` to `MISSING_CONFIGURATION_MESSAGE`, write the URL without `detail.config_id` (`withSelectedConfigIds`, `replace`), and invalidate `['deck_practice_configs']`.
- All other error branches are unchanged.

### Removing a selection that no longer exists (MD-4; T4)

- **Acts only on settled data:** the unfiltered query has `data` and `isFetching === false`. After a round trip the page remounts onto the cached list while the invalidated refetch runs, and a configuration created on that trip exists only in the refetched list. Acting on the cached list would remove it.
- **`missingIds`** is the selected ids absent from that data, computed during render.
- **When `missingIds` is non-empty:**
  - During render, set `topError` to `MISSING_CONFIGURATION_MESSAGE` unless it already holds it. This uses the file's existing adjust-state-during-render pattern, so no `setState` runs inside an effect. The sentence stays until the next Create press clears it, as every `topError` does today.
  - In a `useEffect`, write the URL without `missingIds` (`withSelectedConfigIds`, `replace`).
- **One effect owns every URL write that reacts to fetched data:** T1's returned-configuration one-shot and this removal. Two `setSearchParams` calls made after one render both start from that render's params, and the second overwrites the first. The effect removes `missingIds` first, then applies the one-shot's `selectConfig` if it is due, then calls `setSearchParams` once.
- The header count stays `readSelectedConfigIds(searchParams).length`. Once the effect has run, it equals the number of Selected rows.

### `frontend/src/lib/practiceCopy.ts` (T4)

`export const MISSING_CONFIGURATION_MESSAGE = 'A selected configuration no longer exists.';` Both removal paths render it.

### Edit round trip (MD-6, ADR 061; T5)

- **Pencil:** navigates to `pathname: /deck-configurations/{configId}/edit`, with a `search` built by `URLSearchParams.set('returnTo', location.pathname + location.search)`. No router state.
- **`DeckConfigurationEditor` Save success:**
  ```ts
  navigate(
    returnTo ?? `/decks/${saved.deck_id}?tab=configurations`,
    mode === "create" ? { state: { configurationId: saved.id } } : undefined,
  );
  ```
  Cancel is unchanged.

### New user-facing copy (ADR 021 checked: no schema term)

- "Selected"
- "Remove {name}"
- "Edit {name}"
- "Could not load your selected configurations."

Every other string on the page is existing copy, some of it moved.

## Tasks

Every task edits `frontend/src/pages/PracticeCreatePage.tsx`, so they run strictly in order: T1 → T2 → T3 → T4 → T5. No two can run in parallel.

### T1 — The selection is a checkbox list held in the URL (MD-1, ADR 061, MD-8) — no dependencies

- [x] **Goal:** New practice's selection moves from component state to repeated `config` URL params and is toggled through checkboxes, so it can be cleared and survives every round trip.
- **Files:**
  - `frontend/src/lib/practiceSelection.ts` (new)
  - `frontend/src/lib/practiceSelection.test.ts` (new)
  - `frontend/src/components/practice/ConfigurationPickList.tsx`
  - `frontend/src/pages/PracticeCreatePage.tsx`
  - `frontend/src/pages/PracticeCreatePage.test.tsx`
  - `frontend/src/pages/practicePrefilterChain.test.tsx`
- **Details:**
  - Implement `practiceSelection.ts` per Contracts.
  - Convert `ConfigurationPickList` to the Contracts shape without `onEdit`: `checked={selectedIds.has(config.id)}` and `onChange={() => onToggle(group, config.id)}`. Rewrite its doc comment: at most one per deck is enforced by `toggleConfig`, not natively (MD-1).
  - In `PracticeCreatePage`:
    - Delete the `selection` state and the task 004 MD-4 comment above it.
    - Set `selectedIds = readSelectedConfigIds(searchParams)`.
    - `onToggle` writes `withSelectedConfigIds(searchParams, toggleConfig(selectedIds, group.configs.map((c) => c.id), configId))` with `replace`.
    - The count and Create's enabled state use `selectedIds.length`; the POST sends `selectedIds`.
    - Update the component doc comment, which currently says "pick one configuration per deck".
  - **The returned-config one-shot** (`location.state.configurationId`):
    - Keep capturing it at mount, and keep consuming it only once the id is found in `configsQuery.data`.
    - On a match, write `selectConfig(selectedIds, <ids in configsQuery.data with the match's deck_id>, match.id)` to the URL with `replace`.
    - Do the write inside a `useEffect`, guarded by a `useRef` flag rather than state. `setSearchParams` is a navigation and must not run during render, and a ref keeps the effect free of `setState` (the `react-hooks` lint rules).
  - **Cancel and Clear filters:**
    - Cancel builds its `search` from exactly the present `subject`, `deck`, `status` values (ADR 061).
    - The empty-state "Clear filters" button deletes only `subject` and `deck` from a copy of the current params, with `replace` (ADR 061).
  - **Tests in `PracticeCreatePage.test.tsx`:**
    - Every `radio` role query becomes `checkbox`.
    - `renderCreate` also renders, outside `<Routes>`, a probe with `data-testid="current-location"` showing `pathname + search`. Assert params by decoding them through `URLSearchParams`, never by comparing an encoded literal.
    - Replace "enforces one selected configuration per deck" with an MD-1 test:
      1. Tick Recall: it is checked.
      2. Tick Recognition: Recognition is checked and Recall is not.
      3. Tick Recognition again: neither is checked, no "selected" count shows, and Create is disabled.
    - Add:
      - Ticking Recall then Basics makes `getAll('config')` equal `['c1', 'c3']`.
      - Mounting at `/practice/new?config=c1&config=c3` shows Recall and Basics checked and "2 selected".
      - Round trip: tick Recall and Basics → New configuration → "Finish new config" (the stub returns `c2`, deck `d1`) → Recognition and Basics checked, Recall unchecked, "2 selected".
      - Mounting at `/practice/new?subject=s1&config=c3`, with the configurations mock returning `[]` for `s1`, then clicking Clear filters leaves no `subject` and `config` equal to `['c3']`.
    - Change the Cancel test to mount at `/practice/new?subject=s1&status=completed&config=c1`. It asserts landing on pathname `/practice` with `subject=s1`, `status=completed`, and no `config`.
  - **`practicePrefilterChain.test.tsx`:**
    - `radio` becomes `checkbox`.
    - Retitle the save-direction test so it says earlier selections are kept (ADR 061), not gone (task 004 MD-6), and update its two task 004 MD-6 comments.
    - After the return, it asserts pathname `/practice/new`; `config` params `c1`, `c3`, then the created configuration's id; Recall, Basics and Fresh Config all checked; and "3 selected".
- **Out of scope:**
  - `name` in the URL (T2).
  - The Selected section (T3).
  - The missing-configuration check (T4).
  - The pencil and the create-only hand-back (MD-6, ADR 061; T5).
  - Changing `PracticeOverviewPage`'s own forwarding (ADR 061 fixes this at Cancel).
  - Normalising hand-edited URLs (MD-8).
- **Done when:**
  - `grep -n "radio" frontend/src/components/practice/ConfigurationPickList.tsx frontend/src/pages/PracticeCreatePage.tsx frontend/src/pages/PracticeCreatePage.test.tsx frontend/src/pages/practicePrefilterChain.test.tsx` prints nothing.
  - `grep -n "useState<Record" frontend/src/pages/PracticeCreatePage.tsx` prints nothing.
  - `practiceSelection.test.ts` covers: repeated ids read once; `withSelectedConfigIds` leaving `subject`, `name`, `status` untouched; toggling off; same-deck replacement; and `selectConfig` dropping two pre-existing same-deck ids.
  - Every test named in Details passes.
  - In `frontend/`, `npx vitest run`, `npm run lint`, and `npm run build` are clean.
  - The commit contains only this task's hunks.
- **Commit:** `fix: new practice selection is a checkbox list in the URL (task 019 T1)`
- Notes: in `practicePrefilterChain.test.tsx` Basics is `c2` and the created configuration is `c9`, so the save-direction walk asserts `config` equal to `c1`, `c2`, `c9`; this file's `c3` was the page test's fixture id. "Clear filters" calls the existing `setFilters` with both filters null, which already deletes exactly `subject` and `deck` from a copy with `replace`. The existing auto-select test also asserts the URL ends with `config=c2`, and both round-trip tests wait for the tick rather than asserting on first render, since the one-shot now lands in an effect. Otherwise none.

### T2 — The name sits at the top and rides the URL (ADR 061, MD-7) — depends on T1

- [x] **Goal:** the Name input moves under the sticky header and persists through round trips as the `name` param, and the general Create error moves up beside Create's other errors.
- **Files:**
  - `frontend/src/pages/PracticeCreatePage.tsx`
  - `frontend/src/pages/PracticeCreatePage.test.tsx`
- **Details:**
  - Move the Name label and input to directly below the sticky header, above `PracticeFilterBar` (MD-7).
  - **Name state:** `useState(() => (searchParams.has('name') ? searchParams.get('name')! : formatDateTime(new Date())))`. This reads the URL once, at mount.
    - The input stays bound to that local state. Each change also writes `name` to the URL with `replace`.
    - Binding the input's value straight to `searchParams` would route every keystroke through a router navigation. The page remounts on every return, so reading at mount is enough.
    - The `name` param is absent until the first edit. Clearing the input writes `name=` (empty), which renders an empty input on return.
  - **Hints:**
    - Split the bottom hint paragraph. "Give this practice a name to create it." renders directly beneath the Name input whenever `name.trim() === ''`.
    - "Select at least one configuration to practise." stays at the page bottom, whenever `selectedIds.length === 0`; T3 moves it.
    - The two hints are now independent; today only one shows at a time.
  - Move the `saveError` `<p role="alert">` from the page bottom to directly after the `topError` paragraph (MD-7).
  - **Tests:**
    - Mounting at `/practice/new` gives a non-empty input and no `name` param. Clearing the input and typing "Exam cram" makes the `name` param "Exam cram".
    - Round trip: type "Exam cram" → New configuration → "Finish new config" → input value "Exam cram".
    - Mounting at `/practice/new?name=&config=c1` gives an empty input, the name hint, and a disabled Create.
    - Mounting at `/practice/new?name=Exam%20cram` gives input value "Exam cram".
    - `compareDocumentPosition` shows the Name input before `getByPlaceholderText('All subjects')`.
    - In the general-error test (retitle it "… above the configuration list"), the alert precedes the Recall checkbox.
    - Adjust "Create stays disabled with the unmet condition shown…" to the independent hints.
- **Out of scope:**
  - The Selected section, and moving the select hint (T3).
  - Validating or trimming the `name` param on read.
- **Done when:**
  - Every test named in Details passes.
  - In `frontend/`, `npx vitest run`, `npm run lint`, and `npm run build` are clean.
  - The commit contains only this task's hunks.
- **Commit:** `fix: new practice name at the top, kept in the URL (task 019 T2)`
- Notes: the name state reads `searchParams.get('name') ?? formatDateTime(new Date())`, which is the Contracts' `has`/`get!` expression without the non-null assertion, since `get` is `null` only when the param is absent. The independent-hints test also unticks the selection with the name cleared, so both hints are asserted at once. Otherwise none.

### T3 — A Selected section lists every selection (MD-3, MD-5, MD-9) — depends on T2

- [x] **Goal:** a Selected section under the name lists every selected configuration, including those a filter hides, each removable with ✕.
- **Files:**
  - `frontend/src/components/practice/SelectedConfigurationList.tsx` (new)
  - `frontend/src/pages/PracticeCreatePage.tsx`
  - `frontend/src/pages/PracticeCreatePage.test.tsx`
- **Details:**
  - Add the unfiltered query per Contracts.
  - Resolve `allConfigs.filter((c) => selectedIdSet.has(c.id))`, which keeps the backend's subject → deck → name order (MD-5).
  - Build the component and the section per Contracts. The section goes between the Name block and `PracticeFilterBar`, with exactly one of its three contents (MD-9).
  - `onRemove` writes the URL without that id, with `replace`.
  - Delete the page-bottom "Select at least one…" paragraph; the hint now renders only inside the section.
  - The header count stays the URL-id count, done by T1; T4 makes it agree with the rows (MD-4).
  - **Tests:**
    - Where a test mounts with a selection, use `findByRole('checkbox', { name: 'Recall' })` as its load signal, not `findByText('Recall')`, which now matches twice.
    - Ticking Basics then Recall lists, within `getByRole('region', { name: 'Selected' })`, Recall ("Shared Deck Name · Alpha") before Basics ("Shared Deck Name · Beta").
    - "Remove Recall" unticks Recall's checkbox, removes its row, and drops `c1` from the URL.
    - Unticking a checkbox removes its row.
    - Rewrite the task 004 MD-4 test: after filtering to Beta, no Recall checkbox exists, the Selected region still lists Recall, and "1 selected" shows.
    - At `/practice/new?config=gone`, the region lists no row. T4 then removes the id; this test asserts only the row.
    - At `/practice/new?subject=s1&config=c1`, with MSW returning 500 only for a request carrying neither `subject_id` nor `deck_id`: the region shows "Could not load your selected configurations." and the filtered list still renders.
    - With nothing selected, the hint renders inside the region.
    - At `?subject=s1`, the recorded requests include one with neither `subject_id` nor `deck_id`.
- **Out of scope:**
  - Removing missing selections (T4).
  - A pencil or a link on Selected rows; MD-6 puts editing in the configuration list only.
  - Collapsing or truncating a long Selected list.
- **Done when:**
  - Every test named in Details passes.
  - In `frontend/`, `npx vitest run`, `npm run lint`, and `npm run build` are clean.
  - The commit contains only this task's hunks.
- **Commit:** `feat: new practice lists its selected configurations (task 019 T3)`
- Notes: `practicePrefilterChain.test.tsx` is also in this commit, outside the task's Files: its first two chains asserted the filter on the *last* recorded configurations request, and the unfiltered query (MD-3) now arrives last, so they assert that *some* request carries the filter (confirmed in the build session). The section's branch follows the layout contract's order, so the select hint wins over the load error when nothing is selected. Otherwise none.

### T4 — A selection that no longer exists is removed with a warning (MD-4) — depends on T3

- [x] **Goal:** a selected configuration that no longer exists is removed from the URL, with a warning, as soon as the settled list of all configurations shows it gone, and Create's `config_not_found` path removes it the same way.
- **Files:**
  - `frontend/src/lib/practiceCopy.ts`
  - `frontend/src/pages/PracticeCreatePage.tsx`
  - `frontend/src/pages/PracticeCreatePage.test.tsx`
- **Details:**
  - Add `MISSING_CONFIGURATION_MESSAGE` per Contracts. The existing `config_not_found` branch's string literal is replaced by it.
  - Implement "Removing a selection that no longer exists" per Contracts. This moves T1's one-shot URL write into the same effect.
  - Implement Create per Contracts: the `config_not_found` branch now also writes the URL without `detail.config_id`.
  - **Tests:**
    - At `/practice/new?config=c1&config=gone`, once the list loads:
      - The sentence shows, and the `config` params are `['c1']`.
      - Recall is checked, "1 selected" shows, and the Selected region lists Recall only.
      - No POST was sent.
    - At `/practice/new?config=gone`, once the list loads:
      - The sentence shows and no count shows.
      - Create is disabled, and the Selected region shows the select hint.
    - **Settled-data rule:**
      - Build a `QueryClient` (`retry: false`) and call `setQueryData(['deck_practice_configs', null, null], [configRecall])` before rendering. Render the page inside `QueryClientProvider` and `MemoryRouter` directly, as `renderWithProviders` does. MSW returns `ALL_CONFIGS`.
      - Mount at `/practice/new?config=c3`.
      - Once Basics's checkbox renders, Basics is checked, the `config` params are `['c3']`, and the sentence is absent.
    - Extend the existing `config_not_found` test: it also asserts Recall is unchecked and `c1` is absent from the URL, alongside its existing sentence and refetch assertions.
    - At `/practice/new?subject=s1&config=c1`, with the unfiltered GET returning 500:
      - Pressing Create POSTs `['c1']`.
      - The sentence is absent before the press.
- **Out of scope:**
  - Pluralising or rewording the sentence.
  - Naming which configuration was removed.
  - Any page-side check at Create (MD-4 replaced it).
  - Changing when `topError` clears.
- **Done when:**
  - Every test named in Details passes.
  - In `frontend/`, `npx vitest run`, `npm run lint`, and `npm run build` are clean.
  - The commit contains only this task's hunks.
- **Commit:** `fix: a selected configuration that no longer exists is removed with a warning (task 019 T4)`
- Notes: `missingIds` is wrapped in `useMemo` over the settled list and `searchParams`, since `react-hooks/exhaustive-deps` flags an array rebuilt each render as an effect dependency. The `config_not_found` branch skips the URL write when `detail.config_id` is null. The settled-data test was checked by removing the `isFetching` guard, under which it fails. Otherwise none.

### T5 — Edit a configuration from New practice and come back (MD-6, ADR 061) — depends on T1; after T4 (shared file)

- [ ] **Goal:** each configuration row gets a pencil that opens Edit configuration and returns to New practice with the draft intact, and an edit's Save no longer auto-selects the edited configuration.
- **Files:**
  - `frontend/src/components/practice/ConfigurationPickList.tsx`
  - `frontend/src/pages/PracticeCreatePage.tsx`
  - `frontend/src/pages/PracticeCreatePage.test.tsx`
  - `frontend/src/components/library/DeckConfigurationEditor.tsx`
  - `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
  - `frontend/src/pages/practicePrefilterChain.test.tsx`
- **Details:**
  - Add `onEdit` and the pencil button per Contracts. The page's `onEdit` navigates per Contracts.
  - In the editor, apply ADR 061's create-only hand-back per Contracts, and update the comment on the `{configurationId}` hand-back to say it is create-only.
  - **Tests in `PracticeCreatePage.test.tsx`:**
    - Add a `/deck-configurations/:configId/edit` stub route that shows its location.
    - At `/practice/new?subject=s1&config=c1&name=Exam`, clicking "Edit Recognition" lands on pathname `/deck-configurations/c2/edit`, whose decoded `returnTo` equals `/practice/new?subject=s1&config=c1&name=Exam`.
    - Clicking the Recognition label still ticks it and stays on `/practice/new`.
  - **Tests in `DeckConfigurationEditor.test.tsx`:** a state probe on the landing route shows:
    - An edit-mode Save entered with `?returnTo=/practice/new` lands there with `location.state` null.
    - A create-mode Save entered with the same `returnTo` lands there with `{ configurationId: <saved id> }`.
  - **Tests in `practicePrefilterChain.test.tsx`:**
    - Add the `/deck-configurations/:configId/edit` route with the real `DeckConfigurationEditor mode="edit"`, and MSW handlers for `GET` and `PATCH /api/deck_practice_configs/:id`.
    - New walk:
      1. At `/practice/new`, tick Recall and Basics, set the name to "Exam cram", and capture the full location.
      2. "Edit Recognition" → Cancel: the location equals the captured one, Recall and Basics are checked, and the name reads "Exam cram".
      3. "Edit Recognition" → Save with no change: the same location, Recognition unchecked, "2 selected".
  - **Browser check** per AGENTS.md's Browser checks line, against the dev servers:
    1. New practice → type a name → tick two configurations from different decks.
    2. Pencil on a third → Cancel: the name and both ticks are intact.
    3. Pencil → Save with no change: intact, and the edited configuration is not ticked.
    4. ✕ on a Selected row unticks its checkbox.

    Do not press Create and do not delete anything. Record the outcome in Notes.
- **Out of scope:**
  - Delete on Edit configuration (MD-2).
  - A pencil on Selected rows.
  - Any change to the editor's Cancel or to the deck page's configuration rows.
- **Done when:**
  - Every test named in Details passes.
  - The browser walk's outcome is in Notes.
  - `grep -rn "TODO(defer:" app/ frontend/src/` shows no new entry.
  - In `frontend/`, `npx vitest run`, `npm run lint`, and `npm run build` are clean.
  - The commit contains only this task's hunks.
- **Commit:** `feat: edit a configuration from new practice and return to the draft (task 019 T5)`
- Notes:

## Deferred — do not build

- Delete on the Edit configuration page (MD-2).
