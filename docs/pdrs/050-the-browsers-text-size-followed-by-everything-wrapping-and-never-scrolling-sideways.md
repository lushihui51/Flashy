# PDR 050: The browser's text size followed by everything, wrapping and never scrolling sideways

## Status

Active

## Context

A user reads every screen of Flashy, and some users need larger text than the app's own size to read it comfortably.

A browser lets its user set a default text size once, for every site they visit. A browser also lets its user zoom a page, which enlarges everything on it and narrows the room the page has, as if the screen were smaller.

PDR 036 stacks a card's two zones on a tall screen and sets them side by side on a wide one, so a screen's layout follows its width. A page zoomed far enough on a desktop takes the layout of a phone.

PDR 020 draws everything a user can open or act on as a white block with an outline and a shadow, so a word that can be tapped sits inside a block drawn around it. A block drawn for one size of text holds a longer label only if it grows with the text.

Larger text takes more room, so a screen holds fewer rows of it, and a row holds fewer words across.

Today, at the largest text size on a phone, the top bar's "Log in", the Practice page's "Completed" tab and a deck's "Add configuration" run past the edge of the screen, and the whole page scrolls sideways. A deck's heading breaks inside a word, the Practice page's filters cut their words short, and a row's title is shortened to a few characters, so several rows look alike.

What lies past the edge of a screen stays unseen until the user swipes to it.

A long name given every line it needs makes its row tower over the rows around it.

PDR 030 had everything grow with the browser's text size, and did not say what happens when a row no longer fits. This record replaces PDR 030 to say so, and restates the rest unchanged.

## Decision

We will have Flashy follow the text size the user has set in their browser. Everything on a screen grows together with it: the words, the blocks around them, the rows and the buttons.

When what a row holds is wider than the screen, the row wraps it onto further lines, and nothing on a page scrolls sideways. A name or a heading breaks only between words.

We will shorten a name only in a list, once it has wrapped, and never on its own page.

## Alternatives considered

### The browser's text size followed by the words only

Rejected because a longer label spills out of a block drawn for smaller text.

### The browser's text size ignored

Rejected because it sends the user who needs larger text to the browser's zoom, which narrows the page and can tip a desktop into the phone layout.

### Some text following the browser's size and some not

Rejected because one screen shows two sizes of text with no reason for the difference.

### Each row scrolling sideways on its own

Rejected because what is past the edge stays unseen until the user swipes.

### Shrinking what a row holds to fit

Rejected because it undoes the text size the user chose.

### Never shortening a name in a list

Rejected because one long name makes its row tower over the list.

## Consequences

**Positive**

- The user who needs larger text sets it once, in their browser, and meets the whole app at that size.
- The user reads one size of text on a screen, and every block holds its words at that size.
- The user finds every control on screen at any text size, with nothing to swipe to.
- The user reads every name whole on its own page.

**Negative**

- The user who has set larger text sees fewer rows on each screen.
- The user who has set larger text reads a long name in a list only in part.

**Neutral**

- The user who has set larger text sees rows grow taller as their contents wrap.
