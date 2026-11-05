# ADR 101: No hard-coded number standing for another element's size

## Status

Active

## Context

Components are styled with Tailwind utility classes, which accept an arbitrary value, so a number can sit in any class (ADR 005).

`top-[114px]` on three sticky rows, `pt-[7.875rem]` on the side drawer, `top-[15px]` on `PickerCombobox` and `top-[13px]` on `PracticeFilterBar` each stand for another element's size.

The side drawer is a Radix Dialog (ADR 016). With the banner showing at 390 wide, its first item sits at 126 to 174, under a header that ends at 172 and is drawn in front of it.

The header's height is available at run time as `--app-header-height`, and the drawer's top padding can read it with the drawer's own space added (ADR 100).

CSS can centre an icon against its input with no offset.

Some arbitrary values, such as `min-h-[78px]`, are chosen for how a thing looks, and nothing else is positioned from them.

jsdom does no layout, so no component test sees a number that has stopped matching what it stands for (ADR 017).

A guard test already scans component source for colours outside the app's eight (ADR 090).

A scan can recognise a sticky offset, but cannot recognise what any other number stands for.

## Decision

We will hard-code no number that stands for another element's size or position.

We will measure a size that can vary while the app runs, and leave to CSS a size that CSS can derive.

We will keep design sizes fixed: a value chosen for how a thing looks, which nothing else is positioned from.

We will hold sticky offsets with a source-scan test that fails on `sticky` beside a hard-coded `top-[…]`.

## Alternatives considered

### No general rule

Rejected because it leaves the next developer to copy the number beside them.

### A ban on every arbitrary value

Rejected because it outlaws a value chosen for how a thing looks.

### The rule with no test

Rejected because it holds only while review remembers it.

### Only a line in AGENTS.md

Rejected because it keeps the rule and loses why.

## Consequences

**Positive**

- The developer who writes a new sticky offset as a number gets a failing test, and keeps arbitrary values for sizes chosen for how a thing looks.

**Negative**

- The developer's other numbers that stand for an element's size are caught only in review, since a scan cannot recognise what they stand for.

**Neutral**
