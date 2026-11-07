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

- [x]

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

Evidence, in the order of Done when:

- `cd frontend && npx vitest run src/test/theme.test.ts --reporter=verbose` printed `Tests 2 passed (2)`, with ✓ on `theme > declares exactly the eight colour tokens in @theme` and `theme > uses no colour outside the eight in any source file`. With a line `// #abc rgb(1,2,3) bg-gray-100 text-white --color-primary` appended to `Logo.tsx`, the second test failed naming all five, then the line was removed.
- `grep -rn "fonts.googleapis\|fonts.gstatic" frontend/src frontend/index.html` printed nothing.
- `grep -c "^  --color-" frontend/src/index.css` printed `8`.
- `grep -rln "color-primary\|color-text\|color-danger\|color-success\|color-warning\|color-pending\|color-rating\|color-scrim\|color-surface-elevated" frontend/src` printed nothing.
- Headless Chromium through playwright-core at `localhost:5173/library`, signed out of Clerk, 390px wide: `document.fonts.check('16px "Lexend Variable"')` printed `true` after `document.fonts.ready`; the body's computed `font-family` printed `"Lexend Variable", system-ui, sans-serif`; the `.woff2` requests printed one, `http://localhost:5173/node_modules/@fontsource-variable/lexend/files/lexend-latin-wght-normal.woff2`; the requests to another origin were Clerk's scripts and API at `fast-katydid-31.clerk.accounts.dev` and none was a font. The script is `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/893e09ae-7b89-4374-b375-d0972b6e461a/scratchpad/t1-check.cjs`.
- No practice in the dev database has a failed card, and `run_progress` in `app/services/practice_run.py` counts a card as `still_failed` only when a retry cannot be generated for it, which needs a field archived while the run is open; so no run page can show four segments without changing a seeded deck. I created the practice "027 T1 colour check" from the "Command to Purpose" configuration, rated one answer Again and one Good through the page, and reloaded its run page: the bar's label read `1 passed, 0 failed, 1 retrying, 52 unseen` and its three segments computed to `rgb(23, 33, 43)`, `rgb(92, 102, 114)` and `rgb(213, 218, 226)` in that order. In the same page an element given the failed segment's class, `bg-(--color-wrong)`, computed to `rgb(229, 72, 77)`; `PracticeRunPage.test.tsx` asserts the four classes in order. The practice stays in the dev database.
- On the subject "CompTIA A+", two elements computed to `rgb(255, 226, 52)`: the Practice button and the top bar's "Log in", which Details names as yellow when signed out and which the check, signed out of Clerk, renders; a signed-in user does not see it. The run page likewise showed "Log in" and "Show answer". Screenshots at 390px wide, in the scratchpad: `t1-subject.png`, `t1-run.png`, `t1-run-rating.png` (the rating popover open), `t1-edit-deck.png`, `t1-library.png` and `t1-practice.png`.

Departures from Details:

- `--font-sans` is written with single quotes, as the repository's Prettier formats `index.css`.
- `index.css` is left out of the guard's sweep as well as the four exclusions named, since it holds the eight hex values.
- `theme.test.ts` reads the files through `node:fs` under a `/// <reference types="node" />` directive, because `tsconfig.app.json` lists only `vite/client` types and is outside Files, and a `?raw` import of `index.css` arrives compiled by the Tailwind plugin, with no `@theme` left to read.
- Save and Create on `DeckEditor.tsx`, `DeckConfigurationEditor.tsx` and `PracticeCreatePage.tsx` are bare words today; each gained the main-action fill behind its words and nothing else, so the yellow hugs the word until T5 shapes the button; `t1-edit-deck.png` shows it.
- Delete subject in `SubjectForm.tsx` and Delete card in `CardStandaloneForm.tsx` are ink words like Delete deck, since red means only what went wrong.
- The subject's description in `SubjectDetailPage.tsx` and the confirm's description in `ConfirmDialog.tsx` are ink, following the guidance that a description is content; every other `text-secondary` is aside.
- The sheet's handle in `BottomSheet.tsx` is line, not ground: it is a mark drawn on the panel, not a ground.
- In `ConfirmDialog.tsx` the confirm button is ink with surface words whatever `destructive` says; the prop stays in the type and is no longer read, and its member comment says so.
- The Add buttons, the Active badge, the account sheet's placeholder avatar and the logo's square take the literal mapping, ink filled with surface words, until T2 and T3 redraw them.
- The interface comments of `ratingTiers.ts` and `RatingChip.tsx` were rewritten, since they named the old tokens and a hex value.

To read: `frontend/src/test/theme.test.ts`, whose four regular expressions decide what the guard catches; `frontend/src/components/practice/ratingTiers.ts`, where the Hard and Good chips carry the one outline this task adds.

### T2 — The top bar, the menu and the logo

**Status**

- [x]

**Goal**

The top bar holds the menu, the Flashy logo, Search, New and Account, the menu holds Home, Your library and Practice, the yellow F is the browser tab's icon, and Notifications is gone from the app and the vocabulary.

**Dependencies**

