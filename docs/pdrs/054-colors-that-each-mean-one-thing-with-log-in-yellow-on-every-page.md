# PDR 054: Colors that each mean one thing, with "Log in" yellow on every page

## Status

Active

## Context

Flashy is for anyone memorizing anything: adults preparing for a certification, students, people learning a language, hobbyists and trivia players.

Most screens offer several acts, and one of them is what a user on that screen most often came to do, such as starting a run on a practice's own page. On a screen that lists things, such as Your library or All practices, the acts often weigh alike.

A run puts a card and its answers through states the user reads as they go. PDR 055 keeps every answer hidden until one action shows them all, and has the user rate each answer on its own. A rating is Again, Hard, Good or Easy. Hard, Good and Easy pass a card and Again fails it, so a card can pass with a struggle. A card in a run is passed, failed, retrying or not yet seen, and the run raises or lowers its mastery.

A run can leave a card's mastery where it was, and an attempt can leave a field of a card neither shown nor asked.

Things also go wrong outside a run. PDR 031 meets every failure where it happened: a save that fails says so beside its control, a sentence takes the place of content that will not load or of a thing that is gone, and one banner at the top of every page says when the connection is lost.

A color that carries a meaning draws the eye wherever it appears. A user who meets one color in two meanings cannot tell from the color which is meant.

More colors can mark more states, but each one added is another meaning for the user to learn, and a screen of many colors draws the eye to many places at once.

The app is named Flashy.

PDR 053 shows a visitor who is not logged in every page of the app, filled from an example library, and keeps "Log in" in the top bar for the one who wants an account. Only a visitor who is not logged in sees "Log in". Today "Log in" is yellow.

PDR 015 gave the app these eight colors and their meanings, and let no screen show more than one yellow thing besides the logo. This record replaces PDR 015 to make "Log in" yellow on every page a visitor who is not logged in sees, and restates the rest unchanged.

## Decision

We will give the app eight colors, and each color one meaning, the same on every screen:

- Yellow is the main action, the one thing a screen is for. A screen usually has one, shown in yellow; a screen whose acts weigh alike may have none.
- Yellow tint is what is hidden until the user shows it.
- Ink is what is said and what is done: words, outlines and shadows, and anything done.
- Muted grey is what stands aside: what names or places something, and what is neither done nor wrong.
- Line grey is what separates or has not happened.
- Red is something that went wrong or was a struggle. Red means nothing else.
- The ground color is the page, and white is what sits on it.

We will make one thing yellow that is no screen's main action: "Log in", on every page a visitor who is not logged in sees.

Besides the logo, which is also yellow, and "Log in", no screen has more than one yellow thing.

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

### "Log in" in white

Rejected because it stands out less than yellow.

### "Log in" yellow only on pages with no main action of their own

Rejected because the same button would change color from page to page.

## Consequences

**Positive**

- The user who is logged in finds the main action on any screen that has one by its yellow.
- The user who is not logged in finds "Log in" as the brightest thing in the top bar on every page.
- The user reads red as something that went wrong or was a struggle wherever it appears, in a run, beside a failed save or in the connection banner.
- The user meets a new screen's states in the colors they already know.

**Negative**

- The user who is not logged in sees two yellow things on a page with a main action of its own, and tells the page's main action by where it sits.
- The user finds one act on a screen marked as the main one, even where another weighs nearly as much to them, and none marked on a screen whose acts weigh alike.
- The user meets the same red for a failure and for a struggle, and tells them apart by what the red sits on.

**Neutral**

- The user sees a Hard rating in red although it passes the card.
- The user sees a retrying card and a card whose mastery did not change in the same grey as a label.
