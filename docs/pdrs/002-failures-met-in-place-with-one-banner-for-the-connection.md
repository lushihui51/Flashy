# PDR 002: Failures met in place, with one banner for the connection

## Status

Superseded by PDR 031

## Context

A user is usually mid-task when something fails: a form is half filled, or they came to a page to read what it shows.

A failed save concerns one control on the page. Content that will not load, or a thing that is gone, concerns one place on the page. A lost connection, or a Flashy that cannot be reached or is having trouble, concerns every page at once.

A connection drops and returns without the user doing anything, and the user may go on reading the page in between.

A message shown over the page is seen wherever the user is looking, and leaves the page beneath it as it was. A message shown in place sits beside what it is about, takes that thing's room, and is seen only when the user looks there.

The vocabulary reference, docs/vocabulary.md, gives the sentence for every failure: "Could not load this <thing>." and "Could not load <things>." for content that will not load, "<Thing> not found." for a thing that is gone, three sentences for the connection, and the sentences a failed save answers with. It does not say where a sentence is shown or what happens to the page around it.

## Decision

We will meet every failure where it happened, and nothing will pop up over the page.

When a save fails, its sentence appears beside the control that failed, what the user typed stays for them to try again, and the app never retries the save on its own.

When content will not load, a sentence saying so takes its place on the page, and when a thing is gone, a sentence saying so takes the thing's place.

When the connection is lost, or Flashy cannot be reached or is having trouble, one banner at the top of every page says so. The banner goes away by itself when the connection is back, and content that failed to load then loads again by itself.

## Alternatives considered

### A pop-up for every failure

Rejected because a pop-up vanishes in seconds, sits away from what failed, and piles up when several things fail.

### A whole-page error for any failure

Rejected because it takes the page away, and what the user typed with it.

### The banner for every failure, saves included

Rejected because it puts the message at the top of the page while the control that failed is elsewhere on it.

## Consequences

**Positive**

- The user finds a failure's sentence next to the thing that failed.
- The user keeps what they typed when a save fails, and tries again from where they were.
- The user sees the connection's state in one place on every page, and does nothing to clear it.
- The user who waited out a lost connection sees the content they were missing without acting.

**Negative**

- The user who is not looking at the place that failed is told nothing until they look there.

**Neutral**

- The user sees the connection banner on every page, including one with nothing on it that could fail.