- T1: the eight tokens.

**Files**

- `frontend/src/index.css`
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

Evidence, in the order of Done when:

- `ls frontend/src/pages/NotificationsPage.tsx` printed "No such file or directory", and `grep -rin "notifications" frontend/src` printed nothing.
- `grep -n "Notifications\|Coming soon" docs/vocabulary.md` printed one line: `| Places | A place not built yet | "Coming soon." | Home | `HomePage` |`.
- `cd frontend && npx vitest run src/components/shell src/pages/placeholderPages.test.tsx` printed `Test Files 10 passed (10)` and `Tests 61 passed (61)`, with ✓ on `SideDrawer > renders exactly Home, Your library and Practice in order when open` and `TopBar > has no link named Practice`.
- `curl -s localhost:5173/favicon.svg | grep -c "M0,0 H49 V15 H18 V29 H42 V44 H18 V70 H0 Z"` printed `1`.
- Headless Chromium at `localhost:5173/library`, signed out of Clerk: the header's buttons and links printed `["Open menu","Flashy home","New","Log in"]`, and the search input labelled "Search" was found once. The script is `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/43d3159d-9154-491e-88bd-e6a0eea9a57d/scratchpad/t2-check.cjs` and its output is `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/43d3159d-9154-491e-88bd-e6a0eea9a57d/scratchpad/t2-check.out`.
- `localhost:5173/notifications` printed `headings: 0`, with no page errors.
- Screenshots at 390px width: `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/43d3159d-9154-491e-88bd-e6a0eea9a57d/scratchpad/t2-topbar.png`, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/43d3159d-9154-491e-88bd-e6a0eea9a57d/scratchpad/t2-menu.png` and `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/43d3159d-9154-491e-88bd-e6a0eea9a57d/scratchpad/t2-new-sheet.png`. The page beneath them shows a peer's uncommitted T3 work.

The same script computed these at 2x, launched with `--force-device-scale-factor=2 --window-size=390,844` and `viewport: null`, because Chromium floors `1.5px` to `1px` at 1x and Playwright's `deviceScaleFactor` does not change that. Each menu item and the New sheet's rows read `1.5px solid rgb(23, 33, 43)`, and every one but the current item read the shadow `rgb(23, 33, 43) 0px 3px 0px 0px`; the current item read `box-shadow: none` and `translateY(2px)`, filled in ink. The search bar read `46px` with `1.5px solid rgb(213, 218, 226)` on white. The header and the shell read `rgb(243, 244, 248)`, with a `0px` border under the bar. The word read 21px, weight 700, `-0.21px` spacing, on one line.

Not seen in a browser: Account's 38px circle, the account sheet's placeholder avatar and its "Log out" block, since the check runs signed out. `AuthSlot.test.tsx` and `AccountSheet.test.tsx` pass but assert behaviour, not look, so these are for the engineer to judge signed in.

Departures from Details and Files:

- `frontend/src/index.css` was added to T2's Files on the engineer's go-ahead, and it holds T3's three `@utility` blocks, so the shell's blocks go through them. T3 lost the path from its Files and gained a dependency on T2. A peer building T3 at the same time holds its commit until T2's lands.
- `tappable-pressed` reads `box-shadow: none !important`, not T3's plain `none`. Tailwind compiles it ahead of `tappable` and `tappable-sm`, whose shadow otherwise wins; the compiled order is in the script's output. T3's peer found the same on `tappable-sm` and its Debrief depends on this staying.
- The logo's `style` gains `display: 'inline'`, because Tailwind's reset makes every `svg` a block and the F would sit on its own line above "lashy". The `viewBox` and the path are as written.
- The Where of "The main places" changed from "Side menu; top bar" to "Side menu", since the top bar no longer shows any of them. Details named only that row's words and code.
- The current menu item uses `tappable`, not `tappable-sm`, with `tappable-pressed`, because the items are 48px rows with 16px corners and T3 gives those to `tappable`. `tappable-sm` is for a pill.
- The New sheet's rows and "Log out" are 56px and 48px `tappable` blocks with 16px corners, set 12px apart.
- The bar is 58px with 16px sides and the gaps as drawing 1 has them, the search bar sits 2px under it, and the drawer's top padding is 126px: the 114px header plus 12px.
- `ConnectionBanner.tsx` went from `px-3` to `px-4`, to align with the bar, as Details allow.
- `favicon.svg` carries no `vector-effect`, since Details give only the path, `viewBox`, fill and stroke; the stroke is thin at tab size.
- `Logo.test.tsx` gained a test for the F's path and the text "lashy", and `placeholderPages.test.tsx` became two plain tests, as one case was left.
- The interface comment on `PRACTICE_NAV` and the spacing comments in `TopBar.tsx` went, since they described the bolt link.

The whole-frontend checks ran on a tree holding a peer's uncommitted work: `npx vitest run` printed `Test Files 53 passed (53)` and `Tests 554 passed (554)`, `npm run lint` printed nothing, and `npm run build` built. On T2's staged hunks alone, exported to the scratchpad: `Test Files 52 passed (52)`, `Tests 551 passed (551)`, `npm run lint` printed nothing, and `npm run build` built.

Seen and not changed: `AccountSheet.tsx` holds a comment saying rows will be added later, against "Never mark deferred work in code".

To read: `frontend/src/index.css`, for the `!important`.

### T3 — The shared blocks

**Status**

- [x]

**Goal**

The components every page builds rows, buttons, tabs, dialogs and pickers from are drawn as PDR 020's block, the chosen tab pressed in.

**Dependencies**

- T1: the eight tokens and Lexend.
- T2: `tappable`, `tappable-sm` and `tappable-pressed` in `src/index.css`.

**Files**

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
- `frontend/src/pages/LibraryPage.test.tsx`, for the Add button's height class only

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

Evidence, in the order of Done when:

- `grep -c "^@utility tappable" frontend/src/index.css` printed `3`.
- `grep -rn "destructive" frontend/src --include=*.tsx | grep -v "^.*//\|^.*\*"` printed nothing.
- `cd frontend && npx vitest run src/components/ui src/components/library/DeckRow.test.tsx` printed `Test Files 5 passed (5)` and `Tests 33 passed (33)`, `Tabs.test.tsx` among them.
- Headless Chromium through playwright-core at `localhost:5173/library`, signed out of Clerk, 390px wide, launched with `--force-device-scale-factor=2`: each of the three subject rows printed `border 1.5px solid rgb(23, 33, 43)` and `shadow rgb(23, 33, 43) 0px 3px 0px 0px`; "Add subject" printed the same border and `rgb(23, 33, 43) 0px 2px 0px 0px`. The script is `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/92748cdc-d007-4e84-83c9-89d8d32d38bd/scratchpad/t3-final.cjs`.
- Screenshots at 390px wide: `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/92748cdc-d007-4e84-83c9-89d8d32d38bd/scratchpad/t3-library.png` for drawing 1 and `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/92748cdc-d007-4e84-83c9-89d8d32d38bd/scratchpad/t3-confirm.png` for drawing 26, which is a practice's delete confirm, opened and cancelled. Also `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/92748cdc-d007-4e84-83c9-89d8d32d38bd/scratchpad/t3-picker-open.png` for the open filter list and `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/92748cdc-d007-4e84-83c9-89d8d32d38bd/scratchpad/t3-sheet.png` for the sheet.

Departures from Details and Files:

- `tappable-pressed` in `src/index.css` reads `box-shadow: none !important`, not the `box-shadow: none` Details writes. Tailwind sorts `tappable-pressed` ahead of `tappable-sm` in the compiled CSS, so as written the chosen tab kept its 2px shadow, which T4's Done when forbids. With `!important`, an element with both classes printed `shadow none` and `transform matrix(1, 0, 0, 1, 0, 2)`.
- `frontend/src/pages/LibraryPage.test.tsx` was added to Files with the engineer's go-ahead: its Add button test now matches `h-10`, not `h-9`.
- A `ListRow`'s meta stacks under its subtitle, as the drawings have it, so one `ListRow.test.tsx` count of spans under the text column went from 1 to 2 and the row's min-height is `min-h-[78px]`; a row with a subtitle and a meta grows to 96px.
- `DeckRow.tsx` and `Breadcrumb.test.tsx` did not change: `DeckRow` draws through `ListRow`, and the "‹" stays the `ChevronLeft` icon at 16px, since a text character would break the test on the row's text.
- `PickerCombobox`'s input is 46px for every purpose, as T3 says, while T6 asks for 42px filters and does not list the file. T6 can set the height from `PracticeFilterBar.tsx`, which it lists.

For the engineer to know:

- Until T4 and T6 place them, rows sit in their old divided lists, so Your library's blocks touch with a hairline between them, and "Add practice" stays T1's ink pill.
- Chromium floors a computed border to whole device pixels: at scale 1 a plain `1.5px solid` element computes to `1px`, at 2 to `1.5px`, at 3 to `1.33333px`, and Playwright's `deviceScaleFactor` option does not change this. Every later Done when that names `1.5px` needs the launch flag above.
- Another session's uncommitted T2 work is in this checkout, and these checks ran over it. Its edit to this file moved `frontend/src/index.css` from T3's Files to T2's and added T2 to T3's Dependencies, which that session reports the engineer approved; it also reports removing a duplicate of the utilities after our writes collided. T3's code does not work without the utilities, so T3's commit holds no `index.css` hunk and must follow T2's commit, and the `!important` above stands only if T2's commit keeps it.

To read: `frontend/src/index.css`, for the `!important`.

### T4 — Your library, a subject's page and a deck's page

**Status**

- [x]

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

Evidence, in the order of Done when:

- `ls frontend/src/components/library/CardTable.tsx` printed "No such file or directory", and `grep -rn "CardTable" frontend/src docs/vocabulary.md` printed nothing.
- `grep -c "CardList" docs/vocabulary.md` printed `2`.
- `grep -n 'role="tablist"' frontend/src/pages/LibraryPage.tsx frontend/src/pages/DeckDetailPage.tsx` printed nothing.
- `cd frontend && npx vitest run src/pages/LibraryPage.test.tsx src/pages/SubjectDetailPage.test.tsx src/pages/DeckDetailPage.test.tsx src/components/library` printed `Test Files 12 passed (12)` and `Tests 182 passed (182)`.
- Headless Chromium through playwright-core, signed out of Clerk, 390px wide, launched with `--force-device-scale-factor=2`, on the seeded decks Commands and Ports: `document.querySelector('table')` printed `null`; all 54 and all 21 links in the element labelled "Cards in <deck>" printed one value, `1.5px solid rgb(23, 33, 43)` and `rgb(23, 33, 43) 0px 3px 0px 0px`. **The yellow count does not hold as written:** two elements computed to `rgb(255, 226, 52)`, the Practice button and the top bar's "Log in". T1's Debrief reports the same on a subject's page: AGENTS.md has the check run signed out, and a signed-in user does not see "Log in". Nothing else on the page is yellow. The script is `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/e3fefd90-976e-4c4c-8dcd-da3d6a4a3559/scratchpad/t4-check.cjs` and its output is `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/e3fefd90-976e-4c4c-8dcd-da3d6a4a3559/scratchpad/t4-check.out`.
- At `localhost:5173/library`, the same script printed the tab with `aria-selected="true"` as `rgb(23, 33, 43)` and shadow `none`, and the other as `rgb(255, 255, 255)` and `rgb(23, 33, 43) 0px 2px 0px 0px`.
- Screenshots at 390px wide: Your library, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/e3fefd90-976e-4c4c-8dcd-da3d6a4a3559/scratchpad/t4-library-subjects.png` and `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/e3fefd90-976e-4c4c-8dcd-da3d6a4a3559/scratchpad/t4-library-decks.png`; a subject's page, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/e3fefd90-976e-4c4c-8dcd-da3d6a4a3559/scratchpad/t4-subject.png`; a deck's Cards tab, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/e3fefd90-976e-4c4c-8dcd-da3d6a4a3559/scratchpad/t4-deck-cards-1.png` (Ports) and `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/e3fefd90-976e-4c4c-8dcd-da3d6a4a3559/scratchpad/t4-deck-cards-0.png` (Commands, 12 fields); a deck's Configurations tab, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/e3fefd90-976e-4c4c-8dcd-da3d6a4a3559/scratchpad/t4-deck-configurations.png`; a deck with no cards, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/e3fefd90-976e-4c4c-8dcd-da3d6a4a3559/scratchpad/t4-deck-empty.png`.

The commit's checks, on this task's files alone over HEAD, exported to the scratchpad because a peer's uncommitted T7 work is in this checkout: `npx vitest run` printed `Test Files 53 passed (53)` and `Tests 554 passed (554)`, `npm run lint` printed nothing, and `npm run build` built. On the tree with the peer's work: `Tests 556 passed (556)`, and lint and build the same.

Departures from Details and the drawings:

- A card's other fields sit in two equal columns, and a value over 18 characters, `HALF_WIDTH_CHARACTERS` in `CardList.tsx`, spans both, in place of the drawing's `1fr auto`, which misaligns from card to card once a deck has 12 fields. Fields stay in position order, so a short value before a long one leaves its right cell empty; `t4-deck-cards-0.png` shows "path".
- The 1.5px ink rule is drawn only when a card has a second field, since a one-field card would otherwise have it directly above the block's own outline.
- A deck's Practice button has 14px sides and a 6px gap, not the drawing's 18px and 8px. With the drawing's, "Commands" broke to "Command" and "s" at 390px. A single word too long for the column still breaks.
- The subject's description sits under the icon and name, as drawing 2 has it, not beside the icon as it did.
- A card's link has no spoken name of its own: the drawing's "Edit 80" is not in the vocabulary, and this task changes no such row, so the link is named by its content.
- With no cards, the page renders no `CardList`, so the deck's field names no longer show above "No cards in this deck yet."; the count "0 cards · 5 fields" stays. `DeckDetailPage.test.tsx`'s two zero-card tests now assert that.
- `DeckConfigurationRow.tsx`'s trash button stays 44px wide, where drawing 5 has 40px.
- The block of configuration rows renders only with at least one row, because it would otherwise show as an empty outlined box while loading or after a failed load.
- `SubjectIcon.tsx`, `SubjectIcon.test.tsx`, `LibraryPage.test.tsx` and `SubjectDetailPage.test.tsx` did not change: the icon's size is set by the caller, and every test on those pages passes as it stood.

For the engineer to know:

- `docs/backlog.md` and ADR 032 still name `CardTable`, and `docs/cycles/029-field-deletion.md` lists `CardTable.tsx` in a task's Files. None is in T4's Files or Done when, so all three stand as they were; the backlog's line and cycle 029's path are yours to decide.
- T5, T6 and T7's Done-when lines that count one yellow element, and T7's "every count is 0 or 1", meet the same "Log in" when checked signed out.
- T6's Done when asks `border-style: none` of every button named "Delete …". Tailwind's reset gives a bare button `0px solid`, and `DeckConfigurationRow.tsx`'s bare trash button prints `solid`, so a bare button will fail that line as written.

Seen and not changed: `LibraryPage.tsx`'s toolbar writes its count without `pluralize`, so one subject reads "1 subjects" and one deck "1 decks".

To read: `frontend/src/components/library/CardList.tsx`, for `HALF_WIDTH_CHARACTERS` and the rule's condition.

### T5 — The forms

**Status**

- [x]

**Goal**

The subject, deck, card and configuration forms match drawing 4 in their look.

**Dependencies**

- T1: the eight tokens and Lexend.
- T3: `tappable`, `tappable-sm` and `tappable-pressed`; `PickerCombobox`, `ConfirmDialog`, `FullScreenDialog`, `BottomSheet`.
- T4: no interface; it shares `docs/vocabulary.md`.
- T6: no interface; it shares `frontend/src/pages/PracticeCreatePage.tsx`.

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
- `docs/vocabulary.md`
- `frontend/src/pages/PracticeCreatePage.tsx`, for its sticky row only
- `docs/backlog.md`, for B20 only, by the engineer's order

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

Evidence, in the order of Done when:

- `cd frontend && npx vitest run src/components/library` printed `Test Files 9 passed (9)` and `Tests 122 passed (122)`.
- `grep -rn "opacity-40\|opacity-50\|opacity-60" frontend/src/components/library` printed nothing.
- Headless Chromium through playwright-core at `localhost:5173/deck-configurations/new?deck=<id>` on the seeded deck Ports, signed out of Clerk, 390px wide, launched with `--force-device-scale-factor=2`: the section labelled "Prompt side" printed `1.5px solid rgb(23, 33, 43)` and `rgb(23, 33, 43) 0px 3px 0px 0px`, and "Not used" printed `1.5px dashed rgb(23, 33, 43)` and `none`. While Create could not be pressed, the only yellow element was "Log in"; once it could, they were "Log in" and Create. "Log in" is the check's signed-out state, so "exactly one" holds apart from it.
- At `localhost:5173/subjects/new` with the name blank, Create printed `1.5px solid rgb(213, 218, 226)` and `none`, with the only yellow element "Log in".
- Screenshots at 390px wide: New subject, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-new-subject-blank.png`; Edit deck, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-edit-deck.png`; New card, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-new-card.png`; Edit configuration, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-edit-configuration.png`. Also Edit deck with a field staged for removal, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-edit-deck-staged.png`; New deck, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-new-deck.png`; Edit card, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-edit-card.png`; New configuration, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-new-configuration.png` and, with its counts, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-new-configuration-filled.png`; the move sheet, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-move-sheet.png`; the icon picker, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-icon-picker.png`. The script is `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-check.cjs` and its output `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-check.out`; it printed no page errors. It also pressed Move up, which reordered the fields, and pressed Create with a blank name, which showed "Name is required."

