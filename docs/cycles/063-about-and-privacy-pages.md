# 063 — About and privacy pages

Waits for: 062, its "Delete account" in the account sheet, which the privacy page names, and `docs/vocabulary.md`, which it shares.

Canvas: https://claude.ai/artifact/5vAxjVFY37NMYL45Hcipc6

## Goal

Outcome: Anyone, guest or user, reaches "About Flashy" and "Privacy" from the foot of the side menu on every page.

Scope: The cycle covers the side menu's foot, holding "About" then "Privacy" below the main places; the page that says what Flashy is, at `/about`; the page that says what Flashy keeps about a person, at `/privacy`; `InlineLink`, the one way a link inside a sentence is drawn; and the vocabulary's rows for both pages and their words. It leaves out README.md, which cycle 064 rewrites, and any change to the server, as ADR 128 already answers `/about` and `/privacy` with the frontend.

Judgement: On the dev servers, at 390 by 844 and at 1440 by 900, as a user and as a guest, the engineer opens the side menu on Home, on a deck's page and on a form, finds "About" then "Privacy" at its foot below the main places as drawings 8 and 9 draw it, opens each, and reads "About Flashy" as drawing 8 draws it and "Privacy" as drawing 11 draws it, with no row of places above either heading; a click on the underlined address opens the desktop's email app.

## Records

- PDR 059: A page saying what Flashy is, by choice
- PDR 062: A plain-words privacy page reached from every page
- PDR 063: A block for everything tappable but in-sentence links

## Tasks

### T1 — About Flashy from the menu's foot

**Status**

- [ ]

**Goal**

"About" at the foot of the side menu, set apart below the main places, opens "About Flashy" at `/about`, which says what Flashy is, its three ideas and how it works.

**Dependencies**

None.

**Files**

- `frontend/src/components/shell/navItems.ts`
- `frontend/src/components/shell/SideDrawer.tsx`
- `frontend/src/components/shell/SideDrawer.test.tsx`
- `frontend/src/pages/AboutPage.tsx` (new)
- `frontend/src/pages/AboutPage.test.tsx` (new)
- `frontend/src/App.tsx`
- `docs/vocabulary.md`

**Details**

- Drawing 8 is a constraint: `8-menu` for the side menu's foot, and `8-about` for the page.
- `navItems.ts` must export `FOOT_NAV_ITEMS: NavItem[]`, holding in this task `{ label: 'About', to: '/about', icon: Info }`, `Info` from `lucide-react` as drawing 8 draws it. `SideDrawer` must render `FOOT_NAV_ITEMS` at its foot, below `NAV_ITEMS` and parted from them by a thin line in `--color-line`, with the same `NavLink` blocks `NAV_ITEMS` takes, as a list whose items stand apart by the gap `NAV_ITEMS`' list takes, so a second item needs no change to `SideDrawer`.
- `/about` must be a route inside the error-boundary route of `frontend/src/App.tsx`, rendering `AboutPage` from `frontend/src/pages/AboutPage.tsx`, which writes its words in JSX and has no query and no `Breadcrumb` (PDR 064). It calls `usePageTitle('About Flashy')`.
- `AboutPage` must hold, in order: the heading "About Flashy"; the line "Flashcards for knowledge that doesn't fit on two sides of a card."; a thin line; the three ideas, each a title over one line, the title drawn as drawing 8 draws it and not a heading element: "One card, many fields" over "A word's spelling, meaning, gender and example, all on one card.", "A new question every time" over "Choose what each card shows and asks. Fields drawn at random keep the same card fresh.", and "Mastery for every field" over "See exactly what you know. The fields you know least come up most."; a thin line; and "How it works" over four numbered steps: "Make a deck and fill it with cards.", "Make a practice from your decks, and choose what each one asks.", "Start a run. Rate each answer, and missed cards come back.", "See how each card's mastery moved, then run it again.". It draws no block and nothing yellow.
- Every icon beside an idea must be hidden from assistive technology. The third idea's icon must be drawn as drawing 8 draws it, a circle 24 pixels wide filled about 0.93 of a turn clockwise from the top, never as a `MasteryCircle`, which has no size of 24 pixels and speaks "Mastery N%". The guidance for the icons is `Rows3` and `Shuffle` from `lucide-react`, and for the third an inline `svg` copied from drawing 8.
- `SideDrawer.test.tsx` must assert the menu's links in order, "Home", "Your library", "All practices", "About", and that "About" leads to `/about`. `AboutPage.test.tsx` must assert the heading and each line above in order, finding each idea's title by its text.
- `docs/vocabulary.md` must gain, below the row "Opening and closing the menu, spoken", two App rows: Concept "The page that says what Flashy is"; User reads `"About"; "About Flashy"`; Where `Side menu, at its foot; its heading`; Code `` `AboutPage`; `/about`; `FOOT_NAV_ITEMS` ``. And Concept "What Flashy is"; User reads `"Flashcards for knowledge that doesn't fit on two sides of a card."; "One card, many fields"; "A word's spelling, meaning, gender and example, all on one card."; "A new question every time"; "Choose what each card shows and asks. Fields drawn at random keep the same card fresh."; "Mastery for every field"; "See exactly what you know. The fields you know least come up most."; "How it works"; "Make a deck and fill it with cards."; "Make a practice from your decks, and choose what each one asks."; "Start a run. Rate each answer, and missed cards come back."; "See how each card's mastery moved, then run it again."`; Where `About Flashy`; Code `` `AboutPage` ``.

