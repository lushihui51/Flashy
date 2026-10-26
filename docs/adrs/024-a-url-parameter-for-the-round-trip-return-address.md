# ADR 024: A URL parameter for the round-trip return address

## Status

Active

## Context

Several surfaces let a user step away mid-form to create something they need and come back: the deck configuration builder's and the card form's "New deck…" pickers, and New practice's "New configuration". Each hands the next page a `returnTo` so Cancel and Save know where to land. The first build of this used router state — `navigate('/decks/new', { state: { returnTo: location.pathname } })` — and it worked for a single hop.

Verifying the New practice flow surfaced a nested case the state-based design never handled: New practice → New configuration → New deck. The deck editor's own "New deck…" trip reads only its _own_ current location for the `returnTo` it hands forward — it has no way to see what router state the page above it was carrying, because router state isn't part of a location the way `pathname`/`search` are. So the practice page's return address was silently dropped at the second hop: Cancel from the deck editor landed back on the configuration builder correctly (one hop), but Cancel again from there fell through to the builder's default fallback (`/library`) instead of back to New practice. Saving had the same defect — the practice page's own auto-select hand-back (`{configurationId}`) never arrived, because the configuration builder had nothing to navigate back _to_.

## Decision

We will carry `returnTo` as a URL query parameter, never router state. Its value is the `pathname + search` of the page to return to, built with `URLSearchParams.set`, so a nested value encodes and decodes correctly with no special-casing: each hop hands over its own full location, and an inherited `returnTo` rides along inside that location's search.

Every reader goes through one helper, `internalReturnTo` in `frontend/src/lib/returnTo.ts`, which returns the value only when it starts with `/` and not with `//`, and `null` otherwise, since the parameter is user-editable and cannot be trusted as an app-internal path without the check.

One-shot arrival results, `{deckId}` from the deck editor and `{configurationId}` from the configuration builder, stay in router state: they are consumed once, on arrival, by the page that asked, and never forwarded. The URL carries an address that must survive being forwarded; router state carries a result consumed once on arrival.

## Alternatives considered

### An explicit state blob threaded through every hop

Rejected: this is what shipped, and it is exactly what broke. Fixing today's two-hop case by having the configuration builder also forward its inbound `returnTo` in the state it hands the deck editor would only move the ceiling — the same drop would recur at the next hop someone adds, and every new round trip would need to remember to carry the whole chain forward by hand.

### Cancel as `navigate(-1)`

Rejected: unwinds the visited stack naturally, but breaks after a _save_-return — back would land on the just-submitted, now-stale form instead of skipping over it — and it has no way to carry a result payload (`{deckId}`, `{configurationId}`), so Save would still need a different mechanism entirely. Two mechanisms for one concept was the thing being fixed.

### The URL parameter trusted without validation

Rejected: `?returnTo=` is user-editable in a way router state never was. Passing an arbitrary string straight to `navigate()` risks landing the user on a confusing dead page inside the SPA (react-router treating a non-path string, e.g. a full external URL, as an app route it can't match) instead of the page's normal, sane fallback.

## Consequences

**Positive**

- The developer adds a round trip that inherits correct nested behavior by following the pattern, with nothing to thread by hand.
- The developer answers "is this safe to navigate to" once, in `internalReturnTo`.
- The user's URL fully describes where Cancel and Save will land, matching the app's convention of page-describing state in the URL.

**Negative**

- The user sees less readable URLs for these flows.
- The developer unaware of this record can still reintroduce a state-based sender; this record and AGENTS.md are the guardrails, not a structural one.

**Neutral**
