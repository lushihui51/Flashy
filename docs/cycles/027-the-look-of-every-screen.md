# 027 — The look of every screen

Canvas: https://claude.ai/artifact/8oKx5LATxAEWz6C2jZWGjW

## Goal

Outcome: Every screen is drawn in the canvas's look, set in Lexend on the palette's colours with each colour meaning one thing, everything that can be tapped drawn as a white block with a thin ink outline and a short ink shadow, and a top bar and menu with nothing that leads nowhere.

Scope: The cycle covers the theme's eight colour tokens and the guard that holds them, Lexend bundled from the app's own origin, every component's colours and shapes, the three sets of tabs drawn as blocks with the chosen one pressed in, the top bar with the logo's yellow F and without the lightning bolt, the menu without Notifications, the Notifications page and its route removed, the run page's hidden answers drawn as the yellow-tint "Hidden" tile and its rating chips in the rating colours, a delete confirm drawn as drawing 26, and the vocabulary rows those changes touch. It leaves out the layout of every page, which the canvas decides nothing about; the mastery circle, the change badges and the marks; the run page's "Edit card" button; the filters' and pickers' dimmed panels; Home's content; and how the page moves or goes back.

Judgement: On the live server at phone width, the engineer opens each screen beside its drawing, 1 to 7 for the library, a subject, a deck, a configuration, Practice, the palette and the logo, 18 and 19 for the run page, 26 for a delete confirm, and checks that it is set in Lexend, that everything tappable reads as a block and nothing else does, that at most one thing besides the logo is yellow and red appears only where something went wrong or was a struggle, that the top bar and menu hold exactly the items T2 names, and that `/notifications` is gone. In the code, the guard test for the theme passes, and the browser's network panel shows no request to Google Fonts.

## Records

- PDR 015: Colors that each mean one thing
- PDR 020: A block for everything that can be tapped
- ADR 090: Eight colour tokens named by meaning as the only colours

## Tasks

### T1 — Lexend and the eight colours

**Status**

- [ ]

**Goal**

Every screen is set in Lexend served from the app's origin, `@theme` holds exactly ADR 090's eight colour tokens, every component uses only them, and a guard test holds both.

**Dependencies**

None.

**Files**

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/main.tsx`
- `frontend/src/index.css`
- `frontend/src/test/theme.test.ts` (new)
- `frontend/src/pages/PracticeRunPage.test.tsx`
- `frontend/src/components/library/CardFieldsForm.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/CardTable.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/components/library/DeckConfigurationRow.tsx`
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/FieldAssignmentBoard.tsx`
- `frontend/src/components/library/SubjectForm.tsx`
- `frontend/src/components/library/SubjectIconPicker.tsx`
- `frontend/src/components/practice/ConfigurationPickList.tsx`
- `frontend/src/components/practice/FieldValue.tsx`
- `frontend/src/components/practice/PracticeRunRow.tsx`
- `frontend/src/components/practice/PracticeStatusBadge.tsx`
- `frontend/src/components/practice/RatingChip.tsx`
- `frontend/src/components/practice/ratingTiers.ts`
- `frontend/src/components/practice/RunBreakdown.tsx`
- `frontend/src/components/practice/RunProgressBar.tsx`
- `frontend/src/components/practice/SelectedConfigurationList.tsx`
- `frontend/src/components/practice/SessionDeckChips.tsx`
- `frontend/src/components/shell/AccountSheet.tsx`
- `frontend/src/components/shell/AppShell.tsx`
- `frontend/src/components/shell/AuthSlot.tsx`
- `frontend/src/components/shell/ConnectionBanner.tsx`
- `frontend/src/components/shell/CreateSheet.tsx`
- `frontend/src/components/shell/Logo.tsx`
- `frontend/src/components/shell/SearchBar.tsx`
- `frontend/src/components/shell/SideDrawer.tsx`
- `frontend/src/components/shell/TopBar.tsx`
- `frontend/src/components/ui/AddButton.tsx`
- `frontend/src/components/ui/BottomSheet.tsx`
- `frontend/src/components/ui/Breadcrumb.tsx`
- `frontend/src/components/ui/ConfirmDialog.tsx`
- `frontend/src/components/ui/FullScreenDialog.tsx`
- `frontend/src/components/ui/ListRow.tsx`
- `frontend/src/components/ui/PickerCombobox.tsx`
- `frontend/src/pages/DeckDetailPage.tsx`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/LibraryPage.tsx`
- `frontend/src/pages/NotificationsPage.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/PracticeOverviewPage.tsx`
- `frontend/src/pages/PracticeRunPage.tsx`
- `frontend/src/pages/SubjectDetailPage.tsx`

**Details**

The font:

- `@fontsource-variable/lexend` must be a runtime dependency, and `frontend/src/main.tsx` must import it once, before `src/index.css`. No file may load a font from Google Fonts or any other origin.
- `@theme` in `src/index.css` must set `--font-sans: "Lexend Variable", system-ui, sans-serif;`. The face must load with `font-display: swap`; the package's stylesheet declares it, and the builder must confirm that in `node_modules/@fontsource-variable/lexend/index.css` rather than add a second declaration.

The tokens, ADR 090, with the values the canvas's palette sheet holds, drawing 6, which holds for every exact colour:

- `@theme` must declare exactly these eight `--color-*` tokens and no other:

```css
--color-main-action: #ffe234;
--color-hidden: #fff3a6;
--color-ink: #17212b;
--color-aside: #5c6672;
--color-line: #d5dae2;
--color-wrong: #e5484d;
--color-ground: #f3f4f8;
--color-surface: #ffffff;
```

- A translucent colour must be one of the eight at an opacity, written with Tailwind's opacity modifier on the token, as `bg-(--color-ink)/50`; never a `rgb()` or a hex.
- No component may use any colour but the eight: no other `--color-` name, no hex, no `rgb()`, `hsl()`, `white` or `black`, and no Tailwind palette utility such as `bg-gray-100`. `transparent`, `currentColor` and `inherit` are not colours and stay allowed.

The guard, ADR 090:

- `frontend/src/test/theme.test.ts` must hold two tests. The first reads `src/index.css` and asserts that the `--color-*` names declared inside `@theme` are exactly the eight above. The second walks every `.ts`, `.tsx` and `.css` file under `src/`, leaving out `*.test.*`, `src/test/`, `src/api/types.ts` and `src/api/openapi.json`, and asserts that none contains a `--color-` name outside the eight, a `#` followed by 3, 4, 6 or 8 hex digits, `rgb(`, `rgba(`, `hsl(`, `hsla(`, or a Tailwind palette utility. Guidance: match the palette utility with one regular expression over the prefixes `bg|text|border|fill|stroke|ring|divide|outline|decoration|shadow|from|to` and Tailwind's named palettes with a numeric shade, plus the bare `white` and `black`.

