# PDR 031: Failures met in place, up to the whole page, with one banner for the connection

## Status

Active

## Context

A user is usually mid-task when something fails: a form is half filled, or they came to a page to read what it shows.

A failed save concerns one control on the page. Content that will not load, or a thing that is gone, concerns one place on the page. A lost connection, or a Flashy that cannot be reached or is having trouble, concerns every page at once.

A user reaches Flashy by mistyped and stale addresses, and an address that leads to no page concerns the whole page. A mistake in Flashy can stop a page partway through being drawn, and the app cannot tell which parts around such a mistake are still right, so that failure concerns the whole page too.

A connection drops and returns without the user doing anything, and the user may go on reading the page in between.

A message shown over the page is seen wherever the user is looking, and leaves the page beneath it as it was. A message shown in place sits beside what it is about, takes that thing's room, and is seen only when the user looks there.

The top bar and the menu are on every page, and the menu reaches every main place.

PDR 017 has the browser's back return the user to the page they came from, as they left it, and when a page was opened from a shared address, in a new tab or straight after logging in, there is no earlier page in Flashy to go back to.

PDR 001 lets only words the vocabulary gives appear on a screen. The vocabulary reference, docs/vocabulary.md, gives the sentence for every failure: "Could not load this <thing>." and "Could not load <things>." for content that will not load, "<Thing> not found." for a thing that is gone, three sentences for the connection, and the sentences a failed save answers with. It does not say where a sentence is shown or what happens to the page around it.

Today a wrong address and a page that breaks each show a bare screen outside Flashy's frame, in words the vocabulary does not give, with no menu.

PDR 002 met every failure where it happened, in one control, one place or one banner, named no page that cannot be shown, and rejected a whole-page error for any failure. This record replaces it to say what happens when the failure is the page itself, and restates the rest of it unchanged.

## Decision

We will meet every failure where it happened, and nothing will pop up over the page.

When a save fails, its sentence appears beside the control that failed, what the user typed stays for them to try again, and the app never retries the save on its own.

When content will not load, a sentence saying so takes its place on the page, and when a thing is gone, a sentence saying so takes the thing's place.

When the failure is the page itself, because its address leads to no page or because the page failed while it was being drawn, the sentence takes the place of the whole page's content, below the top bar, and the top bar, the menu and the connection banner stay. The user goes on from that page by the menu, or by the browser's back when they came from inside Flashy. The page is never drawn again on its own; the user who tries again reloads it in the browser.

When the connection is lost, or Flashy cannot be reached or is having trouble, one banner at the top of every page says so. The banner goes away by itself when the connection is back, and content that failed to load then loads again by itself.

## Alternatives considered

### A pop-up for every failure

Rejected because a pop-up vanishes in seconds, sits away from what failed, and piles up when several things fail.

### A whole-page error for a failure smaller than the page

Rejected because it takes the page away, and what the user typed with it.

### The banner for every failure, saves included

Rejected because it puts the message at the top of the page while the control that failed is elsewhere on it.

### Replacing only the part of a page that broke while being drawn

Rejected because the user can be left reading a page that is partly wrong without knowing it.

### A bare screen outside Flashy for a wrong address or a broken page

Rejected because it leaves the user outside Flashy, in words Flashy never uses, with no menu to go on by.

### A wrong address sent on to Home without a word

Rejected because it hides that the address was wrong.

### A way to Home on the page beside the sentence

Rejected because it adds a second way to Home beside the menu's and makes it the page's one main action.

### A sentence that says only that something went wrong

Rejected because it says nothing about what to do.

## Consequences

**Positive**

- The user finds a failure's sentence next to the thing that failed.
- The user keeps what they typed when a save fails, and tries again from where they were.
- The user who follows a wrong address or meets a page that broke stays inside Flashy, is told so in Flashy's words, and goes on by the menu.
- The user sees the connection's state in one place on every page, and does nothing to clear it.
- The user who waited out a lost connection sees the content they were missing without acting.

**Negative**

- The user who is not looking at the place that failed is told nothing until they look there.
- The user who meets a page that broke loses everything that page showed, and reloads it themselves to try again.

**Neutral**

- The user sees the connection banner on every page, including one with nothing on it that could fail.
- The user sees the same top bar and menu on a page that was not found or broke as on every other page.
