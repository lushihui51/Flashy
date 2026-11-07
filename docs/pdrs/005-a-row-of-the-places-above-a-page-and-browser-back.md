# PDR 005: A row of the places above a page, and browser back

## Status

Superseded by PDR 017

## Context

Every page below the main places belongs to a place, and that place may itself belong to another, up to a main place.

A page is reached by more than one path. The library's Decks tab lists every deck across subjects, so a deck's page is often reached without passing its subject.

The user leaves a page upward, to the place it belongs to, or backward, to the view they came from. The two are the same only when the user came from the page's own place.

A main place shows one of its views at a time: the library an open tab and its filters, Practice a status tab and its filters.

A row that names where a page sits reads the same however the page was reached, and reads the same for anyone the page's address is shared with. A row that names the path taken brings the user back exactly where they were, and differs by path.

A thing's address reads from the widest place inward on every screen, and a form has a control that backs out of it.

PDR 004 returns the user who made a thing from a picker inside a form to that form, so a form's way back is set by what opened it, not by where it sits.

## Decision

We will put one row above the heading of every page below the main places. The row lists the places above the page, from the widest inward, each as a link.

We will have the row name the same places however the page was reached. It says where the page sits, never where the user came from.

We will have browser back return the user to the view they left, open tab and filters included.

We will give the main places no such row, and a form no such row either: a form backs out to what opened it.

## Alternatives considered

### A row that remembers the path taken

Rejected because it shows the same page with different rows, and puts that history into a shared address.

### No row, leaving the user to the browser's back and the menu

Rejected because it left a practice's page with no way up but deleting the practice or starting it.

### A row on every page, main places and forms included

Rejected because a main place's row would point at nothing, and a form already backs out.

## Consequences

**Positive**

- The user has one way up and one way back from every page, each doing one job.
- The user who returns to a main place finds the tab and the filters they left.
- The user who shares a page's address shares a row that reads the same for whoever opens it.

**Negative**

- The user who reaches a page by a shortcut sees a row naming places they never visited.

**Neutral**
