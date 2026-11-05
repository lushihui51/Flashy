# 031 — Lengths in components

## Goal

Outcome: Flashy follows the text size the user has set in their browser, and everything on a screen grows together with it: the words, the blocks around them, the rows and the buttons.

Scope: The cycle covers every length a component under `frontend/src` writes, about 230 px values across 38 component files: each becomes a measurement, a CSS derivation or a fixed design size in rem, a design size used more than once becomes a `@theme` token in rem in `frontend/src/index.css` that components reach by its utility, every border width leaves the components for an `index.css` utility beside the press shadow's offset and the press travel, which stay in px there and nowhere else, comments name sizes in rem or by token, and a source scan beside the sticky-offset scan fails on any px literal in a component. It leaves out any change to how a screen is laid out or looks at the browser's default text size, the circle and the marks, which later cycles draw in rem under this scan, and the `index.css` colour tokens, which ADR 090 holds.

Judgement: The engineer judges in headless Chromium against the dev server at 390 wide, with the browser's default text size at 16px and then at 24px: Your library, a deck's page, Edit configuration, the Practice page and the run page each read the same at 16px as before the cycle, and at 24px every word, block, row, tab and button has grown together, no label spills out of its block, and each outline and press shadow is still the hairline it was; and `npx vitest run` passes with the px scan in it.

## Records

- PDR 030: The browser's text size followed by everything on every screen
- ADR 090: Eight colour tokens named by meaning as the only colours
- ADR 100: A measured header height and one component for a page's sticky row
- ADR 101: Every length in a component measured, derived, or a fixed design size in rem

## Tasks

### T1 — The tokens, the outline utilities and the shell

**Status**

- [x]

**Goal**

`frontend/src/index.css` holds every repeated design size as a `@theme` token in rem and every 1.5px outline and rule as a utility, and the shell and the shared components under `components/ui/` and `components/shell/` write no px.

**Dependencies**

None.

**Files**

- `frontend/src/index.css`
- `frontend/src/components/ui/AddButton.tsx`
- `frontend/src/components/ui/BottomSheet.tsx`
- `frontend/src/components/ui/Breadcrumb.tsx`
- `frontend/src/components/ui/ConfirmDialog.tsx`
- `frontend/src/components/ui/ListRow.tsx`
- `frontend/src/components/ui/ListRow.test.tsx`
- `frontend/src/components/ui/PickerCombobox.tsx`
- `frontend/src/components/ui/Tabs.tsx`
- `frontend/src/components/shell/AccountSheet.tsx`
- `frontend/src/components/shell/AuthSlot.tsx`
- `frontend/src/components/shell/Logo.tsx`
- `frontend/src/components/shell/SearchBar.tsx`
- `frontend/src/components/shell/SideDrawer.tsx`
- `frontend/src/components/shell/TopBar.tsx`

**Details**

The rule, ADR 101, for every length in every file of this task and of T2 and T3:

- A length a component writes must be one of three: a measurement, a derivation by CSS, or a fixed design size in rem. A number that stands for another element's size or position must never be written; it is measured or derived.
- A design size written in more than one component file must be a `@theme` token below, and a component must write the token's utility, never its value. A one-off length must be written in rem, as an arbitrary value such as `text-[1.3125rem]` or as Tailwind's own rem scale utility such as `h-14.5`, which is 3.625rem; the scale utility is preferred where the value is a multiple of 0.25rem.
- A token names one role. Two things that share a value but would not change together take separate tokens, as `--spacing-tab` and `--spacing-account` do below.
- A border width, a press shadow's offset and a press travel stay in px and must live only in `index.css` utilities. `border-[1.5px]` must appear in no component; Tailwind's built-in `border`, one px with no literal in the source, stays where a component draws a 1px hairline.
- A comment must name a size in rem or by its token, never in px.
- Nothing in this task changes how a screen looks at the browser's default text size, PDR 030: every converted value is the same length at a 16px root.

The tokens, added to the `@theme` block in `frontend/src/index.css` beside ADR 090's eight colours, exactly these names and values, and no other size token; T2 and T3 spend them and add none:

```css
--text-label: 0.8125rem;
--text-body: 0.9375rem;
--text-action: 1.0625rem;
--text-title: 1.1875rem;
--text-value: 1.625rem;
--text-page: 1.875rem;
--radius-tight: 0.625rem;
--radius-field: 0.875rem;
--radius-block: 1.25rem;
--spacing-field: 2.875rem;
--spacing-action: 3.25rem;
--spacing-tab: 2.375rem;
--spacing-account: 2.375rem;
--spacing-icon: 1.125rem;
--spacing-icon-lg: 1.375rem;
--spacing-icon-sm: 0.9375rem;
--spacing-badge-x: 0.5625rem;
--spacing-badge-y: 0.1875rem;
```

Their roles, which decide where each is spent: `text-label` is a field's label, a row's second line and a count, today's 13px; `text-body` is body text, a button's words and a row's title line, 15px; `text-action` a main action's words, 17px; `text-title` a form's heading, a confirm's or sheet's title and a list row's title, 19px; `text-value` a card's lead value, 26px; `text-page` a page's heading, 30px. `rounded-tight` is a badge and the "Hidden" tile, 10px; `rounded-field` an input, a picker's list and a form's header button, 14px; `rounded-block` a block, a zone, a confirm and a sheet's top, 20px. `h-field` is an input's height, 46px; `h-action` and `size-action` a main action's height and a square control's side, 52px; `h-tab` a tab's and a board chip's height, 38px; `size-account` the top bar's account circle, 38px; `size-icon` an icon inside a button, 18px; `size-icon-lg` the top bar's menu and New icons and the empty library's icon, 22px; `size-icon-sm` the Play icon and a subject's icon in a breadcrumb, 15px; `px-badge-x` and `py-badge-y` the padding of the Active badge and the Retry badge, 9px and 3px.

The utilities, added to `frontend/src/index.css` after `tappable-pressed`, exactly these, and the only lines outside `tappable`, `tappable-sm` and `tappable-pressed` where px may appear:

```css
@utility outlined-ink {
  border: 1.5px solid var(--color-ink);
}
@utility outlined-line {
  border: 1.5px solid var(--color-line);
}
@utility outlined-ink-dashed {
  border: 1.5px dashed var(--color-ink);
}
@utility outlined-reserved {
  border: 1.5px solid transparent;
}
@utility ruled-top {
  border-top: 1.5px solid var(--color-ink);
}
@utility ruled-bottom {
  border-bottom: 1.5px solid var(--color-ink);
}
```

`outlined-reserved` is for a control that keeps its outline's room and shows it only when disabled, as `DeckEditor.tsx`'s row controls do; a `disabled:border-(--color-line)` beside it changes the colour alone.

The sweep over this task's files, every px value in them:

- `AddButton.tsx`, `SideDrawer.tsx`, `AccountSheet.tsx`'s button, `Breadcrumb.tsx`'s row, `ConfirmDialog.tsx`'s description and `PickerCombobox.tsx`'s rows: `text-[15px]` becomes `text-body`.
- `ConfirmDialog.tsx`: `rounded-[20px]` becomes `rounded-block` and its title `text-title`.
- `ListRow.tsx`: `text-[19px]` becomes `text-title`, `text-[13px]` `text-label`, `gap-[3px]` `gap-0.75`, `rounded-[20px]` `rounded-block`, and `min-h-[78px]` `min-h-[4.875rem]`, a size chosen for how the row looks, ADR 101; its comment is rewritten in rem. `ListRow.test.tsx`'s two `min-h-\[78px\]` matchers become the new class.
- `Tabs.tsx`: `h-[38px]` becomes `h-tab`.
- `BottomSheet.tsx`: `rounded-t-[20px] border-t-[1.5px] border-(--color-ink)` becomes `rounded-t-block ruled-top`.
- `PickerCombobox.tsx`: the input's `h-[46px] rounded-[14px] border-[1.5px] border-(--color-line)` becomes `h-field rounded-field outlined-line`, and the list's `rounded-[14px]` `rounded-field`. Its mechanism, an absolutely placed box closed on blur, must not change; a later cycle replaces it.
- `AuthSlot.tsx`: both `h-[38px] w-[38px]` become `size-account`, and the signed-in button's `border-[1.5px] border-(--color-ink)` `outlined-ink`.
- `AccountSheet.tsx`: the placeholder circle's `border-[1.5px] border-(--color-ink)` becomes `outlined-ink`.
- `TopBar.tsx`: `h-[58px]` becomes `h-14.5`, and both icons `size-icon-lg`.
- `Logo.tsx`: `text-[21px]` becomes `text-[1.3125rem]`; the SVG's em sizes stay, they already follow the text.
- `SearchBar.tsx`: the icon becomes `size-icon`, the input `h-field` and `outlined-line`. `pl-[42px]` stands for the icon's offset and width and must not be written as a number. Guidance: make the outlined, rounded element a flex container holding the icon and a bare input with `flex-1`, `bg-transparent` and no outline of its own, with the container taking the focus ring through `focus-within:`; the padding is then the container's and the icon's place is laid out, not computed.
- `Breadcrumb.tsx`'s comment names its hit area as `h-11`, not 44px.