The commit's checks, on this task's files alone over HEAD, exported to the scratchpad because a peer's uncommitted T7 work is in this checkout: `npx vitest run` printed `Test Files 53 passed (53)` and `Tests 554 passed (554)`, `npm run lint` printed nothing, and `npm run build` built. On the working tree with that work: `Test Files 53 passed (53)`, `Tests 556 passed (556)`, lint printed nothing, and the build built.

Departures from Details and Files, the first by the engineer's order:

- A field's Move up and Move down are bare arrow buttons on each row, spoken "Move <field> up" and "Move <field> down", in place of today's menu, which kept the words Details asked to keep but not the icon buttons Details asked for. The engineer chose this from two options drawn on the canvas, and it is drawing 27. It departs from "this task changes no word" and from "no test on behaviour changes": `docs/vocabulary.md` joined Files for the row "Moving a field", T5 gained a dependency on T4 because both list that file, and `DeckEditor.test.tsx`'s three reorder steps and one test's name changed.
- By the engineer's order, the sticky header row on Edit deck, New deck, both configuration forms and New practice stops at `top-[114px]`, beneath the app's sticky header, where at `top-0` it slid behind that header and hid Save, Undo and Cancel. Scrolled in headless Chromium at 390px by 600px, on Edit deck, Edit configuration and New practice, the row's top printed `114`, the header's bottom `114`, and Save was the element under its own centre. The script is `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-sticky.cjs`; the screenshot is `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-edit-deck-scrolled.png`.
- A disabled arrow reads as a disabled Remove does, a 1.5px line outline with aside icon, since Details name only Remove. With three icon buttons, a field's name input is 156px wide, so "Protocol Function" clips in it at 390px, and each icon button is 36px, under the 44px the top bar's icons take.
- Details say drawing 4 draws the trash and move controls. It draws neither, and no drawing the task cites did until 27.
- New subject's and Edit subject's button with a blank name uses `aria-disabled`, not `disabled`, and stays pressable. Today it is enabled and pressing it shows "Name is required.", which two tests in `SubjectForm.test.tsx` hold and "no test on behaviour changes" keeps; Done when asks it to read as not pressable. So it looks as if it cannot be pressed, and pressing it still shows the sentence. Every other disabled button is truly `disabled`.
- Create and Save on the subject and card forms moved from a full-width button under the form to the header row, as Details require, against "Changing any form's layout" in Out of scope. They reach their form through the `form` attribute, and the comment about the old button's position went.
- Edit card shows its deck as a fixed value from `CardStandaloneForm.tsx` and no longer passes `locked`, so that prop of `PickerCombobox` now has no caller outside its tests. `PickerCombobox.tsx` is not in Files.
- "Primary" sits above its field's name input, not beside it, since the row has no width to spare; a row with it is taller.
- Delete subject, Delete deck and Delete card are 48px full-width `tappable` blocks with 16px corners, carrying drawing 26's trash icon. Done and Undo are 40px `tappable-sm` blocks with 14px corners, matching Save. Add field is a 40px pill, as `AddButton` draws one.
- A field staged for removal reads struck through, in aside on ground, since its row's opacity had to go. Its X stays a mark, not a button, so it carries no outline. The field's type select is always disabled, so it reads as a read-only input, with its native arrow hidden.
- "Not used" stays above the two sides, where drawing 4 has it below; the Subject and Deck pickers stay without a label above them, where drawing 26 has "Subject"; and the fixed deck on Edit configuration reads "CompTIA A+ · Ports", where drawing 4 has "Ports". Each is a layout or a word this task must not change.

