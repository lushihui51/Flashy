# ADR 124: Two URL parameters for a form's return addresses, and one function leaving every form by history

## Status

Active

## Context

A form has no row of places above it and backs out to what opened it, and on every other page the "<" does what the browser's back does (PDR 017). Every form backs out to the page that opened it, wherever it was opened from, and after Create a form lands on what it made.

A deck created from its own entry lands on its page the moment it exists, and one created from a picker inside another form brings the user back to that form with the new deck chosen (PDR 034).

The user who saves or backs out of a card's form opened from the run page returns to the run page as they left it (PDR 042). One opener can therefore need the user back after both outcomes, and another after one.

The frontend routes with a data router, under which every navigation gets a fresh history entry, and `<ScrollRestoration>` keys a scroll position by entry (ADR 089). Router state belongs to one entry and is not part of a location the way `pathname` and `search` are, so a page cannot see the state the page above it carried and cannot forward it.

Every read of a page's URL search params goes through one hook, and `internalReturnTo` in `frontend/src/lib/returnTo.ts` takes the hook's params (ADR 097).

The "<" shows exactly when the router's position in the browser's history is above 0, read by one function, `hasEarlierPage()`, and tapping it presses the browser's back (ADR 099).

A URL parameter is editable by the user, and a string that is not an app path, passed to `navigate()`, lands the user on a page the router cannot match.

A form that leaves by pushing a new entry leaves itself in the history, so the "<" afterwards opens the form again.

ADR 103 gave Cancel and Create or Save an address each, and rejected Cancel through the browser's history because a pasted link's Cancel would land on Your library and a save would land on the just-submitted form. Stepping back to the opener and replacing that entry with the address avoids both, so this record restates ADR 103 with every form leaving through the history.

## Decision

We will carry a form's two return addresses as URL query parameters, never router state: `cancelTo`, the page Cancel returns to, and `returnTo`, the page Create or Save returns to. Each value is the `pathname + search` of the page to return to, built with `URLSearchParams.set`, so a nested value encodes and decodes correctly with no special-casing: each hop hands over its own full location, and an inherited address rides along inside that location's search.

With no `cancelTo`, Cancel returns to the list the thing belongs to on a create form and to the thing's own page on an edit form. With no `returnTo`, Create lands on the created thing's own page and Save on the edited thing's page. Neither parameter falls back to the other, and Cancel reads `returnTo` nowhere.

An opener that needs the user back after both outcomes passes both parameters with its own address; one that wants only Cancel back passes `cancelTo` alone.

Every reader of either parameter goes through one guard, `internalReturnTo` in `frontend/src/lib/returnTo.ts`, which returns the value only when it starts with `/` and not with `//`, and `null` otherwise, since a parameter is user-editable and cannot be trusted as an app-internal path without the check.

One-shot arrival results stay in router state: they are consumed once, on arrival, by the page that asked, and never forwarded. The URL carries an address that must survive being forwarded; router state carries a result consumed once on arrival.

Back and the breadcrumb read neither parameter.

We will have every form leave through `leaveForm(target, state?)` in `frontend/src/lib/`, called by Cancel, Create and Save with the address chosen above. When `hasEarlierPage()` holds, it steps back one entry to the form's opener, then replaces that entry with `target` and `state` when its address differs from `target` or an arrival result is to be delivered. Otherwise it replaces the form's own entry with `target`.

## Alternatives considered

### Leaving by a new entry

Rejected because the form stays in the history, and the "<" afterwards opens it again.

### Leaving by replace, with the "<" stepping back two

Rejected because the browser's back and the "<" would disagree.

### Leaving by replace alone

Rejected because the "<" afterwards lands on the same page.

### `returnTo` alone

Rejected because Create cannot tell a picker, which wants the new thing back, from a page, which does not, without a second signal.

### A flag in router state saying not to return the result

Rejected because a refresh drops it.

### `returnTo` renamed `createTo`

Rejected because it misnames an edit form's return.

### Create ignoring `returnTo`

Rejected because it breaks the picker round trip.

### A third address for Back or the breadcrumb

Rejected because the browser's history and the row of places already hold them.

### The addresses in router state

Rejected because a page cannot see the state the page above it carried, so a nested round trip drops the address at the second hop.

### The parameters trusted without the guard

Rejected because they are user-editable, and an arbitrary string lands the user on a page the router cannot match.

## Consequences

**Positive**

- The user who opens a form from any page returns there on Cancel and lands on the new thing on Create.
- The user who opens a form from a picker, or a card's form from the run page, comes back to where they were whether they save or back out.
- The user's "<" after leaving a form goes past it, and the opener returns scrolled as they left it.
- The developer adds a round trip by passing one or two addresses, and answers "is this safe to navigate to" once, in the guard.
- The user's URL fully describes where Cancel and Create or Save will land, and both addresses survive a refresh.

**Negative**

- The user sees two addresses in a form's URL, less readable than one.
- The developer who passes `returnTo` alone, expecting Cancel to follow it, sends Cancel to the default with no error.
- The developer who navigates away from a form without `leaveForm` leaves the form in the history, with no error.

**Neutral**

- The developer finds every opener that needs both outcomes back passing the same address twice.
- The developer finds a form's exit making two navigations when it has an opener to step back to.