The sweep. Every old token leaves, mapped by PDR 015's meanings, as a constraint:

- `text` becomes ink. `text-secondary` and `text-muted` become aside. Guidance: the canvas draws descriptions and counts in a grey between the two, `#3a4553`, which is on no palette sheet; a description is content and reads in ink, a count or a label stands aside.
- `surface` stays surface. `surface-elevated` used as a background becomes ground; used as a border or a divider it becomes line.
- `primary` becomes main-action, with its words in ink, only where it is the screen's one main action: Practice on a subject's page and on a deck's page, drawings 2 and 3; Save on Edit configuration and Create on New configuration, drawing 4; Show answer and Next card on the run page, drawings 18 and 19; Done under "Practice complete"; Start practice on an active practice's page; Create on New practice; Create and Save on the subject, deck and card forms; and Log in when signed out. Every other `primary` and `primary-contrast` becomes ink and surface: the Active badge, which drawing 5 fills in ink with a white word; the chosen tab, the chosen sort pill and the menu's current item; the search bar's focus ring; the picker's action row; the icon picker's chosen icon; the logo's square until T2 redraws it; and every Add button, which drawings 1, 2, 3 and 5 draw white with an ink outline. No screen may end this task with more than one yellow thing besides the logo.
- `danger` becomes wrong and `danger-contrast` becomes surface, for every sentence that says something went wrong. A destructive confirm's button in `ConfirmDialog.tsx` becomes ink with surface words, as drawing 26 shows; red means nothing but what went wrong or was a struggle, PDR 015. The Edit deck page's own "Delete deck" becomes ink words on surface, as drawing 26 draws it behind the confirm.
- `success` becomes ink: passed, Good, Easy.
- `warning` in `ConnectionBanner.tsx` becomes wrong with surface words, which PDR 015 names for the connection banner; `warning` on the run page's "Retry" badge becomes aside with surface words, retrying being what stands aside; `warning` on the progress bar's retrying segment becomes aside. `pending` becomes line, what has not happened.
- `scrim` becomes ink at an opacity, 50 as today.
- The rating chips: in `ratingTiers.ts`, Again is wrong filled with surface words; Hard is surface filled with a wrong outline and ink words; Good is surface filled with an ink outline and ink words; Easy is ink filled with surface words. The outline is the only shape this task adds, since the colour cannot show without it.
- `PracticeRunPage.test.tsx` must assert the progress bar's segments by the new tokens.

The token names must enter `docs/vocabulary.md` in no row: a token is not a word a user reads.

Shapes stay as they are. The task changes colours and the font and nothing else.

**Out of scope**

- Blocks, outlines, shadows, corners and type sizes: T3 to T7.
- The logo's shape and the browser tab's icon: T2.
- Removing Notifications: T2.
- The summary's rows and pills beyond their colours: a later cycle.

**Done when**

- `cd frontend && npx vitest run src/test/theme.test.ts` passes both tests, named in the output.
- `grep -rn "fonts.googleapis\|fonts.gstatic" frontend/src frontend/index.html` prints nothing.
- `grep -c "^  --color-" frontend/src/index.css` prints `8`.
- `grep -rln "color-primary\|color-text\|color-danger\|color-success\|color-warning\|color-pending\|color-rating\|color-scrim\|color-surface-elevated" frontend/src` prints nothing.
- In headless Chromium against `localhost:5173`, `document.fonts.check('16px "Lexend Variable"')` returns `true` after `document.fonts.ready`, and the page's requests include one `.woff2` from `localhost` and none from any other origin; the script's output is the evidence.
- On the run page in headless Chromium, the progress bar's four segments compute to `rgb(23, 33, 43)`, `rgb(229, 72, 77)`, `rgb(92, 102, 114)` and `rgb(213, 218, 226)` in that order.
- On a subject's page in headless Chromium, exactly one element computes to the background `rgb(255, 226, 52)`, and it is the Practice button.

**Debrief**

None.

### T2 — The top bar, the menu and the logo

**Status**

- [ ]

**Goal**

The top bar holds the menu, the Flashy logo, Search, New and Account, the menu holds Home, Your library and Practice, the yellow F is the browser tab's icon, and Notifications is gone from the app and the vocabulary.

**Dependencies**

- T1: the eight tokens.

**Files**

- `frontend/src/components/shell/TopBar.tsx`
- `frontend/src/components/shell/TopBar.test.tsx`
- `frontend/src/components/shell/Logo.tsx`
- `frontend/src/components/shell/Logo.test.tsx`
- `frontend/src/components/shell/navItems.ts`
- `frontend/src/components/shell/SideDrawer.tsx`
- `frontend/src/components/shell/SideDrawer.test.tsx`
- `frontend/src/components/shell/SearchBar.tsx`
- `frontend/src/components/shell/SearchBar.test.tsx`
- `frontend/src/components/shell/AppShell.tsx`
- `frontend/src/components/shell/AppShell.test.tsx`
- `frontend/src/components/shell/AccountSheet.tsx`
- `frontend/src/components/shell/AccountSheet.test.tsx`
- `frontend/src/components/shell/CreateSheet.tsx`
- `frontend/src/components/shell/CreateSheet.test.tsx`
- `frontend/src/components/shell/AuthSlot.tsx`
- `frontend/src/components/shell/AuthSlot.test.tsx`
- `frontend/src/components/shell/ConnectionBanner.tsx`
- `frontend/src/App.tsx`
- `frontend/src/pages/NotificationsPage.tsx` (deleted)
- `frontend/src/pages/placeholderPages.test.tsx`
- `frontend/public/favicon.svg`
- `docs/vocabulary.md`