For the engineer to know:

- While the connection banner shows, the row is still hidden once the page scrolls. With the browser set offline, on Edit deck and New practice, the app's header bottom printed `172`, the row's top `114` and its height `56`, and Save and Create were not the elements under their own centres. The engineer left this as it is, and B20 in `docs/backlog.md` keeps the question. The script is `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-banner.cjs`; the screenshots are `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-edit-deck-banner.png` and `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/9c5c26f0-1480-42f7-8904-3eafb9493331/scratchpad/t5-new-practice-banner.png`.
- `DeckEditor.tsx`, `DeckConfigurationEditor.tsx` and `CardFieldsForm.tsx` fail `prettier --check`, and they failed it at HEAD before this task. They were not reformatted.

To read: `frontend/src/components/library/SubjectForm.tsx`, for the `aria-disabled` on its submit button; `frontend/src/components/library/DeckEditor.tsx`, `FieldsSection`, for the arrow buttons.

### T6 — Practice, New practice and a practice's page

**Status**

- [x]

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

Evidence, in the order of Done when:

- `cd frontend && npx vitest run src/pages/PracticeOverviewPage.test.tsx src/pages/PracticeCreatePage.test.tsx src/pages/PracticeDetailsPage.test.tsx src/components/practice` printed `Test Files 4 passed (4)` and `Tests 78 passed (78)`.
- `grep -rn 'role="tablist"' frontend/src/pages` printed nothing on HEAD plus T6's changes alone, with T4 committed. Before T4's commit it printed `src/pages/DeckDetailPage.tsx:151` and `src/pages/LibraryPage.tsx:52`, T4's files.
- Headless Chromium through playwright-core at `localhost:5173/practice`, signed out of Clerk, 390px wide, launched with `--force-device-scale-factor=2`: the element holding the rows printed `1.5px solid rgb(23, 33, 43)` and `rgb(23, 33, 43) 0px 3px 0px 0px`; all 15 buttons named "Delete …" printed `border-style: none`; the "Active" badge printed the background `rgb(23, 33, 43)`. The line "no element" to yellow does not hold literally: one element printed it, the top bar's "Log in", which T1 and T2 keep yellow when signed out and which the signed-out check always renders. Nothing else on the page did.
- `localhost:5173/practice/new` with one configuration ticked: two elements printed `rgb(255, 226, 52)`, "Log in" and Create, so "exactly one" holds only apart from "Log in"; with nothing ticked only "Log in" printed it. Both fieldsets printed `1.5px solid rgb(23, 33, 43)` and `rgb(23, 33, 43) 0px 3px 0px 0px`.
- The page of the seeded active practice "027 T1 colour check": two elements printed yellow, "Log in" and Start practice, the same exception. The completed practice's page printed only "Log in".
- Screenshots at 390px wide: `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/d66583fd-e24a-43ba-99d0-1599b53f1c11/scratchpad/t6-practice.png`, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/d66583fd-e24a-43ba-99d0-1599b53f1c11/scratchpad/t6-new.png` (one configuration ticked), `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/d66583fd-e24a-43ba-99d0-1599b53f1c11/scratchpad/t6-new-empty.png` (nothing ticked), `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/d66583fd-e24a-43ba-99d0-1599b53f1c11/scratchpad/t6-active.png` and `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/d66583fd-e24a-43ba-99d0-1599b53f1c11/scratchpad/t6-completed.png`. The script is `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/d66583fd-e24a-43ba-99d0-1599b53f1c11/scratchpad/t6-check.cjs` and its output is `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/d66583fd-e24a-43ba-99d0-1599b53f1c11/scratchpad/t6-check.out`. No page or horizontal overflow error printed. Create was never pressed, so the check added no row to the dev database.

The checks AGENTS.md requires, on HEAD with T4 committed plus T6's changes alone: `npx vitest run` printed `Test Files 53 passed (53)` and `Tests 554 passed (554)`, `npm run lint` printed no problems, and `npm run build` built. The browser checks above ran on a tree that also held peers' uncommitted T4 and T7 work.

Not seen in a browser, since the seeded data does not reach them: "Clear filters" and the empty sentences, a sentence against a configuration row, the error sentences, and the checkbox's keyboard focus outline. The two `ConfirmDialog`s were not opened here; T6 does not change them. Tests assert the behaviour of these states but not their look.

Departures from Details and Files:

- A long name on a practice's page wraps instead of truncating, because 30px beside two 48px squares leaves room for about twelve characters. The badge therefore drops under a name that fills its line, so it is not always "beside it"; `t6-active.png` and `t6-completed.png` show this.
- The filters' 42px is set from `PracticeFilterBar.tsx` with `[&_input]:h-[42px]`, as `PickerCombobox.tsx` is outside Files and stays 46px elsewhere. The same selector moves the chevron to `top-[13px]`, which printed 13px above and below it. The filters' text stays T3's 16px, where drawing 5 draws 15px.
- The rows' block on the Practice page renders only when it has a row, and the Selected block only once its configurations resolve, since an empty block draws a bare outline while loading or after a failed load.
- Each fieldset's legend is floated, because a browser otherwise cuts a legend into the fieldset's top outline. It printed inside the block, under the outline.
- The headings carry drawing 5's `-0.02em` spacing and `1.05` line height, which Details does not name. The trash and X buttons are 40px wide, as drawing 5 draws the trash.
- Details does not settle these, and I chose them: "Selected" reads 13px in aside as a label, the empty sentences read 15px in aside, a practice's date sits under the heading as today, and the Re-run and Delete icons are 18px, as drawing 3 draws Edit deck's.
- No listed test file changed, because none asserts a class name.

To read: `frontend/src/components/practice/PracticeFilterBar.tsx`, for the selectors that reach into the picker, which would break silently if the picker's markup changed; `frontend/src/components/practice/ConfigurationPickList.tsx`, for the hidden checkbox and the floated legend.

### T7 — The run page

**Status**

- [x]

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

Two Done-when lines do not hold as written, and the reason is one thing: the check runs signed out of Clerk, as AGENTS.md requires, and signed out the top bar's "Log in" is also yellow, as T1 and T2 require. `AuthSlot.tsx` is outside this task's Files, so I did not change it. T1's Debrief reported the same count. Every yellow count below is therefore printed twice, the whole page and outside the header. I have not seen any screen signed in.

Evidence, in the order of Done when:

- `cd frontend && npx vitest run src/pages/PracticeRunPage.test.tsx src/components/practice` printed `Test Files 2 passed (2)` and `Tests 35 passed (35)`.
- Headless Chromium through playwright-core on the run page of the seeded active practice "Nov 3, 2026, 10:42 p.m.", 390px wide, launched with `--force-device-scale-factor=2`, before "Show answer": the one "Hidden" tile printed background `rgb(255, 243, 166)`, height `34`, width `319` and its row's width `319`. The bar printed `rgba(0, 0, 0, 0)` and its three segments `4px`. **Not as written:** two elements computed to `rgb(255, 226, 52)`, "Log in" and "Show answer"; outside the header, one, "Show answer". This card has one answer and the practice no failed card, so the tile and segment checks were repeated on a stubbed run state with nothing written: four tiles of the same background, height and width, including an image answer, and four segments in `rgb(23, 33, 43)`, `rgb(229, 72, 77)`, `rgb(92, 102, 114)` and `rgb(213, 218, 226)`, each `4px`. The script is `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/a11e54c0-03f5-4474-aa41-ea9155fae8d5/scratchpad/t7-run.cjs` and its output is `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/a11e54c0-03f5-4474-aa41-ea9155fae8d5/scratchpad/t7-run.out`.
- After "Show answer": the button named "Rate OS" printed `dashed`, `1.5px rgb(23, 33, 43)` and `none`. Rated Good in the page, it printed `1.5px solid rgb(23, 33, 43)` and `rgb(23, 33, 43) 0px 2px 0px 0px`. The rating was never submitted. On the stubbed state, the other three chips printed: Again, fill `rgb(229, 72, 77)` with an ink outline; Hard, white with a `rgb(229, 72, 77)` outline; Easy, fill and outline in ink; all with the ink shadow.
- The cycle's judgement, by `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/a11e54c0-03f5-4474-aa41-ea9155fae8d5/scratchpad/t7-judge.cjs` at 390px wide. **Not as written:** six counts are 2, each being "Log in" and one other thing. Outside the header every count is 0 or 1:

```
library-subjects       count=1 outside-header=0 ["Log in"]
library-decks          count=1 outside-header=0 ["Log in"]
subject                count=2 outside-header=1 ["Log in","Practice"]
deck-cards             count=2 outside-header=1 ["Log in","Practice"]
deck-configurations    count=2 outside-header=1 ["Log in","Practice"]
edit-configuration     count=2 outside-header=1 ["Log in","Save"]
practice               count=1 outside-header=0 ["Log in"]
practice-new           count=1 outside-header=0 ["Log in"]
practice-page          count=2 outside-header=1 ["Log in","Start practice"]
run-before-show        count=2 outside-header=1 ["Log in","Show answer"]
run-after-show         count=1 outside-header=0 ["Log in"]
home                   count=1 outside-header=0 ["Log in"]
open-menu              count=1 outside-header=0 ["Log in"]
delete-confirm         count=1 outside-header=0 ["Log in"]
/notifications headings 0
other origins and fonts ["fast-katydid-31.clerk.accounts.dev","FONT http://localhost:5173/node_modules/@fontsource-variable/lexend/files/lexend-latin-wght-normal.woff2",""]
```

The one font request is from `localhost`, and no request went to Google Fonts; the empty entry is a URL with no host. The delete confirm was opened and cancelled, and nothing was deleted.

Screenshots at 390px wide, one per line above, named `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/a11e54c0-03f5-4474-aa41-ea9155fae8d5/scratchpad/t7-j-<name>.png`, for example `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/a11e54c0-03f5-4474-aa41-ea9155fae8d5/scratchpad/t7-j-run-before-show.png`. For drawings 18 and 19, use the full-page shots `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/a11e54c0-03f5-4474-aa41-ea9155fae8d5/scratchpad/t7-run-hidden.png`, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/a11e54c0-03f5-4474-aa41-ea9155fae8d5/scratchpad/t7-run-shown.png` and `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/a11e54c0-03f5-4474-aa41-ea9155fae8d5/scratchpad/t7-run-popover.png`. For the edge cases, use `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/a11e54c0-03f5-4474-aa41-ea9155fae8d5/scratchpad/t7-stub-hidden.png`, `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/a11e54c0-03f5-4474-aa41-ea9155fae8d5/scratchpad/t7-stub-shown.png` and `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/a11e54c0-03f5-4474-aa41-ea9155fae8d5/scratchpad/t7-complete.png`; in the stubbed full-page shots the sticky header is painted partway down the page, which only the capture does.

