# ADR 103: Two URL parameters, `cancelTo` and `returnTo`, for a form's return addresses

## Status

Superseded by ADR 124

## Context

A form has no row of places above it and backs out to what opened it, and on every other page the "<" does what the browser's back does (PDR 017).

A subject or deck created from its own entry lands on its own page the moment it exists, and one created from a picker inside another form brings the user back to that form with the new thing chosen (PDR 018).

The user who saves or backs out of a card's form opened from the run page returns to the run page as they left it (PDR 019). One opener can therefore need the user back after both outcomes, and another after one.

The frontend routes with a data router, under which every navigation gets a fresh history entry (ADR 089). Router state belongs to one entry and is not part of a location the way `pathname` and `search` are, so a page cannot see the state the page above it carried and cannot forward it.

Every read of a page's URL search params goes through one hook, and `internalReturnTo` in `frontend/src/lib/returnTo.ts` takes the hook's params (ADR 097).

The "<" shows exactly when the router's position in the browser's history is above 0, and tapping it presses the browser's back (ADR 099).

`DeckEditor` in `frontend/src/components/library/DeckEditor.tsx` reads one `returnTo` and sends both Cancel and Create to it. `SubjectDetailPage` in `frontend/src/pages/SubjectDetailPage.tsx` opens it with the subject in router state and no `returnTo`, so Cancel from a subject's page lands on Your library; passing the subject's page as `returnTo` would send the new deck there too, against PDR 018.

The pickers on New card, New practice and the configuration editor pass `returnTo` and need the user back after Cancel and after Create alike. The card form opened from the run page needs the same after Cancel and after Save.

A URL parameter is editable by the user, and a string that is not an app path, passed to `navigate()`, lands the user on a page the router cannot match.

ADR 024 carried one `returnTo` as a URL parameter, after router state dropped the address at the second hop of a nested round trip, read it only through `internalReturnTo`, and kept one-shot arrival results in router state. It gave Cancel and Save one address, so an opener could not ask for Cancel back without taking Create back too. This record keeps the URL, the guard and the router-state rule, and gives Cancel an address of its own.

## Decision

We will carry a form's two return addresses as URL query parameters, never router state: `cancelTo`, the page Cancel returns to, and `returnTo`, the page Create or Save returns to. Each value is the `pathname + search` of the page to return to, built with `URLSearchParams.set`, so a nested value encodes and decodes correctly with no special-casing: each hop hands over its own full location, and an inherited address rides along inside that location's search.

With no `cancelTo`, Cancel returns to the list the thing belongs to on a create form and to the thing's own page on an edit form. With no `returnTo`, Create lands on the created thing's own page and Save on the edited thing's page. Neither parameter falls back to the other, and Cancel reads `returnTo` nowhere.

An opener that needs the user back after both outcomes passes both parameters with its own address; one that wants only Cancel back passes `cancelTo` alone.

Every reader of either parameter goes through one guard, `internalReturnTo` in `frontend/src/lib/returnTo.ts`, which returns the value only when it starts with `/` and not with `//`, and `null` otherwise, since a parameter is user-editable and cannot be trusted as an app-internal path without the check.

One-shot arrival results stay in router state: they are consumed once, on arrival, by the page that asked, and never forwarded. The URL carries an address that must survive being forwarded; router state carries a result consumed once on arrival.

Back and the breadcrumb read neither parameter.

## Alternatives considered

### `returnTo` alone

Rejected because Create cannot tell a picker, which wants the new thing back, from a page, which does not, without a second signal.

### A flag in router state saying not to return the result

Rejected because a refresh drops it.

### `returnTo` renamed `createTo`

Rejected because it misnames an edit form's return.

### Cancel through the browser's history

Rejected because it lands a pasted link's Cancel on Your library, and after a save it would land on the just-submitted form.

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

- The user who opens a create form from the page of the thing it will belong to returns there on Cancel and lands on the new thing on Create.
- The user who opens a form from a picker, or a card's form from the run page, comes back to where they were whether they save or back out.
- The developer adds a round trip by passing one or two addresses, with nothing to thread by hand, and answers "is this safe to navigate to" once, in the guard.
- The user's URL fully describes where Cancel and Create or Save will land, and both addresses survive a refresh.

**Negative**

- The user sees two addresses in a form's URL, less readable than one.
- The developer who passes `returnTo` alone, expecting Cancel to follow it, sends Cancel to the default with no error.
- The developer unaware of this record can still reintroduce a state-based sender; this record and AGENTS.md are the guardrails, not a structural one.

**Neutral**

- The developer finds every opener that needs both outcomes back passing the same address twice.