**Details**

The top bar, drawing 1:

- The bar must hold, left to right: the menu button, spoken "Open menu" and "Close menu" as today; the logo; then, right-aligned, New and Account. The lightning-bolt link to Practice must go, with its test in `TopBar.test.tsx` and the `PRACTICE_NAV` import; `PRACTICE_NAV` stays in `navItems.ts` for the menu.
- The menu button and New must be bare icons in a 44px square with no outline, as drawing 1 draws them. Account, in `AuthSlot.tsx`, must be a 38px circle with a 1.5px ink outline on surface: the user's image inside it, else their initials in ink. "Log in", when signed out, stays the yellow block T1 made it.
- The search bar must be a 46px pill on surface with a 1.5px line outline, the search icon and placeholder in aside, under the top bar as today. Enter stays inert.
- `AppShell.tsx` must paint the page and the sticky header in ground, with no border under the top bar.

The logo, drawing 7:

- `Logo.tsx` must render the word Flashy: an inline SVG F followed by the text "lashy", the link spoken "Flashy home" as today. The F is this path on `viewBox="-2 -2 53 74"`, filled in main-action and stroked in ink:

```tsx
<svg
  viewBox="-2 -2 53 74"
  aria-hidden="true"
  style={{
    height: "0.74em",
    width: "0.53em",
    margin: "0 0.028em 0 0.06em",
    verticalAlign: "-0.02em",
    overflow: "visible",
  }}
>
  <path
    d="M0,0 H49 V15 H18 V29 H42 V44 H18 V70 H0 Z"
    fill="var(--color-main-action)"
    stroke="var(--color-ink)"
    strokeWidth="1.2"
    strokeLinejoin="round"
    vectorEffect="non-scaling-stroke"
  />
</svg>
```

- The word must be 21px, weight 700, letter-spacing −0.01em, in ink, on one line. The `viewBox` and the path are the canvas's and must not change.
- `frontend/public/favicon.svg` must be the F alone, the same path on the same `viewBox`, filled `#ffe234` and stroked `#17212b` at width 2, and `index.html` keeps linking it. This SVG is outside `src/`, so the guard does not read it.

The menu, PDR 020:

- `NAV_ITEMS` must hold exactly Home, Your library and Practice, in that order, with their icons as today.
- Each item in `SideDrawer.tsx` must be drawn as PDR 020's block: surface, rounded corners, a 1.5px ink outline and a short solid ink shadow. Guidance: draw the current item as T3 draws a chosen tab, filled in ink with surface words and pressed in, since no drawing shows the open menu.
- The drawer's own panel is a Radix Dialog, ADR 016, and stays one; its scrim is ink at an opacity, from T1.

The sheets, PDR 020:

- Each row of `CreateSheet.tsx` and the "Log out" button of `AccountSheet.tsx` must be a block. The account sheet's placeholder avatar, when the user has no image, must be a ground circle with a 1.5px ink outline.
- `BottomSheet.tsx` itself is T3's; this task changes nothing in it.

Notifications:

- `NotificationsPage.tsx` must be deleted, its route removed from `App.tsx`, and its cases removed from `placeholderPages.test.tsx` and `SideDrawer.test.tsx`. No file under `frontend/src/` may mention Notifications afterwards.
- `docs/vocabulary.md` must change in three rows: "The main places" reads "Home"; "Your library"; "Practice" with the code `NAV_ITEMS`; `/`; `/library`; `/practice`; the row "Notices for the user" is removed; and "A place not built yet" has Where `Home` and Code `HomePage`. No other row changes.

`ConnectionBanner.tsx` keeps T1's colours and its shape; it is listed so the builder may align its padding with the bar, and need not.

**Out of scope**

- The look of `BottomSheet.tsx`, `ConfirmDialog.tsx` and the other shared components: T3.
- Home's content and "Coming soon.": a later cycle.
- What Search finds: never in this cycle.
- The run page's and the summary's shapes: T7 and a later cycle.

**Done when**

- `ls frontend/src/pages/NotificationsPage.tsx` prints "No such file or directory", and `grep -rin "notifications" frontend/src` prints nothing.
- `grep -n "Notifications\|Coming soon" docs/vocabulary.md` prints exactly one line, the "A place not built yet" row, with Where `Home` and Code `HomePage`.
- `cd frontend && npx vitest run src/components/shell src/pages/placeholderPages.test.tsx` passes, with a test in `SideDrawer.test.tsx` asserting the menu's links are exactly Home, Your library and Practice, and a test in `TopBar.test.tsx` asserting the bar has no link named Practice.
- `curl -s localhost:5173/favicon.svg | grep -c "M0,0 H49 V15 H18 V29 H42 V44 H18 V70 H0 Z"` prints `1`.
- In headless Chromium against `localhost:5173/library`, signed out of Clerk, the header's buttons and links have the accessible names "Open menu", "Flashy home", "New" and "Log in", in that order, and the search input is labelled "Search"; the script's output is the evidence.
- In headless Chromium, `localhost:5173/notifications` renders no heading.
- A screenshot of the top bar, the search bar and the open menu at 390px width, saved in the session scratchpad and named in the Debrief, for the engineer to set beside drawings 1 and 7.

**Debrief**

None.

### T3 — The shared blocks

**Status**

- [ ]

**Goal**

The components every page builds rows, buttons, tabs, dialogs and pickers from are drawn as PDR 020's block, the chosen tab pressed in.

**Dependencies**

