# PDR 017: A row of the places above a page, led by a way back

## Status

Active

## Context

Every page other than the main places belongs to a place, and that place may itself belong to another, until a main place.

A page is reached by more than one path. The library's Decks tab lists every deck across subjects, so a deck's page is often reached without passing its subject.

The user leaves a page in one of two ways: to a place the page belongs to, or back to the page they came from. The two lead to the same page only when the user came from the page's own place.

A page shows one of its views at a time: the library an open tab and its filters, Practice a status tab and its filters, and any list a place down it.

A row that names where a page sits reads the same however the page was reached, and reads the same for anyone the page's address is shared with. A row that names the path taken brings the user back exactly where they were, and differs by path.

The browser's back returns the user to the page they came from, as they left it. A phone may show no back button. When a page was opened from a shared address, in a new tab or straight after logging in, the browser's back leaves Flashy.

The row above a page already starts with a "<" in front of its first place, and the "<" does nothing when tapped.

A thing's address reads from the widest place inward on every screen, and a form has a control that backs out of it. PDR 004 returns the user who made a thing from a picker inside a form to that form, so a form's way back is set by what opened it, not by where it sits.

## Decision

We will put one row above the heading of every page other than the main places. The row lists the places the page belongs to, from the widest inward, each as a link to that place.

We will have the row's places be the same however the page was reached. They say where the page sits, never where the user came from.

We will lead the row with a "<" that goes back: tapping it does what the browser's back does, returning the user to the page they came from as they left it, its open tab, filters and place in the list included. When there is no earlier page in Flashy to go back to, the row shows no "<", only its places.

We will have browser back return the user to the view they left, open tab and filters included.

We will give the main places no such row, and a form no such row either: a form backs out to what opened it.

## Alternatives considered

### A row that remembers the path taken

Rejected because it shows the same page with different rows, and puts that history into a shared address.

### No row, leaving the user to the browser's back and the menu

Rejected because it left a practice's page with no way to the Practice page but deleting the practice or starting it.

### A row on every page, main places and forms included

Rejected because a main place's row would point at nothing, and a form already backs out.

### Going back left to the browser alone

Rejected because the "<" looks as if it goes back and does not, and a phone may show no back button.

### A back button apart from the row

Rejected because it adds a second control for going back beside a "<" that already looks like one.

### A "<" that always does what the browser's back does

Rejected because, with no earlier page in Flashy, it takes the user out of the app.

### A "<" that goes to the nearest place when there is no earlier page

Rejected because the "<" would then go to a place the page belongs to on some visits and back on others.

## Consequences

**Positive**

- The user steps back through Flashy from the row, without the browser's button, on a phone that shows none.
- The user who goes back finds the page they left as they left it, its tab, filters and place in the list included.
- The user has two ways off every page other than the main places, each doing one job: the row's places lead to where the page belongs, and the "<" leads back to where the user came from.
- The user who shares a page's address shares a row of places that reads the same for whoever opens it.

**Negative**

- The user who reaches a page by a shortcut sees a row naming places they never visited.
- The user who opens a page from a shared address, in a new tab or straight after logging in finds no "<", and leaves by the row's places instead.

**Neutral**

- The user sees one page's row with a "<" on one visit and without it on another.