The output above is from a re-run after T4, T5 and T6 were committed, on the tree that is this commit, so these screens are final and the screenshots show them. The counts did not change from the first run, which had T4 and T6 uncommitted and T5 unbuilt. I re-ran the checks and the scripts after approval, because those three commits landed while T7 waited; this paragraph and the next changed then. I have not compared those screens with their drawings; that comparison is the engineer's, as is the rest of the judgement, and the Goal's "the cycle's judgement holds" rests on it.

The whole-frontend checks on that tree: `npx vitest run` printed `Test Files 53 passed (53)` and `Tests 556 passed (556)`, `npm run lint` printed no problem, and `npm run build` built.

Departures from Details and Files:

- `ratingTiers.ts` gains `blockClass` beside `chipClass`. `RunBreakdown.tsx` is outside Files and its read-only badge needs `chipClass` complete with its own border, while a block's width and shadow come from `tappable-sm`.
- Hard's outline is `border-(--color-wrong)!`, since `tappable-sm`'s ink outline otherwise won in the browser. Details do not ask for `!important`.
- Again's and Easy's chips have an ink outline: T1 gives them no outline colour, so they keep the block's.
- `FieldValue` gains an optional `zone` prop, `'prompt' | 'answer'`. Without it, sizes stay as they were, so the summary renders as T1 left it. The 26px value also takes drawing 3's line-height 1.1 and letter-spacing −0.01em, which Details cite but do not write out.
- The image and audio chip on the run page is now a `tappable-sm` block, which Details do not name, since it can be tapped. The same chip in the summary stays T1's, so the two differ until the later cycle that draws the summary.
- The popover's arrow is left out, as the guidance allows, and the popover gains `collisionPadding={16}`, since the panel touched the screen's right edge.
- A disabled "Next card" is white, with a line outline, aside words and no shadow. This is written from T5's Details and drawing 18's "Edit card", in `PracticeRunPage.tsx`, by swapping classes rather than through T5's `disabled:` variants, which landed after it; the look is the one T5 specifies. It also takes this look while a rating is being sent.
- Spacing follows drawings 18 and 19: 14px between the card's parts and 18px at the zones' sides.
- `PracticeRunPage.test.tsx` gained a test on the twelve-character threshold. No existing test changed, since none asserted a class this task changed.

For the engineer to judge: a prompt of twelve characters with no space does not fit on one line at 54px in the 319px row. A stubbed "SUPERCALIFRA" broke mid-word onto two lines, 108px tall, and did not overflow. Long unbroken words in other values also break mid-word (`wrap-anywhere`), because otherwise they push out of the block. Details fix the threshold, so I kept it.

To read: `frontend/src/components/practice/ratingTiers.ts`, for the two class lists and the `!`; `frontend/src/components/practice/FieldValue.tsx`, for `zone`.