- T1: the eight tokens and Lexend.

**Files**

- `frontend/src/index.css`
- `frontend/src/components/ui/ListRow.tsx`
- `frontend/src/components/ui/ListRow.test.tsx`
- `frontend/src/components/ui/AddButton.tsx`
- `frontend/src/components/ui/Breadcrumb.tsx`
- `frontend/src/components/ui/Breadcrumb.test.tsx`
- `frontend/src/components/ui/ConfirmDialog.tsx`
- `frontend/src/components/ui/BottomSheet.tsx`
- `frontend/src/components/ui/FullScreenDialog.tsx`
- `frontend/src/components/ui/PickerCombobox.tsx`
- `frontend/src/components/ui/PickerCombobox.test.tsx`
- `frontend/src/components/ui/Tabs.tsx` (new)
- `frontend/src/components/ui/Tabs.test.tsx` (new)
- `frontend/src/components/library/DeckRow.tsx`
- `frontend/src/components/library/DeckRow.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`, for the removal of `destructive` only
- `frontend/src/components/library/CardStandaloneForm.tsx`, for the removal of `destructive` only
- `frontend/src/components/library/DeckEditor.tsx`, for the removal of `destructive` only
- `frontend/src/components/library/SubjectForm.tsx`, for the removal of `destructive` only
- `frontend/src/pages/PracticeOverviewPage.tsx`, for the removal of `destructive` only
- `frontend/src/pages/DeckDetailPage.tsx`, for the removal of `destructive` only
- `frontend/src/pages/PracticeDetailsPage.tsx`, for the removal of `destructive` only

**Details**

The block, PDR 020, drawings 1 and 2:

- `src/index.css` must define the block once, as three Tailwind v4 utilities, and every component in this cycle must draw a block through them, never by repeating the border and shadow:

```css
@utility tappable {
  border: 1.5px solid var(--color-ink);
  box-shadow: 0 3px 0 var(--color-ink);
}
@utility tappable-sm {
  border: 1.5px solid var(--color-ink);
  box-shadow: 0 2px 0 var(--color-ink);
}
@utility tappable-pressed {
  box-shadow: none;
  transform: translateY(2px);
}
```

- `tappable` is the block of a row, a card and a 48px or taller button, with 16px to 20px corners; `tappable-sm` is the block of a 36px to 40px pill, a tab or a chip, with full corners. A block's fill is `bg-(--color-surface)` set beside the utility, or `bg-(--color-main-action)` for the one yellow thing, so the utilities set no colour of their own. The chosen state is `tappable-sm tappable-pressed` with `bg-(--color-ink) text-(--color-surface)`.
- Anything a user can open or act on must be a block; a heading, a count, a label or a divider must not be.

`Tabs.tsx`, drawings 1, 3 and 5, new, with this interface:

```tsx
export type TabItem<T extends string> = { value: T; label: string };
type TabsProps<T extends string> = {
  ariaLabel: string;
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
};
export default function Tabs<T extends string>(props: TabsProps<T>): ReactNode;
```

- It must render `role="tablist"` with the label, one `role="tab"` button per item with `aria-selected`, 38px tall, 8px apart, each a `tappable-sm` pill in surface with ink words at 14px weight 600, and the chosen one pressed as above. `Tabs.test.tsx` must assert the roles, the chosen tab's `aria-selected`, and that tapping another calls `onChange` with its value. The three pages adopt it in T4 and T6.

`ListRow.tsx` and `DeckRow.tsx`, drawings 1 and 2:

- Each row must be a `tappable` block in surface with 20px corners and 16px padding, its title 19px weight 600 in ink, its subtitle 13px in aside, its meta 13px in aside, the chevron 20px in ink; `ListRow`'s props stay as they are. Guidance: the drawings stack the meta under the subtitle; the arrangement is the builder's, since the canvas decides no layout.
- Rows of a list are set apart by a gap, not a divider, since each is a block; the lists that place them are T4's and T6's.
- `DeckRow` keeps its content as the vocabulary's "A deck's row" has it: its name over its counts, and never a field's name; drawing 2's field chips are content the canvas does not decide, and `DeckRow.test.tsx`'s test on that stands.
- `ListRow.test.tsx` must keep asserting that a row with and without a subtitle shares one min-height; the class it matches is whatever the builder sets.

`AddButton.tsx`, drawings 1, 2, 3 and 5: a 40px `tappable-sm` pill in surface, ink words at 15px weight 600, the plus 14px, never yellow.

`Breadcrumb.tsx`: 15px weight 500 in aside, its links in aside with no underline, the "‹" 16px and the "›" separator in aside. It stays decorative here; a later cycle makes it go back.

`ConfirmDialog.tsx`, drawing 26: a `tappable` block in surface with 20px corners and 20px padding, inset 20px from the screen's sides; the title 19px weight 700 in ink; the description 15px weight 300 in ink; two 48px `tappable` buttons with 16px corners side by side, Cancel in surface with ink words and the confirm filled in ink with surface words, whatever the confirm does. The `destructive` prop must leave the type and every caller, since no confirm reads differently from another; the seven caller files change in that one word and nothing else.

`BottomSheet.tsx`: the panel in surface with 20px top corners and a 1.5px ink outline along its top edge, the handle in line. `FullScreenDialog.tsx`: its content in ground, since it stands in for a page. Both stay Radix Dialogs, ADR 016, and their scrims stay ink at an opacity.

`PickerCombobox.tsx`, drawings 4 and 5: the input 46px in surface with 14px corners, a 1.5px line outline, 16px ink text and aside placeholder; the open list a `tappable` block in surface with 14px corners, its options 44px rows parted by line, the action row's words in ink weight 600; the locked chip a ground pill with a 1px line outline, since it cannot be tapped. The list's mechanism, an absolutely placed box closed on blur, must not change; a later cycle replaces it. Guidance: draw a filter's closed input with a chevron-down at its right, as drawing 5 shows "All subjects".

**Out of scope**

