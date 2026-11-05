# ADR 101: Every length in a component measured, derived, or a fixed design size in rem

## Status

Active

## Context

Components are styled with Tailwind utility classes, which accept an arbitrary value, so a number in any unit can sit in any class, and the design's custom properties live in one `@theme` block in `frontend/src/index.css` (ADR 005).

Flashy follows the text size the user has set in their browser, and everything on a screen grows together with it: the words, the blocks around them, the rows and the buttons (PDR 030).

Everything a user can open or act on is a white block with rounded corners, a thin ink outline and a short solid ink shadow (PDR 020).

`index.css` sets no root font size, so the root follows the browser's text size and a utility in rem scales with it, while a value in px holds still. About 230 arbitrary px values across 38 component files, and the px lines of the `tappable` utilities in `index.css`, are such values.

A hairline written in rem thickens with the text and lands between pixels.

`top-[114px]` on three sticky rows, `pt-[7.875rem]` on the side drawer, `top-[15px]` on `PickerCombobox` and `top-[13px]` on `PracticeFilterBar` each stand for another element's size.

The side drawer is a Radix Dialog (ADR 016). With the banner showing at 390 wide, its first item sits at 126 to 174, under a header that ends at 172 and is drawn in front of it.

The header's height is measured at run time and available as `--app-header-height`, and the drawer's top padding can read it with the drawer's own space added (ADR 100).

CSS can centre an icon against its input with no offset.

Some arbitrary values, such as `min-h-[78px]`, are chosen for how a thing looks, and nothing else is positioned from them.

jsdom does no layout, so no component test sees a number that has stopped matching what it stands for, or a size that failed to grow with the text (ADR 017).

A guard test already asserts what `@theme` declares and scans component source for colours outside the app's eight (ADR 090).

A scan can recognise a sticky offset and a unit, but cannot recognise what any other number stands for.

## Decision

We will give every length a component under `frontend/src` writes one of three sources, and no other: a measurement, when the size can vary while the app runs; a derivation by CSS, when CSS can derive it; or a fixed design size in rem, a value chosen for how a thing looks, which nothing else is positioned from. We will hard-code no number that stands for another element's size or position.

A design size used more than once is a `@theme` token in rem in `frontend/src/index.css`, and a component writes the token's utility, never the value; a one-off length is an arbitrary rem value; and a comment names a size by its token or in rem, never in px. This holds for text size, line height, height, width, spacing, radius and offset alike.

A border width, a press shadow's offset and a press travel stay in px, and live only in `index.css` utilities, never in a component.

We will hold the rule with two source scans over component sources: one fails on `sticky` beside a hard-coded `top-[…]`, and one fails on any px literal, `index.css` excepted. A number measured from the browser is not a literal.

## Alternatives considered

### No general rule

Rejected because it leaves the next developer to copy the number beside them.

### A ban on every arbitrary value

Rejected because it outlaws a value chosen for how a thing looks.

### Everything in rem, hairlines included

Rejected because a hairline in rem thickens with the text and lands between pixels.

### px in source, converted to rem at build

Rejected because it gives two readings of one size and guards nothing an inline style bypasses.

### em for heights

Rejected because it compounds in nesting and makes every Tailwind utility an arbitrary value.

### Design sizes in px

Rejected because a size in px holds still while the text grows, so a block drawn for one size of text no longer holds its label.

### The rule with no test

Rejected because it holds only while review remembers it.

### Only a line in AGENTS.md

Rejected because it keeps the rule and loses why.

## Consequences

**Positive**

- The user who sets a larger text size in their browser sees every word, block, row and button grow together, and a line stays a line at every size.
- The developer who writes a sticky offset or a px length as a number gets a failing test, and keeps arbitrary values for sizes chosen for how a thing looks.
- The developer reads a repeated size once, in `index.css`, and changes it there.

**Negative**

- The developer's other numbers that stand for an element's size are caught only in review, since a scan cannot recognise what they stand for.
- The developer sweeps about 230 values across 38 component files to rem once, and lifts each repeated size into a token.
- The developer who needs a new hairline writes it as an `index.css` utility, never in the component that uses it.

**Neutral**

- The developer finds px nowhere in a component, and in `index.css` only on an outline, a press shadow's offset and a press travel.
