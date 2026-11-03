# PDR 020: A block for everything that can be tapped

## Status

Active

## Context

The app is used on phones held upright as well as on wide screens, and a user acts on it by tapping.

The screens are drawn in thin lines and plain text on white. A row that opens a page and a line of text that only labels look alike until the user tries them.

Much of what a screen shows can be opened or acted on, such as a deck or an answer, and some of it is only read, such as a heading or a count.

A shape drawn with an edge and a shadow reads as an object standing off the page, and a shape drawn flat reads as part of the page.

A Flashy card holds one value for each field of its deck, often more than two.

PDR 015 makes white what sits on the page, and ink the color of outlines and shadows.

## Decision

We will draw everything a user can open or act on as a white block with rounded corners, a thin ink outline and a short solid ink shadow, so that what can be tapped looks like a thing.

## Alternatives considered

### A white sheet with yellow highlighter swipes and pen marks

Rejected because its rows read as text until a user learns they are links.

### An index card with two faces

Rejected because it draws the two-sided flashcard that Flashy's cards, with their many fields, replace.

### Thin lines only

Rejected because it is one step from the screens as they are, where what can be tapped looks like text.

### Thick purple outlines

Rejected because it reads as a common template rather than as Flashy.

### Raised panels drawn like keys

Rejected because panels that cannot be tapped look as if they can.

## Consequences

**Positive**

- The user tells what they can tap from what they can only read by its outline and shadow.

**Negative**

- The user sees fewer things on one screen, since each block gives room to its edge and shadow.

**Neutral**

- The user sees each subject, deck, card and practice as a thing of its own on the page.