- Adopting `Tabs` on the three pages: T4 and T6.
- The picker's list as a popover over a dimmed page: a later cycle.
- The "‹" going back: a later cycle.
- Any page's own heading, toolbar or spacing: T4 to T7.

**Done when**

- `grep -c "^@utility tappable" frontend/src/index.css` prints `3`.
- `grep -rn "destructive" frontend/src --include=*.tsx | grep -v "^.*//\|^.*\*"` prints nothing.
- `cd frontend && npx vitest run src/components/ui src/components/library/DeckRow.test.tsx` passes, `Tabs.test.tsx` among them.
- In headless Chromium against `localhost:5173/library`, every element with `role="link"` inside the list computes to `border: 1.5px solid rgb(23, 33, 43)` and `box-shadow: rgb(23, 33, 43) 0px 3px 0px 0px`, and the "Add subject" button to the same border and `0px 2px`.
- A screenshot of Your library and of an open delete confirm at 390px width, saved in the session scratchpad and named in the Debrief, for the engineer to set beside drawings 1 and 26.

**Debrief**

None.

### T4 — Your library, a subject's page and a deck's page

**Status**

- [ ]

**Goal**

The three list pages match drawings 1 to 3 in their look, each card on a deck's page a block of its own.

**Dependencies**

- T1: the eight tokens and Lexend.
- T3: `tappable`, `tappable-sm` and `tappable-pressed` in `src/index.css`; `Tabs`, `ListRow`, `DeckRow`, `AddButton`, `Breadcrumb`.

**Files**

- `frontend/src/pages/LibraryPage.tsx`
- `frontend/src/pages/LibraryPage.test.tsx`
- `frontend/src/pages/SubjectDetailPage.tsx`
- `frontend/src/pages/SubjectDetailPage.test.tsx`
- `frontend/src/pages/DeckDetailPage.tsx`
- `frontend/src/pages/DeckDetailPage.test.tsx`
- `frontend/src/components/library/CardTable.tsx` (deleted)
- `frontend/src/components/library/CardTable.test.tsx` (deleted)
- `frontend/src/components/library/CardList.tsx` (new)
- `frontend/src/components/library/CardList.test.tsx` (new)
- `frontend/src/components/library/DeckConfigurationRow.tsx`
- `frontend/src/components/library/SubjectIcon.tsx`
- `frontend/src/components/library/SubjectIcon.test.tsx`
- `docs/vocabulary.md`

**Details**

Every page:

- The page's heading must be 30px, weight 700, letter-spacing −0.02em, in ink. A toolbar count, such as "3 subjects" or "21 cards · 4 fields", must be 15px weight 500 in aside. An empty state's sentence must be 15px in aside. The page's own padding stays 16px at the sides.
- Each tab list must be T3's `Tabs`, with the same `aria-label` and values the page uses today, so every test on `?tab=` stands.
- A list's rows must be `ListRow` or `DeckRow` blocks set 12px apart with no divider between them, and the rows' order and content stay as they are.

Your library, drawing 1:

- A subject row's leading icon must sit in a 46px square with 14px corners and a 1.5px ink outline and no shadow, since it sits inside the block; `SubjectIcon` itself stays as it is and is listed only so its size may change.

A subject's page, drawing 2:

- The subject's icon beside its name must be a 52px square in surface with 16px corners, drawn with `tappable`'s outline and shadow as the drawing has it, though it opens nothing; the description 15px weight 300 in ink.
- Practice must be a 52px `tappable` block in main-action with ink words at 17px weight 600, the one yellow thing on the page; Edit subject a 52px `tappable` square in surface with the pencil in ink.

A deck's page, drawing 3:

- The heading row must hold the name, then Practice as a 48px `tappable` block in main-action, then Edit deck as a 48px `tappable` square in surface.
- `CardList.tsx` must replace `CardTable.tsx`, taking `CardTable`'s props unchanged under the new name: one `tappable` block per card in surface with 20px corners, the whole block one link to the card's form, the list element labelled "Cards in <deck>" as the table's region was. Inside the block, the deck's first field reads as its label at 13px in aside over its value at 26px weight 700, with a 1.5px ink rule beneath; every other field reads as its label at 13px in aside over its value at 15px weight 500; a blank value reads "empty" in italic aside as today. Guidance: the drawing lays the other fields in a two-column grid with a long value spanning both; the arrangement is the builder's. No `<table>` remains, and the scroll region and its fade go with it.
- `CardList.test.tsx` must keep what `CardTable.test.tsx` holds that still applies: one entry per field in position order, "empty" for a blank value, rows keyed by card id, a tap opening `cardHref`, and no crash for one field or many; the header-cell, scroll-region and frozen-column tests go. `DeckDetailPage.test.tsx`'s tests on the table, its header and its scrolling change the same way.
- The Configurations tab must be drawn as drawing 5 draws the practice list: one `tappable` block holding the rows, each row a link with its name at 15px weight 600 in ink over its shape at 13px in aside, parted from the next by a 1px line rule, with a bare trash button in aside at its right. `DeckConfigurationRow.tsx` stays the row; the block around the rows is the page's.
- The empty states "No cards in this deck yet." and "No configurations yet." stay where they are.

The vocabulary: in `docs/vocabulary.md`, the rows "A deck's cards" and "A blank value" must read `CardList` in their Code column where they read `CardTable`; no other row changes.

**Out of scope**

- The mastery circle on any row or heading: a later cycle.
- A deck's cards on a wide screen, Q1: never in this cycle.
- The forms these pages open: T5.
- The "‹" going back and the tab change's reveal: a later cycle.

**Done when**