**Out of scope**

- "Privacy" in the menu's foot, drawing 8 draws it below "About", and its page: T2.
- The page drawn beneath the menu in drawings 8 and 9, which stands in for whichever page is open: never changed here.
- A strip at the foot of every page, the logo's yellow F in the heading, or anything yellow on the page: never.
- The page as the first thing a visitor or a user who logs in meets: never, as PDR 059 rejects it.

**Done when**

- The cases of `frontend/src/components/shell/SideDrawer.test.tsx` and `frontend/src/pages/AboutPage.test.tsx` named for the menu's order, the link to `/about`, and the page's heading and lines pass.
- In headless Chromium against localhost:5173, as a user and as a guest as AGENTS.md gives them, at 390 by 844 and at 1440 by 900: the side menu opened on Home shows the link "About" below "All practices"; a click on it lands on `/about`, whose `h1` reads "About Flashy", whose tab reads "About Flashy · Flashy", and which holds no navigation named "Breadcrumb"; the builder saves a screenshot of the open menu and of the page at 390 by 844 and names their paths in the Debrief.

**Debrief**

None.

### T2 — Privacy from the menu's foot

**Status**

- [ ]

**Goal**

"Privacy", directly below "About" at the foot of the side menu, opens "Privacy" at `/privacy`, which says what Flashy keeps about a person, with the address to write to underlined inside its sentence.

**Dependencies**

- T1: `FOOT_NAV_ITEMS` and the side menu's foot.

**Files**

- `frontend/src/components/shell/navItems.ts`
- `frontend/src/components/shell/SideDrawer.test.tsx`
- `frontend/src/components/ui/InlineLink.tsx` (new)
- `frontend/src/components/ui/InlineLink.test.tsx` (new)
- `frontend/src/pages/PrivacyPage.tsx` (new)
- `frontend/src/pages/PrivacyPage.test.tsx` (new)
- `frontend/src/App.tsx`
- `docs/vocabulary.md`

**Details**

- Drawings 9 and 11 are a constraint: `9-menu` for the side menu's foot, and `11-top` and `11-foot` for the page.
- `FOOT_NAV_ITEMS` must hold `{ label: 'Privacy', to: '/privacy', icon: Shield }` directly after "About", `Shield` from `lucide-react` as drawing 9 draws it.
- `/privacy` must be a route inside the error-boundary route of `frontend/src/App.tsx`, rendering `PrivacyPage` from `frontend/src/pages/PrivacyPage.tsx`, which writes its words in JSX and has no query and no `Breadcrumb` (PDR 064). It calls `usePageTitle('Privacy')`.
- `PrivacyPage` must hold, in order: the heading "Privacy"; the line "Flashy is run by Jaden Lu. This page says what Flashy keeps about you, and why."; then six headings, each over its words: "Looking around" over "If you look around without logging in, Flashy keeps nothing about you."; "Signing in" over "You sign in through Clerk, a sign-in service. When you sign in with Google, Clerk receives your name, email address and profile picture. Flashy shows them in your account and uses them for nothing else."; "What Flashy keeps" over "What you make and do in Flashy: your decks, cards, practices and runs, every rating you give, and when you started your first run. And your time zone, so dates show in your own time."; "Who else has it" over "Flashy sells nothing, shares nothing and has no ads or tracking. Clerk holds your sign-in, and everything else is stored on Railway, the service that runs Flashy's server."; "Deleting it" over ""Delete account", in your account, deletes your account and everything in it at once. It can't be undone."; and "Questions" over "Write to shihui.lu51@gmail.com.", the address an `InlineLink` to `mailto:shihui.lu51@gmail.com`.
- `frontend/src/components/ui/InlineLink.tsx` must be the one way a link inside a sentence is drawn (PDR 063): an `<a>` underlined in its text's color, with no block classes and no length of its own, at the weight drawing 11 gives. A router `Link` joins it only when a link inside a sentence to a page of the app does.

