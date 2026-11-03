# ADR 090: Eight colour tokens named by meaning as the only colours

## Status

Active

## Context

Components are styled with Tailwind v4 utility classes, and colours are custom properties in one `@theme` block in `frontend/src/index.css` (ADR 005).

`@theme` holds fifteen colours named by role, among them `primary`, `success`, `warning`, `rating-hard`, `rating-good` and `pending`.

PDR 015 gives the app eight colours, each with one meaning, the same on every screen: the main action, what is hidden, ink, what stands aside, what separates or has not happened, what went wrong, the page's ground, and the white that sits on it.

A token named by its hue can be used for any meaning that hue appears in, and its name stays the same.

A raw colour, a hex value or an arbitrary Tailwind colour in a component renders like a token, and does not appear in `@theme`.

Code names live in the vocabulary's Code column, independent of the user's words (ADR 069).

## Decision

We will give `@theme` in `frontend/src/index.css` exactly eight colour tokens, one per PDR 015 colour and each named by its meaning: `--color-main-action`, `--color-hidden`, `--color-ink`, `--color-aside`, `--color-line`, `--color-wrong`, `--color-ground` and `--color-surface`. A translucent colour is one of the eight at an opacity.

We will use no colour in a component but these eight: no raw colour, no hex value and no arbitrary Tailwind colour. We will hold both rules with a guard test, which asserts that `@theme` declares exactly the eight and that no component source uses any other colour.

## Alternatives considered

### Tokens named by hue

Rejected because a hue's name hides a colour used for a second meaning.

### The role tokens with new values

Rejected because they keep names for meanings PDR 015 removed.

### No guard

Rejected because a raw hex value renders without anyone noticing.

## Consequences

**Positive**

- The developer reads a colour's meaning from its token's name, and a colour given a second meaning shows as a token used against its name.
- The developer gets a failing test, not an unnoticed render, when a component uses a colour outside the eight.
- The developer finds no token named for a meaning PDR 015 no longer has.

**Negative**

- The developer sweeps every component once to replace fifteen role tokens with eight.
- The developer who adds a ninth colour changes the guard as well as `@theme`, and needs a product decision first.

**Neutral**

- The developer draws a translucent colour as one of the eight at an opacity.