- `ls frontend/src/components/library/CardTable.tsx` prints "No such file or directory", and `grep -rn "CardTable" frontend/src docs/vocabulary.md` prints nothing.
- `grep -c "CardList" docs/vocabulary.md` prints `2`.
- `grep -n 'role="tablist"' frontend/src/pages/LibraryPage.tsx frontend/src/pages/DeckDetailPage.tsx` prints nothing.
- `cd frontend && npx vitest run src/pages/LibraryPage.test.tsx src/pages/SubjectDetailPage.test.tsx src/pages/DeckDetailPage.test.tsx src/components/library` passes.
- In headless Chromium against `localhost:5173/decks/<id>` for a seeded deck with cards: `document.querySelector('table')` is `null`; every link inside the element labelled "Cards in <deck>" computes to `border: 1.5px solid rgb(23, 33, 43)` and `box-shadow: rgb(23, 33, 43) 0px 3px 0px 0px`; and exactly one element on the page computes to the background `rgb(255, 226, 52)`, the Practice button.
- In headless Chromium against `localhost:5173/library`, the tab with `aria-selected="true"` computes to the background `rgb(23, 33, 43)` and `box-shadow: none`, and the other tab to `rgb(255, 255, 255)` and `0px 2px`.
- Screenshots of Your library on each tab, a subject's page and a deck's page on each tab at 390px width, saved in the session scratchpad and named in the Debrief, for the engineer to set beside drawings 1, 2 and 3.

**Debrief**

None.

### T5 — The forms

**Status**

- [ ]

**Goal**

The subject, deck, card and configuration forms match drawing 4 in their look.

**Dependencies**

- T1: the eight tokens and Lexend.
- T3: `tappable`, `tappable-sm` and `tappable-pressed`; `PickerCombobox`, `ConfirmDialog`, `FullScreenDialog`, `BottomSheet`.

**Files**

- `frontend/src/components/library/SubjectForm.tsx`
- `frontend/src/components/library/SubjectForm.test.tsx`
- `frontend/src/components/library/SubjectIconPicker.tsx`
- `frontend/src/components/library/SubjectIconPicker.test.tsx`
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/components/library/FieldAssignmentBoard.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/CardFieldsForm.tsx`
- `frontend/src/components/library/CardFieldsForm.test.tsx`

**Details**

Every form, drawing 4, PDR 020:

- The form's header row must hold Cancel at the left as plain words, 15px weight 500 in aside; the form's name in the middle, 19px weight 700 in ink; and Create or Save at the right as a 40px `tappable-sm` block in main-action with 14px corners and ink words at 15px weight 600, the one yellow thing on the form. The row stays sticky where it is sticky today, painted in ground, not surface.
- A button that cannot be pressed yet must read as drawing 18 draws "Edit card" before the answers are shown: a 1.5px line outline, aside words and no shadow, in place of today's reduced opacity. This holds for a disabled Create or Save and for the deck form's disabled Remove.
- A text input must be 46px in surface with 14px corners, a 1.5px line outline, 16px ink text and aside placeholder, its label 13px in aside above it; a read-only input the same in ground with aside text. A sentence that says something went wrong must be 14px in wrong, beside its control as today.
- A fixed value shown in place of a control, such as a locked deck, must read as drawing 4's "Deck Ports": the label 13px in aside, then the value 15px weight 600 in ink, with no box.
- Every button that acts on the form's thing, such as Delete subject, Delete deck, Delete card, Done, Undo and Add field, must be a `tappable` or `tappable-sm` block in surface with ink words, never yellow and never red, as drawing 26 draws "Delete deck".
- The word rows the vocabulary gives each form stay as they are; this task changes no word.

The configuration form, `DeckConfigurationEditor.tsx` and `FieldAssignmentBoard.tsx`, drawing 4:

- "Prompt side" and "Answer side" must each be a `tappable` block in surface with 20px corners, headed by a 40px row with the side's name at 14px weight 600 in ink over a 1.5px ink rule. Inside, "Always shown" and "Random draw" are areas labelled 13px in aside, parted by a 1px line rule; a field chip is a 38px `tappable-sm` block in surface with 12px corners and ink words at 14px weight 600; "None yet." reads 14px in aside.
- "Each card shows … of these" must keep its checkbox semantics, several counts choosable, with each count drawn as a 32px by 30px `tappable-sm` pill in surface and a chosen count pressed, as T3 defines the chosen state and drawing 4 shows. Guidance: keep the `<input type="checkbox">` visually hidden inside each label so the group stays a checkbox group to assistive technology.
- "Not used" must be an area with a 1.5px dashed ink outline and 20px corners, no fill and no shadow, since the area is not tapped; its name 14px weight 600 and "Every field is assigned." 14px in aside.
- The move sheet's destination rows must be blocks, one per destination.

The subject form, `SubjectForm.tsx` and `SubjectIconPicker.tsx`:

- The icon control must be a 52px `tappable` square in surface showing the chosen picture, as drawing 2 draws a subject's icon. In the picker, each picture must be a 44px `tappable-sm` square and the chosen one pressed, in place of today's ring.

The deck form, `DeckEditor.tsx`:

- The fields section must be one `tappable` block holding the field rows, parted by 1px line rules, each row's name input and type as inputs above, "Primary" as a 13px aside label, and Move up, Move down and Remove as bare icon buttons in ink, since drawing 4 draws the trash and move controls without a block of their own.
- Its "New subject…" overlay is T3's `FullScreenDialog` and its confirms are T3's `ConfirmDialog`; the overlay's own form is `SubjectForm`'s body and follows this task's rules for it.

The card form, `CardStandaloneForm.tsx` and `CardFieldsForm.tsx`: one input per field as above, its label 13px in aside; "Unsupported field type" 14px in aside under a read-only input.

Tests: every test in the listed test files that asserts a class name for colour, opacity or shape must assert the new one; no test on behaviour changes.

**Out of scope**

- The picker's list as a popover over a dimmed page, drawing 25: a later cycle.
- Changing any form's layout, fields or words: never in this cycle.
- The deck page's own look: T4.

**Done when**

- `cd frontend && npx vitest run src/components/library` passes.
- `grep -rn "opacity-40\|opacity-50\|opacity-60" frontend/src/components/library` prints nothing.
- In headless Chromium against `localhost:5173/deck-configurations/new?deck=<id>` for a seeded deck, the section labelled "Prompt side" computes to `border: 1.5px solid rgb(23, 33, 43)` and `box-shadow: rgb(23, 33, 43) 0px 3px 0px 0px`, the section labelled "Not used" to a dashed border and `box-shadow: none`, and exactly one element on the page computes to the background `rgb(255, 226, 52)`, the Create button, or none while Create cannot be pressed.
- In headless Chromium against `localhost:5173/subjects/new`, with the name blank, the Create button computes to `border: 1.5px solid rgb(213, 218, 226)` and `box-shadow: none`.
- Screenshots of New subject, Edit deck, New card and Edit configuration at 390px width, saved in the session scratchpad and named in the Debrief, for the engineer to set beside drawing 4.

**Debrief**

None.

### T6 — Practice, New practice and a practice's page

**Status**

- [ ]

**Goal**

The three practice pages match drawing 5 in their look.

**Dependencies**

- T1: the eight tokens and Lexend.
- T3: `tappable`, `tappable-sm` and `tappable-pressed`; `Tabs`, `AddButton`, `Breadcrumb`, `ConfirmDialog`, `PickerCombobox`.

**Files**

- `frontend/src/pages/PracticeOverviewPage.tsx`
- `frontend/src/pages/PracticeOverviewPage.test.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `frontend/src/components/practice/PracticeRunRow.tsx`
- `frontend/src/components/practice/PracticeStatusBadge.tsx`
- `frontend/src/components/practice/SessionDeckChips.tsx`
- `frontend/src/components/practice/ConfigurationPickList.tsx`
- `frontend/src/components/practice/SelectedConfigurationList.tsx`
- `frontend/src/components/practice/PracticeFilterBar.tsx`

