# PDR 030: The browser's text size followed by everything on every screen

## Status

Superseded by PDR 050

## Context

A user reads every screen of Flashy, and some users need larger text than the app's own size to read it comfortably.

A browser lets its user set a default text size once, for every site they visit. A browser also lets its user zoom a page, which enlarges everything on it and narrows the room the page has, as if the screen were smaller.

PDR 009 stacks a card's two zones on a tall screen and sets them side by side on a wide one, so a screen's layout follows its width. A page zoomed far enough on a desktop takes the layout of a phone.

PDR 020 draws everything a user can open or act on as a white block with an outline and a shadow, so a word that can be tapped sits inside a block drawn around it. A block drawn for one size of text holds a longer label only if it grows with the text.

Today some of Flashy's text follows the browser's setting and some does not, and the blocks around the text that grows do not grow with it.

Larger text takes more room, so a screen holds fewer rows of it.

## Decision

We will have Flashy follow the text size the user has set in their browser. Everything on a screen grows together with it: the words, the blocks around them, the rows and the buttons.

## Alternatives considered

### The browser's text size followed by the words only

Rejected because a longer label spills out of a block drawn for smaller text.

### The browser's text size ignored

Rejected because it sends the user who needs larger text to the browser's zoom, which narrows the page and can tip a desktop into the phone layout.

### Some text following the browser's size and some not

Rejected because one screen shows two sizes of text with no reason for the difference.

## Consequences

**Positive**

- The user who needs larger text sets it once, in their browser, and meets the whole app at that size.
- The user reads one size of text on a screen, and every block holds its words at that size.

**Negative**

- The user who has set larger text sees fewer rows on each screen.

**Neutral**

