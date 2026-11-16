# PDR 058: A dimmed screen that tells a guest to log in

## Status

Active

## Context

PDR 053 shows a visitor who is not logged in one example library to look through, and lets them change nothing: whatever would make, change or delete something, or rate a card, tells them to log in instead. This record calls such a visitor a guest.

PDR 053 keeps "Log in" in the top bar of every page a guest sees, and tells them in a banner above it that what they see is an example and that logging in opens all of Flashy. PDR 054 makes "Log in" yellow on every one of those pages.

Most guests come to look.

What would change something sits on many surfaces: the buttons that start, start again or end a run, a card's ratings, and every form. Most acts that change something begin by opening a form.

PDR 051 puts Done alone at the foot of a form that only shows what cannot be changed. A deck's board already reads that way while its practice has an active run, greyed, with Done alone.

PDR 055 has the user show a card's answers in one action and rate each answer on its own, then move on to the next card. The user rates an answer by pressing "Rate" and choosing one of four ratings from its list. Showing a card's answers changes nothing.

While a picker's list or a rating's list is open, the page behind it is dimmed, and a tap on the dimmed page closes the list and acts on nothing.

PDR 031 meets every failure where it happened and lets nothing pop up over the page. A message that pops up sits away from what was pressed and is gone in seconds.

"Log in" opens a dialog that asks for an email.

A sentence shown at a control sits beside what was pressed, in a different place on every surface. A sentence shown in one place is found there every time, away from the control that was pressed.

The connection banner's words are white on red, and a guest's banner's are white on ink. Small white words set straight on a dimmed page that shows through stand at about 3.5 to 1 against it, less than small text needs.

## Decision

We will let a guest open and read everything that only shows something. Every form opens for a guest, with what it holds greyed and unchangeable and Done alone at its foot.

We will give every press of a guest that would change the example library one answer, a press on a greyed form's input included: the whole screen dims but for "Log in", and a sentence in white beneath "Log in" tells them to log in. A tap anywhere else brings the screen back as it was, and nothing has changed.

We will let a guest open an answer's "Rate" list on a run's card and read its ratings. Choosing one dims the screen.

## Alternatives considered

### A sentence at each control

Rejected because it would show in a different place on every surface, and every new control would need a place of its own.

### "Log in" as the only thing that can be pressed once the screen has dimmed

Rejected because a guest who pressed out of curiosity would be shut out of the example until they logged in or loaded the page again.

### The controls greyed, with the reason in the banner alone

Rejected because the reason would sit a screen away, and the app would look switched off.

### The press opening the log-in dialog

Rejected because the guest would be asked for an email with no word of why.

### A message that pops up

Rejected because it would sit away from what was pressed and be gone in seconds.

### The sentence on an ink block

Rejected because the owner wants the words white straight against the dimmed screen.

### No form opening for a guest

Rejected because every way to start or change a thing would answer with the same sentence, and the guest would never see how a thing is made.

### Forms that work until Create, Save or Delete

Rejected because the guest would learn after typing that none of it is kept.

### Only the form of a thing that exists opening

Rejected because the same kind of press would then do two different things.

### "Rate" itself dimming the screen

Rejected because the guest would never read the four ratings.

### Ratings a guest can choose, with the move to the next card dimming the screen

Rejected because the guest would learn after choosing that it does not count.

## Consequences

**Positive**

- The user who is not logged in meets one answer to every press that would change something, at the thing to press next.
- The user who is not logged in sees what making each thing asks of them, and types nothing that could be lost.
- The user who is not logged in reads everything practicing a card asks of them, up to the choice of a rating.

**Negative**

- The user who is not logged in taps once more to get back to the page.
- The user who is not logged in reads the reason at the top of the screen, away from the control they pressed.
- The user who is not logged in reads the sentence as small white words over a dimmed page that shows through, at about 3.5 to 1, less than small text needs.
- The user who is not logged in cannot try moving a field on a board.
- The user who is not logged in never sees a rated answer, or the card after.

**Neutral**

- The user who is not logged in meets an empty, greyed form wherever they start a new thing.
- The user who is not logged in finds no sentence of its own on a form.
- The user who is not logged in reads the same words twice once the screen has dimmed, in the banner and beneath "Log in".