**Details**

The Practice page, `PracticeOverviewPage.tsx`, drawing 5:

- The heading must be 30px weight 700 in ink with "Add practice" as T3's `AddButton` at its right, white with the ink outline; nothing on this page is yellow, since its acts weigh alike, PDR 015.
- The filters must be T3's `PickerCombobox` inputs side by side, each 42px tall. The status tabs must be T3's `Tabs` with the `aria-label` and values the page uses today.
- The list must be one `tappable` block in surface with 20px corners holding every row, the rows parted by 1px line rules; it is the one list in this cycle drawn as a single block with rows, as the drawing has it. Each row in `PracticeRunRow.tsx` is a link holding the name at 15px weight 600 in ink beside its status badge, over its decks at 13px in aside, with a bare trash button in aside at its right, 44px tall.
- `PracticeStatusBadge.tsx`: "Active" must be filled in ink with surface words at 12px weight 600, 10px corners and 3px by 9px padding; "Completed" must be surface with a 1px line outline and aside words at 12px weight 500, 2px by 8px padding.
- `SessionDeckChips.tsx`: a chip cannot be tapped, so it must carry no block; each reads as plain 13px aside text, as drawing 5's second line, chips set 8px apart on one wrapping line and the "+N" chip the same.
- The empty state and "Clear filters" stay where they are; "Clear filters" must be a 40px `tappable-sm` pill in surface.

New practice, `PracticeCreatePage.tsx`, drawing 4 for its form grammar:

- The header row must follow T5's form header: Cancel as plain words 15px weight 500 in aside, "New practice" 19px weight 700, "N selected" 13px in aside beside Create, and Create a 40px `tappable-sm` block in main-action with ink words, the one yellow thing on the page, drawn as T5 draws a button that cannot be pressed while it cannot be. The row stays sticky, in ground.
- Name must be T5's input with its label 13px in aside above.
- Selected must be one `tappable` block holding its rows parted by 1px line rules, each row in `SelectedConfigurationList.tsx` the name at 15px weight 600 over "Subject · Deck" at 13px in aside, with a bare X button in aside at its right; with nothing chosen, the section's sentence stays as it is, 15px in aside, with no block.
- "New configuration…" stays T3's `AddButton`. The filters are the Practice page's.
- Each deck group in `ConfigurationPickList.tsx` must be one `tappable` block headed by its legend at 15px weight 600 in ink, its rows parted by 1px line rules, each row a label with its checkbox and name at 15px in ink and a bare pencil button in aside at its right. The checkbox must stay an `<input type="checkbox">`; guidance: draw it as a 24px square with 6px corners and a 1.5px ink outline, filled in ink with a surface check when ticked, with the native input visually hidden inside the label.
- A sentence that says something went wrong, above the list or against a row, must be 14px in wrong where it is today.
- The order down the page stays as it is; a later cycle moves the filters.

A practice's page, `PracticeDetailsPage.tsx`:

- The breadcrumb, then the name at 30px weight 700 in ink with its status badge beside it, its date at 15px in aside, and its decks as `SessionDeckChips` in the full variant.
- Re-run and Delete must each be a 48px `tappable` square in surface with its icon in ink, as drawing 3 draws Edit deck, set at the heading's right; a sentence that says something went wrong stays beside them, 14px in wrong.
- While the practice is active, Start practice must be a 52px `tappable` block in main-action with ink words at 17px weight 600, the one yellow thing on the page. Once completed, the summary renders as T1 left it and nothing else on the page is yellow.
- The two confirms are T3's `ConfirmDialog`.

Tests: every test in the listed test files that asserts a class name for colour, opacity or shape must assert the new one; no test on behaviour changes.

**Out of scope**

- The summary's rows, counts and order: a later cycle.
- The filters' placement above their list on New practice, and the pickers' dimmed panels: a later cycle.
- The filter change's reveal: a later cycle.

**Done when**