The screen check, PDR 030, for the Done when below: in headless Chromium through playwright-core from the session scratchpad against `localhost:5173`, signed out of Clerk with `DEV_AUTH_USER_ID` and `ENV=development`, at 390 wide. The browser's text size is simulated by `page.addStyleTag({ content: 'html { font-size: 24px }' })` after each load, since the root follows the browser's size and `index.css` sets none; a run without the tag is the 16px case.

**Out of scope**

- Any px in `components/library/`, `components/practice/` or `pages/`: T2 and T3.
- The scan test that fails on a px literal: T3.
- A size token beyond the eighteen above: T2 and T3 may not add one; a size they find repeated across files with no token is a blocked task, not a new line in `index.css`.
- The picker's list as a panel over a dimmed page: a later cycle.
- Any change to a colour token or to `tappable`'s values: never, ADR 090 and PDR 020.

**Done when**

- `grep -nE "[0-9]px" frontend/src/index.css` prints exactly eleven lines, all inside `@utility` blocks: the two borders, two shadows and one press travel of the `tappable` utilities, and the six new utilities' widths.
- `grep -rnE "[0-9]px" frontend/src/components/ui frontend/src/components/shell --include=*.tsx | grep -v "\.test\."` prints nothing.
- `cd frontend && npx vitest run src/components/ui src/components/shell src/test/theme.test.ts` passes.
- A script in headless Chromium, as Details describe, opens `/library` and prints the `getBoundingClientRect().height` of the top bar's row, the search bar's outlined element, the first `role="tab"`, the first subject row and the "Log in" button, at a 16px root and at a 24px root; at 16px it prints `58 46 38 80 44` and at 24px `87 69 57 117 66`, and the script's output is the evidence. The subject row is 80, not `ListRow`'s minimum of 78, because its icon box in `LibraryPage.tsx`, 46px until T2 converts it, sets the row's height with the padding and the outline; at 24px that box is still 46px, so the minimum, 117, holds until T2.
- Screenshots at 390 wide of Your library with the menu open, of the account sheet, and of a delete confirm from the Practice page, each at 16px and at 24px, saved in the session scratchpad and named in the Debrief, for the engineer to set side by side.

**Debrief**

Evidence, in the Done when's order:

- `grep -nE "[0-9]px" frontend/src/index.css` printed eleven lines, all inside `@utility` blocks; a second pass over the file found none outside one. Output: `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/39bb9f42-43c8-4e2b-9766-4fcb3eeb279c/scratchpad/grep-index.out`.
- The grep over `components/ui` and `components/shell` printed nothing.
- `npx vitest run src/components/ui src/components/shell src/test/theme.test.ts` passed: 15 files, 96 tests. The whole frontend's `npx vitest run` passed, 58 files, 587 tests; `npm run lint` and `npm run build` were clean.
- `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/39bb9f42-43c8-4e2b-9766-4fcb3eeb279c/scratchpad/shell.mjs`, output in `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/39bb9f42-43c8-4e2b-9766-4fcb3eeb279c/scratchpad/after.out`, printed `58 46 38 80 44` at 16px and `87 69 57 117 66` at 24px.
- Screenshots in `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/39bb9f42-43c8-4e2b-9766-4fcb3eeb279c/scratchpad`: `after-library-menu-16.png`, `after-library-menu-24.png`, `after-account-sheet-16.png`, `after-account-sheet-24.png`, `after-delete-confirm-16.png`, `after-delete-confirm-24.png`. Each `before-*-16.png` taken before the first edit, these three screens and Your library and the Practice page without a sheet, is byte-identical to its `after-*-16.png`.

Departures:

