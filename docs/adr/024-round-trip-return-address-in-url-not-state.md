# ADR 024: Round-trip return address travels as a URL parameter, not router state

## Status

Accepted

## Context

Several surfaces let a user step away mid-form to create something they need and come back: the deck configuration builder's and the card form's "New deck…" pickers, and (since task 004's New practice page) "New configuration". Each hands the next page a `returnTo` so Cancel and Save know where to land. Task 003 built this as router state — `navigate('/decks/new', { state: { returnTo: location.pathname } })` — and it worked for a single hop.

Verifying task 004's New practice flow surfaced a nested case the state-based design never handled: New practice → New configuration → New deck. The deck editor's own "New deck…" trip reads only its _own_ current location for the `returnTo` it hands forward — it has no way to see what router state the page above it was carrying, because router state isn't part of a location the way `pathname`/`search` are. So the practice page's return address was silently dropped at the second hop: Cancel from the deck editor landed back on the configuration builder correctly (one hop), but Cancel again from there fell through to the builder's default fallback (`/library`) instead of back to New practice. Saving had the same defect — the practice page's own auto-select hand-back (`{configurationId}`) never arrived, because the configuration builder had nothing to navigate back _to_.

Task 003 never gave this pattern its own ADR — it lived only as task-file text, which is why the fix started here rather than as a formal supersession.

## Decision

`returnTo` is a URL query parameter, never router state. Its value is the `pathname + search` of the page to return to, built with `URLSearchParams.set` (never string concatenation) so a nested value — a `returnTo` whose own value contains a `returnTo` — encodes and decodes correctly with no special-casing: each hop hands over its _own_ full location, and since an inherited `returnTo` is already part of that location's `search`, it rides along automatically.

Every reader goes through one shared helper, `internalReturnTo(searchParams): string | null` (`frontend/src/lib/returnTo.ts`), which returns the value only when it starts with `/` and does not start with `//` — otherwise `null`, so the caller falls back to its existing default. The parameter is user-editable (typed, bookmarked, or shared), so it cannot be trusted as an app-internal path without this check.

One-shot arrival results — `{deckId}` handed back by the deck editor, `{configurationId}` handed back by the configuration builder — stay in router state. They are consumed exactly once, on arrival, by the page that asked for them, and are never themselves forwarded through a further hop, so state already works correctly for them. The rule this leaves: **the URL carries an address that must survive being forwarded; router state carries a result consumed once on arrival.**

### Alternative considered: thread an explicit state blob through every hop

Rejected: this is what shipped, and it is exactly what broke. Fixing today's two-hop case by having the configuration builder also forward its inbound `returnTo` in the state it hands the deck editor would only move the ceiling — the same drop would recur at the next hop someone adds, and every new round trip would need to remember to carry the whole chain forward by hand.

### Alternative considered: Cancel as `navigate(-1)`

Rejected: unwinds the visited stack naturally, but breaks after a _save_-return — back would land on the just-submitted, now-stale form instead of skipping over it — and it has no way to carry a result payload (`{deckId}`, `{configurationId}`), so Save would still need a different mechanism entirely. Two mechanisms for one concept was the thing being fixed.

### Alternative considered: trust the URL parameter without validation

Rejected: `?returnTo=` is user-editable in a way router state never was. Passing an arbitrary string straight to `navigate()` risks landing the user on a confusing dead page inside the SPA (react-router treating a non-path string, e.g. a full external URL, as an app route it can't match) instead of the page's normal, sane fallback.

## Consequences

Benefits:

- One mechanism for every round trip in the app, present and future — a round trip added later inherits correct nested behavior automatically by following the same pattern, with nothing to thread by hand.
- Validation lives in exactly one place (`internalReturnTo`), so the "is this safe to navigate to" question is answered once, not per call site.
- The URL fully describes where Cancel/Save will land, which matches this codebase's existing convention of putting page-describing state in the URL rather than component state (e.g. the practice overview's filters).

Costs:

- URLs for these flows are less readable than the bare paths that shipped with task 003 (e.g. `/decks/new?returnTo=%2Fdeck-configurations%2Fnew%3Fsubject...`).
- A contributor unaware of this ADR could still reintroduce a state-based sender for a new round trip; the Round-trip navigation contract in `docs/tasks/004-practice-setup.md` and a grep-based check in that task's Done-when are the guardrails against that, not a structural one.