- `cd frontend && npx vitest run src/pages/PracticeOverviewPage.test.tsx src/pages/PracticeCreatePage.test.tsx src/pages/PracticeDetailsPage.test.tsx src/components/practice` passes.
- `grep -rn 'role="tablist"' frontend/src/pages` prints nothing.
- In headless Chromium against `localhost:5173/practice` with seeded practices, the element holding the rows computes to `border: 1.5px solid rgb(23, 33, 43)` and `box-shadow: rgb(23, 33, 43) 0px 3px 0px 0px`, every button named "Delete …" computes to `border-style: none`, the badge reading "Active" to the background `rgb(23, 33, 43)`, and no element to the background `rgb(255, 226, 52)`.
- In headless Chromium against `localhost:5173/practice/new` with one configuration ticked, exactly one element computes to the background `rgb(255, 226, 52)`, the Create button, and each `fieldset` computes to the block's border and shadow.
- In headless Chromium against the page of a seeded active practice, exactly one element computes to the background `rgb(255, 226, 52)`, the Start practice button.
- Screenshots of Practice, New practice with one configuration ticked, an active practice's page and a completed practice's page at 390px width, saved in the session scratchpad and named in the Debrief, for the engineer to set beside drawing 5.

**Debrief**

None.

### T7 — The run page

**Status**

- [ ]

**Goal**

The run page matches drawings 18 and 19 in its look, its hidden answers as the "Hidden" tile and its rating chips in the rating colours, and the cycle's judgement holds.

**Dependencies**

- T1: the eight tokens and Lexend; the rating chips' colours in `ratingTiers.ts`.
- T3: `tappable`, `tappable-sm` and `tappable-pressed`; `Breadcrumb`.

**Files**

- `frontend/src/pages/PracticeRunPage.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx`
- `frontend/src/components/practice/FieldValue.tsx`
- `frontend/src/components/practice/RatingChip.tsx`
- `frontend/src/components/practice/ratingTiers.ts`
- `frontend/src/components/practice/RunProgressBar.tsx`

**Details**

The progress bar, `RunProgressBar.tsx`, drawing 18:

- The bar must be 8px tall with no track behind it: its segments, in today's order and in T1's colours, each with 4px corners, set 3px apart. Its spoken label stays as it is.

The card, `PracticeRunPage.tsx`, drawings 18 and 19:

- "Prompt" and "Answer" must each be a block in surface with 20px corners, drawn with `tappable`'s outline and shadow as the drawings have it though neither is tapped, headed by a 42px row with the zone's name at 14px weight 600 in ink over a 1.5px ink rule. Inside, each field's rows are parted by 1px line rules, and the field's name reads 13px in aside above its value.
- A prompt's value must be 54px weight 700, letter-spacing −0.02em, line-height 1, when it is twelve characters or fewer, and 26px weight 700 otherwise, as drawing 3 draws a card's first value; an answer's shown value must be 20px weight 600, line-height 1.25.
- The "Retry" badge must be filled in aside with surface words at 12px weight 600, 10px corners, as T6's "Active" badge is shaped.
- The landscape arrangement stays as it is.

The hidden answer, `FieldValue.tsx`:

- Every hidden answer must show as one "Hidden" tile: the full width of its row, 34px tall, 10px corners, filled in hidden, with the word "Hidden" at 14px weight 600 in ink at its left, whatever the answer's length, its number of lines or its type; the answer's real size and content appear only once the answers are shown. Nothing of the value may be in the DOM while hidden, as today.

The rating chips, `RatingChip.tsx` and `ratingTiers.ts`, drawing 19:

- An unrated chip, "Rate", must be a 36px pill in surface with a 1.5px dashed ink outline, ink words at 14px weight 600 and no shadow.
- A rated chip must be a 36px `tappable-sm` pill in its rating's fill, outline and word colours from T1, its shadow in ink whatever the rating; an Easy chip's ink shadow merges with its ink fill.
- The chips' popover stays a Radix Popover, ADR 098, with its panel a `tappable` block in surface holding the four ratings as 36px `tappable-sm` pills in their colours; guidance: draw the arrow in surface with an ink stroke, or leave it out.

The actions:

- "Show answer" and "Next card" must each be a 54px `tappable` block in main-action with ink words at 17px weight 600 and 16px corners, the one yellow thing on the page, and "Next card" drawn as T5 draws a button that cannot be pressed while an answer is unrated. The row holds only this button; "Edit card" arrives in a later cycle.
- Under "Practice complete", the heading must be 19px weight 700 in ink and "Done" a 52px `tappable` block in main-action, the one yellow thing on that screen; the summary between them renders as T1 left it.
- A sentence that says something went wrong must be 14px in wrong where it is today.

`PracticeRunPage.test.tsx` must keep every test on behaviour and update the ones that assert a class.

**Out of scope**

- "Edit card", the card's URL state and the round trip to its form: a later cycle.
- The summary's rows, counts and order: a later cycle.
- The chips' popover over a dimmed page: never; ADR 098 keeps it undimmed.

**Done when**

- `cd frontend && npx vitest run src/pages/PracticeRunPage.test.tsx src/components/practice` passes.
- In headless Chromium on the run page of a seeded active practice, before "Show answer": every element reading "Hidden" computes to the background `rgb(255, 243, 166)`, a height of `34px` and the width of its row; the progress bar's segments compute to `border-radius: 4px` and the bar to `background-color: rgba(0, 0, 0, 0)`; and exactly one element computes to the background `rgb(255, 226, 52)`, the Show answer button.
- After "Show answer", every button named "Rate …" computes to `border-style: dashed` and `box-shadow: none`; after rating one answer Good, that button computes to `border: 1.5px solid rgb(23, 33, 43)` and `box-shadow: rgb(23, 33, 43) 0px 2px 0px 0px`.
- The cycle's judgement: a script in the session scratchpad, run against `localhost:5173` at 390px width, saves a screenshot of each of Your library on both tabs, a subject's page, a deck's page on both tabs, Edit configuration, Practice, New practice, a practice's page, the run page before and after "Show answer", Home, the open menu and an open delete confirm, and prints for each the count of elements whose background computes to `rgb(255, 226, 52)`; every count is 0 or 1, the script's output is in the Debrief, and the screenshots are named there for the engineer to set beside drawings 1 to 7, 18, 19 and 26.

**Debrief**

None.
