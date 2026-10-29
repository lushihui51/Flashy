# PDR 015: Colors that each mean one thing, and what can be tapped drawn as a card

## Status

Active

## Context

Flashy is for anyone memorizing anything: adults preparing for a certification, students, people learning a language, hobbyists and trivia players.

The app is used on phones held upright as well as on wide screens, and a user acts on it by tapping.

The screens are drawn in thin lines and plain text on white. A row that opens a page and a line of text that only labels look alike until the user tries them.

Most screens offer several acts, and one of them is what a user on that screen most often came to do, such as starting the practice on a practice's own page.

A practice puts a card and its answers through states the user reads as they go. PDR 009 keeps every answer hidden until one action shows them all, and has the user rate each answer Again, Hard, Good or Easy. Hard, Good and Easy pass a card and Again fails it, so a card can pass with a struggle. A card in a practice is passed, failed, retrying or not yet seen, and the practice raises or lowers its mastery.

Things also go wrong outside a practice. PDR 002 meets every failure where it happened: a save that fails says so beside its control, a sentence takes the place of content that will not load or of a thing that is gone, and one banner at the top of every page says when the connection is lost.

A color that carries a meaning draws the eye wherever it appears. A user who meets one color in two meanings cannot tell from the color which is meant.

More colors can mark more states, but each one added is another meaning for the user to learn, and a screen of many colors draws the eye to many places at once.

The app is named Flashy.

## Decision

We will give the app eight colors, and each color one meaning, the same on every screen:

- Yellow is the one main action on a screen, and the logo. Besides the logo, each screen has exactly one yellow thing.
- Yellow tint is an answer not yet shown.
- Ink is words, outlines and shadows, and anything done, such as a passed card or a gain in mastery.
- Muted grey is labels and the row of places above a page, and a card that is retrying.
- Line grey is dividers, and a card not yet seen.
- Red is something that went wrong or was a struggle, such as a failed card, an Again or a Hard rating, or a drop in mastery. Red means nothing else.
- The ground color and white are the page and the cards on it.

We will draw everything a user can open or act on, such as a deck, a practice or an answer, as a white card with rounded corners, a thin ink outline and a short solid ink shadow, so that what can be tapped looks like a thing.

## Alternatives considered

### A white sheet with yellow highlighter swipes and pen marks

Rejected because its rows read as text until a user learns they are links.

### An index card with two faces

Rejected because it draws the two-sided flashcard that Flashy's cards, with their many fields, replace.

### Thin lines only

Rejected because it is one step from the screens as they are, where what can be tapped looks like text.

### Bright purple, yellow, mint and peach together

Rejected because many bright colors draw the eye everywhere and mean nothing in particular.

### Thick purple outlines

Rejected because it reads as a common template rather than as Flashy.

### Outlined cards in purple, with green, coral and orange for outcomes

Rejected because the outcome colors read as a traffic light set against the page.

### Raised panels drawn like keys

Rejected because panels that cannot be tapped look as if they can.

### Retrying in yellow, orange, blue or a hatched pattern

Rejected because yellow already means the main action, and each of the others adds a color for a single meaning.

### Hard in ink, like the other passing ratings

Rejected because a pass with a struggle is not the same as Good.

## Consequences

**Positive**

- The user finds the main action on any screen by its yellow.
- The user reads red as something that went wrong or was a struggle wherever it appears, in a practice, beside a failed save or in the connection banner.
- The user tells what they can tap from what they can only read by its outline and shadow.

**Negative**

- The user finds one act on a screen marked as the main one, even where two acts weigh the same to them.
- The user meets the same red for a failure and for a struggle, and tells them apart by what the red sits on.

**Neutral**

- The user sees a Hard rating in red although it passes the card.
- The user sees a retrying card in the same grey as a label.
