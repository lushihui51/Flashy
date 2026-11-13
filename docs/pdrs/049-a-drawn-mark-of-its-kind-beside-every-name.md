# PDR 049: A drawn mark of its kind beside every name

## Status

Active

## Context

A user meets names of several kinds side by side. A practice's row names the practice above its decks, a deck's page names fields on every card, and a run's row names its day beside its practice. Elsewhere a name stands in a list of its own kind.

PDR 035 makes a practice and its runs two kinds of thing, and PDR 039 shows a practice's name beside a deck's name above the deck's board.

Every icon the app draws is an outline of one stroke weight. PDR 015 gives ink to what is said and grey to what names or places something, and gives eight colors one meaning each. PDR 020 draws what can be tapped as a white block with an outline and a shadow.

A character the app's font lacks is drawn by the device's fallback font, differently on each device, and "⚡" is a yellow emoji on most phones.

The count or heading beside a list already names the kind of its rows.

In NN/g's study of list indicators, a kind's word written before every name was the slowest pattern to read.

## Decision

We will give every deck, field, practice and run a mark of its kind wherever its name appears, so the user reads a name's kind off the name itself.

A deck's mark is a stack of cards, a practice's a flash of lightning, and a run's the flash inside a circle, each drawn by the app as an outline in the color of the words beside it, never in a color of its own. A field's mark is its name in square brackets.

We will put no mark beside the word that names its own kind, and none on a card.

## Alternatives considered

### Marks typed as characters

Rejected because the stack and the flash have no character in the app's font that looks the same on every device.

### Marks filled in ink

Rejected because a filled stack merges into one shape, and a solid mark draws the eye before the name.

### Brackets only where a field stands beside names of other kinds

Rejected because the mark would mean one thing on the board and nothing on a card.

### Kinds told apart by their place in a line

Rejected because the user must count the names, and with one or two names there is nothing to count.

### A color for each kind

Rejected because it fails anyone who cannot tell the colors apart, and gives PDR 015's colors more than their eight meanings.

### A kind's word before every name

Rejected because it adds words to every line, and was the slowest pattern in NN/g's study.

### The mark beside its kind's word as well

Rejected because two signs before one word say the same thing twice, and the count or heading beside a list already names its kind.

### A run's mark as the flash with speed lines, dashed, or with a dot

Rejected because each is near the plain flash at a phone's size, and a dashed mark reads as something that has not happened.

## Consequences

**Positive**

- The user reads a name's kind off the name itself on every screen, without counting names or telling colors apart.
- The user sees each mark the same on every device.

**Negative**

- The user learns three marks and the brackets before reading them at a glance.
- The user gives every name a little more room on every row.

**Neutral**

- The user reads every field's name in square brackets, on a card as on the board.
