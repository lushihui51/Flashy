# ADR 132: One viewer hook, and a reload between viewers

## Status

Active

## Context

PDR 053 shows a visitor who is not logged in, a guest, the example library on every page, and lands every log-in and every log-out on Home. PDR 058 changes what a guest's pages show: every form greyed, and a dimmed screen at every press that would change something.

The server answers a request with no `Authorization` header as the example user, with a 200, and a guest's reads and a user's own go through the same routes (ADR 131).

`client.ts` adds a token only when Clerk's session exists and gives one, and pages fetch on mount, before Clerk has loaded.

The frontend takes its sign-in state from Clerk's hooks (ADR 007). Clerk's `useUser` says whether Clerk has loaded and whether a session exists.

Server data lives in the query cache, keyed by resource and not by user (ADR 088).

`AuthSlot` opens Clerk's dialog to log in and `AccountSheet` calls Clerk's sign-out, and nothing in the app reacts to either. The app does not control how Clerk moves the browser after its dialog.

A fresh load of the app in the browser empties the query cache, every component's state and every request in flight.

The health probe sends no Clerk token, so that a Clerk failure cannot register as a probe failure (ADR 130).

A request that got no response reads in the frontend as a lost connection (ADR 065).

A browser check runs signed out of Clerk, under the backend's local bypass, which answers every request as its user (ADR 131).

## Decision

We will define a guest as a visitor for whom Clerk has loaded and holds no session, and say so in one place: `useViewer()` in `frontend/src/lib/viewer.ts`, which answers `loading`, `guest` or `user` from Clerk's `useUser`. `AppShell` draws the page only once the answer is not `loading`.

We will have `client.ts` send a request with no token only when Clerk has loaded and holds no session. It waits for Clerk to load before every request but the health probe, and fails a request whose session gives no token as a lost connection. A test of the client asserts that no request leaves before Clerk has loaded, and none without a token while a session exists.

In development, `VITE_DEV_AUTH` makes `useViewer()` answer `user`, to match the backend's bypass.

When `useViewer()`'s answer changes between `guest` and `user`, `AppShell` stops drawing the page and loads Home afresh in the browser, replacing the current address, through one function in `frontend/src/lib/viewer.ts`. Nothing else reacts to a log-in or a log-out. We will give `ClerkProvider` Home as the address after signing in, signing up and signing out.

## Alternatives considered

### A request sent before Clerk has loaded

Rejected because a logged-in user's first reads would come back as the example library and be shown as their own.

### The server saying who it answered as, in a read of its own

Rejected because a page's read could still be answered as the example user while that read says user, and every page would wait on one more request.

### Each response naming who it was answered as, kept in a store

Rejected because it would hold server state outside the query cache.

### Each page reading Clerk's `useUser` itself

Rejected because the loading state and the development switch would be written in every page.

### No development switch

Rejected because a browser check under the bypass would show a guest's screens over its user's data, and could press nothing that writes.

### The query cache emptied and the router sent to Home, with no load

Rejected because anything else holding the last viewer's data, a component's state, a request still in flight or a store added later, would survive unless someone remembered it.

### The viewer in every query's key

Rejected because a query added later without it would mix the two libraries with nothing failing.

### Every query refetched in place

Rejected because the last viewer's data would stay on screen until each answer returned, and stay for good where a refetch failed.

### Clerk's own redirect alone

Rejected because the app does not control how Clerk moves the browser after its dialog, and a move the router does not see would leave the old page drawn at the new address.

## Consequences

**Positive**

- The logged-in user is never shown the example library as their own, and nothing of theirs stays in memory after they log out.
- The developer's page sees a guest or a user, never an unknown.
- The developer who later adds anything that holds a viewer's data in memory has it emptied at every log-in and log-out with no further work.

**Negative**

- The user sees no page until Clerk has loaded, and if Clerk never loads, sees the shell with no page, where before the page drew and its reads failed.
- The user waits through one fresh load of the app at every log-in and log-out.
- The user who presses back after logging in from one of the example library's pages opens that page's address in their account, which reads not found.
- The developer running a browser check as a user sets `VITE_DEV_AUTH` beside the backend's two variables.

**Neutral**
