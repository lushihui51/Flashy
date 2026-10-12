# ADR 062: Connectivity is the one app-level error banner

## Status

Accepted. Amends ADR 035: connectivity is its one global error channel; every other error still renders inline at its call site. Implemented by task 020.

## Context

On 2026-09-29 the app was found to freeze, rather than say anything, when the browser was offline or the server or database was down.

- **Offline:** TanStack Query's default `networkMode: 'online'` pauses every query and mutation while the browser reports offline, so none of them ever fails. The inline banners ADR 035 prescribes never render, a page shows nothing, and a Save button stays pending.
- **Server down:** a request retries three times before failing. It then surfaces as the browser's raw `TypeError` text, as "not found", or, behind Vite's dev proxy, as a successful `undefined` (ADR 065).

ADR 035 rules out any global error channel, but it anticipated this: "A genuinely global failure mode … has no channel today and will force its own decision." Connectivity is that mode. It is ambient state rather than the failure of one control, and when the browser is offline it is a state no call site ever observes.

What the browser can observe bounds what can be reported:

- **The `offline` event** fires when the device loses every network interface. It does not fire for a captive portal, or for a connected router with no internet.
- **A request that gets no response** rejects with the same `TypeError` whether DNS failed, the connection was refused, or CORS stripped the response. So "your internet is down" and "our server is down" cannot be told apart from inside the page.
- **A request that gets a response** carries a status.
- **The frontend host being unreachable** is outside the app's reach. At page load no app code runs. After load nothing more is fetched from it, since the bundle has no code-splitting. In development Vite hosts the `/api` proxy, so a stopped Vite reads as a stopped backend.
- **Clerk down while the API is up** is a narrow third-party case that the avatar placeholder in `AuthSlot` already signals.

## Decision

The app reports three situations: the browser is offline, the server is unreachable (gateway errors and hung requests included), and the database is unavailable. It does not report the frontend host being unreachable, or a Clerk outage while the API is up.

One banner, `ConnectionBanner`, rendered by `AppShell` as the first child of its sticky header, is the app's only global error channel. It shows nothing while the connection is healthy, and otherwise one of three states:

- **Offline:** `onlineManager` reports the browser offline.
- **Can't connect:** the health probe (ADR 063) got no response or timed out. The copy asks the user to check their connection.
- **Server trouble:** the probe got any HTTP error response. That can be:
  - a `503` from the health endpoint when the database is down (ADR 064)
  - a gateway's `502`, `503` or `504`
  - a `4xx`, which the endpoint never returns itself and which only a misrouted or stale deployment or a gateway produces

  In every one of these cases the user's connection works.

A database outage shares the server-trouble message, and the copy never says "database". Every message says the app is retrying on its own. The banner has no dismiss control; it clears when the condition does. The wording lives in task 020's Contracts.

Everything else stays as ADR 035 decided. Pages and forms render their own failures inline, beneath the banner when both apply, and ADR 065 makes those messages truthful. There is still no toast, no `QueryCache`/`MutationCache` handler, and no error boundary. The exception does not extend to other global failure modes: auth expiry mid-session, which ADR 035 also named, still has no channel.

## Alternatives considered

### Inline only, leaving ADR 035 unchanged

Rejected. For the offline case to reach any call site, the app would need `networkMode: 'always'`, which turns resumable offline writes into failures the user has to redo. Every surface, about twelve today, would have to learn to recognise connectivity errors, and every future surface would have to remember to. An idle page would still say nothing until the user acted.

### Two states: offline, and one "can't reach Flashy"

Rejected. It tells a user whose connection works to check it during a server outage, and sends them off to reset their router.

### A fourth state for the database

Rejected. The user can do nothing different about a database outage than about any other fault on the server's side. The `database_unavailable` code (ADR 064) still earns its keep in logs and the network tab.

### Treating a `4xx` from the probe as healthy

Rejected: it would hide a broken deployment behind a banner that says everything is fine.

### Covering the frontend host with a service worker

Rejected for now. A service worker is a caching and update-delivery decision with failure modes of its own, and belongs with the hosting cycle. This ADR does not rule it out.

## Consequences

Benefits:

- The frozen offline state gets a message, and paused work still resumes on reconnect, so an offline rating is not lost.
- An idle page learns about an outage without the user acting, and the banner clears on its own.
- It adds one component and no new dependency, and call-site errors keep ADR 035's adjacency.

Costs:

- ADR 035 now has an exception, and whether a future failure is "global" becomes a judgment call each time.
- A page's inline error and the banner can show at once. Both are true, but it is two messages about one outage.
- "Can't connect" cannot say whose network failed, only that no response came back.
- A frontend host that is down at page load still shows the browser's own error page.
