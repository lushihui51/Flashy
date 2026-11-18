# PDR 064: Places above a page, and the browser's back

## Status

Active

## Context

Most pages belong to a place, and that place may itself belong to another, up to a main place. PDR 033 gives a deck nothing above it, so a deck's page belongs to Your library alone. PDR 035 gives every run to one practice, so a run's page belongs to its practice, and a practice's page belongs to All practices.

Some pages belong to no place. Home, Your library and All practices are the main places. PDR 059 and PDR 062 give a page saying what Flashy is and a page saying what Flashy keeps about a person, which anyone reaches from every page.

A page is reached by more than one path. Home opens a run without passing its practice's page.

The user leaves a page in one of two ways: to a place the page belongs to, or back to the page they came from. The two lead to the same page only when the user came from the page's own place.

A page shows one of its views at a time: an open tab, its filters, and a place down its list.

A row that names where a page sits reads the same however the page was reached, and reads the same for anyone the page's address is shared with. A row that names the path taken brings the user back exactly where they were, and differs by path.

A person uses Flashy in a phone's browser, from a home-screen icon that opens it with no browser bar, or on a wide screen. The browser's back, and a phone's own back where it has one, returns the user to the page they came from, as they left it. Flashy opened from a home-screen icon on an iPhone shows no back.

When a page was opened from a shared address, in a new tab or straight after logging in, there is no earlier page in Flashy, and the browser's back leaves Flashy.

The "<" leading the row above a page does what the browser's back does.

PDR 051 gives every form a bar at its foot with its own way off the form. PDR 034 brings a user who made a deck from a picker inside a form back to that form. So a form's way back is set by what opened it, not by where it sits.

PDR 017 put the row above every page but the main places and a form, and led it with a "<" that went back whenever there was an earlier page in Flashy. This record replaces PDR 017 to take the "<" away, as it repeats the browser's back, and to leave a page that belongs to no place without a row, and restates the rest unchanged.

## Decision

We will put one row above the heading of every page that belongs to a place, and none above a page that belongs to no place. The row holds only the places the page belongs to, from the widest inward, each as a link to that place.

We will have the row's places be the same however the page was reached. They say where the page sits, never where the user came from.

We will give no page but a form a way back of its own, in its row or anywhere else. The user goes back to the page they came from with the browser's or the phone's back, and we will have it return them to the view they left, its open tab and filters included.

We will give a form no row, whatever it belongs to: a form backs out to what opened it.

## Alternatives considered

### A "<" leading the row whenever there is an earlier page in Flashy

Rejected because it repeats the browser's back.

### A "<" only when Flashy is opened from a home-screen icon

Rejected because the top of a page would then differ by how Flashy was opened.

### A "<" only on the pages reached from every page

Rejected because the "<" would then show on some pages and not others.

### A row that remembers the path taken

Rejected because it shows the same page with different rows, and puts that history into a shared address.

### No row

Rejected because the user would not see where a page sits, and would reach a run's practice only by way of All practices.

### A row on every page, forms and pages that belong to no place included

Rejected because a row on a page that belongs to no place would hold nothing, and a form already backs out.

## Consequences

**Positive**

- The user reads at the top of a page only where it sits, the same on every visit.
- The user who shares a page's address shares a row of places that reads the same for whoever opens it.
- The user goes back in Flashy as on any other site, with the browser's or the phone's own back.

**Negative**

- The user who opens Flashy from a home-screen icon on a phone that shows no back has no way back to the page they came from, and leaves a page by its row's places or the menu.
- The user who reaches a page by a shortcut sees a row naming places they never visited.

**Neutral**

- The user leaves a page that belongs to no place by the menu or the browser's back.
