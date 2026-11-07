# PDR 015: Colors that each mean one thing

## Status

Active

## Context

Flashy is for anyone memorizing anything: adults preparing for a certification, students, people learning a language, hobbyists and trivia players.

Most screens offer several acts, and one of them is what a user on that screen most often came to do, such as starting the practice on a practice's own page. On a screen that lists things, such as Your library or the Practice page, the acts often weigh alike.

A practice puts a card and its answers through states the user reads as they go. PDR 009 keeps every answer hidden until one action shows them all, and has the user rate each answer Again, Hard, Good or Easy. Hard, Good and Easy pass a card and Again fails it, so a card can pass with a struggle. A card in a practice is passed, failed, retrying or not yet seen, and the practice raises or lowers its mastery.

A practice can leave a card's mastery where it was, and an attempt can leave a field of a card neither shown nor asked.

Things also go wrong outside a practice. PDR 002 meets every failure where it happened: a save that fails says so beside its control, a sentence takes the place of content that will not load or of a thing that is gone, and one banner at the top of every page says when the connection is lost.

A color that carries a meaning draws the eye wherever it appears. A user who meets one color in two meanings cannot tell from the color which is meant.

More colors can mark more states, but each one added is another meaning for the user to learn, and a screen of many colors draws the eye to many places at once.

The app is named Flashy.

## Decision

We will give the app eight colors, and each color one meaning, the same on every screen:

- Yellow is the main action, the one thing a screen is for. A screen usually has one, shown in yellow; a screen whose acts weigh alike may have none. Besides the logo, which is also yellow, no screen has more than one yellow thing.
- Yellow tint is what is hidden until the user shows it.
- Ink is what is said and what is done: words, outlines and shadows, and anything done.
- Muted grey is what stands aside: what names or places something, and what is neither done nor wrong.
- Line grey is what separates or has not happened.
- Red is something that went wrong or was a struggle. Red means nothing else.
- The ground color is the page, and white is what sits on it.

## Alternatives considered

### Bright purple, yellow, mint and peach together

Rejected because many bright colors draw the eye everywhere and mean nothing in particular.

### Purple, with green, coral and orange for outcomes

Rejected because the outcome colors read as a traffic light set against the page.

### Retrying in yellow, orange, blue or a hatched pattern

Rejected because yellow already means the main action, and each of the others adds a color for a single meaning.

### Hard in ink, like the other passing ratings

Rejected because a pass with a struggle is not the same as Good.

### Each color tied to the places it appears

Rejected because every new screen that shows a known state in a new place would need a new decision.

### Exactly one yellow thing on every screen

Rejected because a screen whose acts weigh alike, such as a list, would have one of them marked as the main one for the user.

## Consequences

**Positive**

- The user finds the main action on any screen that has one by its yellow.
- The user reads red as something that went wrong or was a struggle wherever it appears, in a practice, beside a failed save or in the connection banner.
- The user meets a new screen's states in the colors they already know.

**Negative**

- The user finds one act on a screen marked as the main one, even where another weighs nearly as much to them, and none marked on a screen whose acts weigh alike.
- The user meets the same red for a failure and for a struggle, and tells them apart by what the red sits on.

**Neutral**

- The user sees a Hard rating in red although it passes the card.
- The user sees a retrying card and a card whose mastery did not change in the same grey as a label.