```tsx
type InlineLinkProps = { href: string; children: ReactNode };

/** A link inside a sentence: underlined words in the sentence's own color, never a block. */
export default function InlineLink({ href, children }: InlineLinkProps): ReactNode;
```

- `SideDrawer.test.tsx` must assert the menu's links in order, "Home", "Your library", "All practices", "About", "Privacy", and that "Privacy" leads to `/privacy`. `PrivacyPage.test.tsx` must assert the heading, the opening line, each heading and its words in order, and a link named "shihui.lu51@gmail.com" whose `href` is `mailto:shihui.lu51@gmail.com`. `InlineLink.test.tsx` must assert that it renders one `<a>` with its `href` and children, and none of the classes `tappable`, `tappable-sm` or `tappable-pressed`.
- `docs/vocabulary.md` must gain, below the row "What Flashy is", two App rows: Concept "The page that says what Flashy keeps about a person"; User reads `"Privacy"`; Where `Side menu, at its foot, below "About"; its heading`; Code `` `PrivacyPage`; `/privacy`; `FOOT_NAV_ITEMS` ``. And Concept "What Flashy keeps about a person"; User reads `"Flashy is run by Jaden Lu. This page says what Flashy keeps about you, and why."; "Looking around"; "If you look around without logging in, Flashy keeps nothing about you."; "Signing in"; "You sign in through Clerk, a sign-in service. When you sign in with Google, Clerk receives your name, email address and profile picture. Flashy shows them in your account and uses them for nothing else."; "What Flashy keeps"; "What you make and do in Flashy: your decks, cards, practices and runs, every rating you give, and when you started your first run. And your time zone, so dates show in your own time."; "Who else has it"; "Flashy sells nothing, shares nothing and has no ads or tracking. Clerk holds your sign-in, and everything else is stored on Railway, the service that runs Flashy's server."; "Deleting it"; ""Delete account", in your account, deletes your account and everything in it at once. It can't be undone."; "Questions"; "Write to <address>.", the address an underlined link, as "shihui.lu51@gmail.com"`; Where `Privacy`; Code `` `PrivacyPage`; `InlineLink` ``.

**Out of scope**

- The address as a block, or as plain text: never.
- Drawing 11's curly quotes and apostrophe: never, as the vocabulary's row for what Flashy keeps about a person writes them straight, as the page must.
- The page served without JavaScript, or a change to the server: never.
- A router `Link` inside `InlineLink`: a later cycle, when a link inside a sentence to a page of the app is first needed.
- The page drawn beneath the menu in drawing 9: never changed here.

**Done when**

- The cases of `frontend/src/components/shell/SideDrawer.test.tsx`, `frontend/src/pages/PrivacyPage.test.tsx` and `frontend/src/components/ui/InlineLink.test.tsx` named for the menu's order, the link to `/privacy`, the page's lines, the `mailto:` address and the link's classes pass.
- In headless Chromium against localhost:5173, as a user and as a guest as AGENTS.md gives them, at 390 by 844 and at 1440 by 900: the side menu opened on a deck's page and on New deck shows "About" then "Privacy" below "All practices"; a click on "Privacy" lands on `/privacy`, whose `h1` reads "Privacy", whose tab reads "Privacy · Flashy", which holds no navigation named "Breadcrumb", and whose link "shihui.lu51@gmail.com" has the `href` `mailto:shihui.lu51@gmail.com` and a computed `text-decoration-line` of `underline`; and the link "About" there still lands on `/about`. The builder saves a screenshot of the open menu, of the page's top and of its foot at 390 by 844 and names their paths in the Debrief.

**Debrief**

None.