- `SearchBar.tsx`'s flex container is a `label`, not a `div`, so a click on the icon or the padding still reaches the input, as it did when the input lay under them. A script clicked the icon and the input took focus, and the container then computed the 2px ink ring (`/tmp/claude-1000/-home-jadenlu-Projects-Flashy/39bb9f42-43c8-4e2b-9766-4fcb3eeb279c/scratchpad/ring.mjs`).
- `SearchBar.tsx`'s `pl-3.25` and `gap-2.75` are the values that keep the icon and the text where they were at 16px. At a device pixel ratio of 1 they match exactly; where a 1.5px outline draws at its full width, the icon sits half a pixel further right than it did, since it now lies inside the outline.
- The account sheet cannot be opened signed out, so its screenshots use a stand-in user: `shell.mjs` answers `useUser()` in `AuthSlot.tsx` and `AccountSheet.tsx` through `page.route`, and no source file changes. The delete confirm was left unanswered; nothing was deleted.

Read `SearchBar.tsx`: it is the one place this task changes structure rather than a value.

### T2 — The library's components and pages

**Status**

- [ ]

**Goal**

Every library form, row, list and page writes no px and reads the same at the default text size.

**Dependencies**

- T1: the `@theme` size tokens and the `outlined-*` and `ruled-*` utilities in `frontend/src/index.css`, by name.

**Files**

