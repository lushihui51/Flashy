# PDR 032: Cancel and Create or Save in a bar at the foot of every form

## Status

Superseded by PDR 051

## Context

The app is used on phones held upright. A phone held in one hand is reached by the thumb, which rests near the foot of the screen and stretches to the top.

A form is where the user makes or changes a thing: New practice, New subject, Edit subject, New deck, Edit deck, New card, Edit card, New configuration and Edit configuration. Every form has a way to back out, Cancel, and a way to finish, Create or Save.

PDR 017 gives a form no row of places and has it back out to what opened it, so a form's own controls are the user's only way off it.

PDR 014 gives a configuration's form two acts, to save and to back out, and never a delete.

PDR 018 lets a user make a subject from a picker inside the deck form, which opens New subject over that form. One form can be opened from its own entry or over another form, and holds the same words either way.

Today Cancel, the page's name and Create or Save share one row under the top bar, which holds the name in the width the two buttons leave and draws Cancel as a plain word. The row keeps Create or Save clear of a phone's keyboard and keeps the page's name in view while the user scrolls.

A bar at the foot of the screen takes a little more of a phone's screen than the row under the top bar.

Whether a bar at the foot stays clear of a phone's keyboard while the user types is not yet known.

A heading at the top of the page that scrolls with it reads as the page's own, and leaves the screen as the user scrolls. A heading held in a row under the top bar stays in view.

The subject, deck and card forms ask before discarding unsaved changes. New practice asks nothing before leaving.

## Decision

We will put Cancel and Create or Save in a bar at the foot of the screen on every form. The bar stays at the foot while the page scrolls.

We will give every form the same bar however it was opened, from its own entry or over another form.

We will put a form's heading at the top of the page, where it scrolls with the page.

## Alternatives considered

### The row under the top bar, on every form

Rejected because it crowds the page's name between two buttons and sits furthest from the thumb.

### A bar at the foot on New practice alone

Rejected because Create would then sit at the foot on one form and at the top on the others.

### The row under the top bar on New subject when it opens over the deck form

Rejected because one form would differ by where it was opened, which tells the user nothing useful.

## Consequences

**Positive**

- The user finds Cancel and Create or Save under the thumb, in one place on every form, however the form was opened.
- The user reads a form's heading as the page's own, with nothing beside it.

**Negative**

- The user loses the heading from view once they scroll.
- The user gives up a little more of a phone's screen to the bar than the row took.
- The user who reaches for Create or Save can tap Cancel beside it, and on New practice, which asks nothing before leaving, loses what they chose.

**Neutral**