- `frontend/src/components/library/CardFieldsForm.tsx`
- `frontend/src/components/library/CardList.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/components/library/DeckConfigurationRow.tsx`
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/FieldAssignmentBoard.tsx`
- `frontend/src/components/library/SubjectForm.tsx`
- `frontend/src/pages/LibraryPage.tsx`
- `frontend/src/pages/SubjectDetailPage.tsx`
- `frontend/src/pages/DeckDetailPage.tsx`

**Details**

T1's Details give the rule, ADR 101, the tokens with their roles and the utilities; they hold here unchanged. This task may add no token and no utility: a size it finds repeated across files with no token is a blocked task.

The sweep over this task's files, every px value in them, by role:

- Text: every `text-[13px]` becomes `text-label`; every `text-[15px]` `text-body`; every `text-[17px]` `text-action`; every `text-[19px]` `text-title`; `text-[26px]` in `CardList.tsx` `text-value`; every `text-[30px]` page heading `text-page`.
- Radii: every `rounded-[10px]` becomes `rounded-tight`; every `rounded-[14px]` `rounded-field`; every `rounded-[20px]` `rounded-block`.
- Outlines: every `border-[1.5px] border-(--color-line)` becomes `outlined-line`; every `border-[1.5px] border-(--color-ink)` `outlined-ink`; `FieldAssignmentBoard.tsx`'s dashed drop area `outlined-ink-dashed`; `DeckEditor.tsx`'s `FIELD_ICON_BUTTON` `outlined-reserved`, its `disabled:border-(--color-line)` staying; `CardList.tsx`'s `border-t-[1.5px] border-(--color-ink)` `ruled-top`; `FieldAssignmentBoard.tsx`'s heading `border-b-[1.5px] border-(--color-ink)` `ruled-bottom`.
- Heights and widths: every input's `h-[46px]` becomes `h-field`, and `LibraryPage.tsx`'s 46px icon box `size-field`; every `h-[52px]` and `h-[52px] w-[52px]` becomes `h-action` or `size-action`; `FieldAssignmentBoard.tsx`'s chip `h-[38px]` `h-tab`; every 18px icon `size-icon`; `LibraryPage.tsx`'s 22px icon `size-icon-lg`; the 15px icons in `DeckDetailPage.tsx`'s breadcrumb and `SubjectDetailPage.tsx`'s Play `size-icon-sm`.
- One-offs, in rem: `FieldAssignmentBoard.tsx`'s count pill `h-[30px]` becomes `h-7.5`; `SubjectDetailPage.tsx`'s subject icon `h-[26px] w-[26px]` `size-6.5`; `DeckEditor.tsx`'s two `my-[5px]` `my-1.25`, written once in a shared constant since both controls of a field's row carry it.
- Comments: `CardList.tsx`'s `HALF_WIDTH_CHARACTERS` comment names the size as `text-body`, not 15px; the two `changeView` comments in `LibraryPage.tsx` and `DeckDetailPage.tsx` say the pressed tab sits lower by the press travel, not by 2px.

Nothing else in these files changes: no layout, no word, no colour, no test. The three tabbed pages' reveal after a tab change, cycle 028's, must still clear the sticky rows; it reads measured rectangles and no number here.

The screen check for the Done when below is T1's: headless Chromium through playwright-core from the session scratchpad against `localhost:5173`, signed out of Clerk with `DEV_AUTH_USER_ID` and `ENV=development`, at 390 wide, a 24px root simulated with `page.addStyleTag({ content: 'html { font-size: 24px }' })` after each load.

**Out of scope**

- Any px in `components/practice/`, `components/ui/`, `components/shell/` or a practice page: T1 and T3.
- The scan test: T3.
- A new token or utility in `index.css`: T1 owns the file; a size this task needs and finds missing blocks the task.
- Any change to what a library screen shows or how it is laid out: never in this cycle; the circle on these rows is a later cycle.

**Done when**

- `grep -rnE "[0-9]px" frontend/src/components/library frontend/src/pages/LibraryPage.tsx frontend/src/pages/SubjectDetailPage.tsx frontend/src/pages/DeckDetailPage.tsx | grep -v "\.test\."` prints nothing.
- `cd frontend && npx vitest run src/components/library src/pages/LibraryPage.test.tsx src/pages/SubjectDetailPage.test.tsx src/pages/DeckDetailPage.test.tsx src/lib/viewParams.test.tsx` passes.
- A script in headless Chromium, as Details describe, opens the page of a deck whose name fits one line and prints the `getBoundingClientRect().height` of the page heading, the "Practice" button, the first card block's lead value and, on Edit deck, the first field's name input, at a 16px root and at a 24px root; at 16px it prints `32 48 29 46` within 1px and at 24px `48 72 43 69` within 1px, and the script's output is the evidence.
- Screenshots at 390 wide of Your library on the Subjects tab, a subject's page, a deck's page on the Cards tab and Edit configuration, each at 16px and at 24px, saved in the session scratchpad and named in the Debrief, for the engineer to set side by side.

**Debrief**

None.

### T3 — The practice's components and pages, and the scan

**Status**

- [ ]

**Goal**

Every practice component and page writes no px, a scan test fails on any px literal in a component, and the cycle's judgement holds.

**Dependencies**

- T1: the `@theme` size tokens and the `outlined-*` and `ruled-*` utilities in `frontend/src/index.css`, by name.

**Files**

- `frontend/src/components/practice/ConfigurationPickList.tsx`
- `frontend/src/components/practice/FieldValue.tsx`
- `frontend/src/components/practice/PracticeFilterBar.tsx`
- `frontend/src/components/practice/PracticeRunRow.tsx`
- `frontend/src/components/practice/PracticeStatusBadge.tsx`
- `frontend/src/components/practice/RatingChip.tsx`
- `frontend/src/components/practice/RunBreakdown.tsx`
- `frontend/src/components/practice/RunProgressBar.tsx`
- `frontend/src/components/practice/SelectedConfigurationList.tsx`
- `frontend/src/components/practice/SessionDeckChips.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/PracticeOverviewPage.tsx`
- `frontend/src/pages/PracticeRunPage.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx`
- `frontend/src/test/pxLiterals.test.ts` (new)

**Details**

T1's Details give the rule, ADR 101, the tokens with their roles and the utilities; they hold here unchanged. This task may add no token and no utility: a size it finds repeated across files with no token is a blocked task.

The sweep over this task's files, every px value in them, by role:

- Text: every `text-[13px]` becomes `text-label`; every `text-[15px]` `text-body`; every `text-[17px]` `text-action`; every `text-[19px]` `text-title`; `FieldValue.tsx`'s `text-[26px]` `text-value`; every `text-[30px]` page heading `text-page`; `FieldValue.tsx`'s `text-[54px]`, written once, `text-[3.375rem]`.
- Radii: every `rounded-[10px]` becomes `rounded-tight`; every `rounded-[14px]` `rounded-field`; every `rounded-[20px]` `rounded-block`; `RunProgressBar.tsx`'s `rounded-[4px]` Tailwind's `rounded-sm`, which is 0.25rem.
- Outlines: every `border-[1.5px] border-(--color-line)` becomes `outlined-line`, the run page's disabled "Next card" included; `ConfigurationPickList.tsx`'s checkbox `border-[1.5px] border-(--color-ink)` `outlined-ink`; `RatingChip.tsx`'s unrated chip `border-[1.5px] border-dashed border-(--color-ink)` `outlined-ink-dashed`; `PracticeRunPage.tsx`'s zone heading `border-b-[1.5px] border-(--color-ink)` `ruled-bottom`. The 1px `border` on the Completed badge and on the summary's bucket chip stays.
- Heights and widths: `PracticeCreatePage.tsx`'s name input `h-[46px]` becomes `h-field`; every `h-[52px]` `h-action`; every 18px icon `size-icon`.
- Badges: `PracticeStatusBadge.tsx`'s and `PracticeRunPage.tsx`'s Retry `px-[9px] py-[3px]` become `px-badge-x py-badge-y`.
- One-offs, in rem: `PracticeFilterBar.tsx`'s `[&_input]:h-[42px]` becomes `[&_input]:h-10.5`; `PracticeRunPage.tsx`'s zone heading `h-[42px]` `h-10.5`, its zone `px-[18px]` `px-4.5`, its `last:pb-[18px]` `last:pb-4.5`, and its card action `h-[54px]` `h-13.5`; `FieldValue.tsx`'s "Hidden" tile `h-[34px]` `h-8.5`; `RunBreakdown.tsx`'s row `py-[14px]` `py-3.5`; `RunProgressBar.tsx`'s `gap-[3px]` `gap-0.75`.
- Comments: `PracticeFilterBar.tsx`'s says a filter sits 0.25rem shorter than a field, not 4px; `PracticeOverviewPage.tsx`'s `changeView` comment says the pressed tab sits lower by the press travel, not by 2px.
- `PracticeRunPage.test.tsx`'s two size assertions become `text-[3.375rem]` and `text-value`.

Nothing else in these files changes: no layout, no word, no colour. The summary's words and shape are a later cycle's; this task only converts the units they are drawn in.

The scan, ADR 101, new at `frontend/src/test/pxLiterals.test.ts`, written as `frontend/src/test/stickyOffset.test.ts` is:

```ts
/** Every `<number>px` in a source line under src/, index.css and the tests excepted. */
export function pxLiterals(where: string, text: string): string[];
```

- It walks every `.ts`, `.tsx` and `.css` file under `src/`, leaving out `index.css`, every `.test.` file and the `test/` directory, as `theme.test.ts`'s `sourceFiles` does, and reports each line matching `/\d(?:\.\d+)?px\b/` as `path:line`.
- Its first test gives the detector `'h-[46px]'`, which it reports, and `'gap-px'`, ``'`${height}px`'`` and `'h-11.5'`, which it does not: a measured value and Tailwind's own `px` suffix are not literals.
- Its second test asserts the scan over `src/` finds nothing, and that more than 40 files were scanned.

The screen check for the Done when below is T1's: headless Chromium through playwright-core from the session scratchpad against `localhost:5173`, signed out of Clerk with `DEV_AUTH_USER_ID` and `ENV=development`, at 390 wide, a 24px root simulated with `page.addStyleTag({ content: 'html { font-size: 24px }' })` after each load.

**Out of scope**

- Any px in `components/library/`, `components/ui/`, `components/shell/` or a library page: T1 and T2.
- A new token or utility in `index.css`: T1 owns the file; a size this task needs and finds missing blocks the task.
- Any change to what the summary or the run page shows, PDR 024's counts and badges included: a later cycle.
- The filters' and pickers' dimmed panels, and New practice's order of sections: later cycles.

**Done when**

- `cd frontend && npx vitest run src/test/pxLiterals.test.ts` passes, and the same test, run with `h-[46px]` put back on one line of `frontend/src/components/ui/Tabs.tsx` and the line restored afterwards, fails naming `components/ui/Tabs.tsx` and the line.
- `cd frontend && npx vitest run` passes over the whole frontend, `src/test/stickyOffset.test.ts` and `src/test/theme.test.ts` among them.
- A script in headless Chromium, as Details describe, opens the Practice page and the run page of an active practice and prints the `getBoundingClientRect().height` of the Practice page's first status tab, its first filter input, the run page's "Show answer" button and its Prompt heading, at a 16px root and at a 24px root; at 16px it prints `38 42 54 42` and at 24px `57 63 81 63`, and the script's output is the evidence.
- The cycle's judgement: screenshots at 390 wide of Your library, a deck's page on the Cards tab, Edit configuration, the Practice page and the run page with the answers shown, each at 16px and at 24px, saved in the session scratchpad and named in the Debrief; at 16px each matches the screenshot T1 or T2 took of the same screen before this cycle's changes where one exists, and at 24px no label leaves its block and every `tappable` element still computes to `border: 1.5px solid rgb(23, 33, 43)`.

**Debrief**

None.
