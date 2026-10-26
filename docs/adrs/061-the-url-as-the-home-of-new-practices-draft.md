# ADR 061: The URL as the home of New practice's draft

## Status

Deprecated by the record rules' Type test

## Context

New practice assembles a practice from a name and at most one deck configuration per deck, chosen from a list the user narrows by subject and deck. New practice first held the selection in component state and accepted that the selection is lost on any round trip away from the page: "New configuration", with its nested "New deck…", was the only way out, and a draft was not the navigation metadata ADR 024 covers.

A screenshot review on 2026-09-29 asked for two changes that make round trips routine. A configuration should open for editing straight from the list, and the name should move to the top of the page. With the selection in component state both destroy the draft: select two configurations, open a third to adjust it, and come back to nothing selected; type a name first, as a name at the top invites, and it is lost the same way.

ADR 024 already returns every round trip to the page's full `pathname + search`, so anything the page keeps in its query string comes back without the page it visited knowing about it. Two existing behaviours sit next to that mechanism. The overview's New practice button forwards the overview's whole query string into New practice, and New practice's Cancel forwarded its whole query string back. And the configuration builder handed back `{configurationId}` on every save, which New practice auto-selects, replacing whatever that deck had selected.

## Decision

We will keep New practice's draft in its URL. Each selected configuration is a repeated `config=<id>` parameter, and the name is a `name=` parameter once the user has edited it; until then the page prefills the current time, as before. Every write uses `replace`, so ticking and typing add no history entries. The draft survives every round trip (New configuration, New deck, Edit configuration), a refresh, and browser back.

The draft never leaves the page. Cancel forwards only the overview's own parameters (`subject`, `deck`, `status`), and "Clear filters" removes only `subject` and `deck`. Otherwise the overview would carry the draft in its own URL and hand it back on the next New practice, and Cancel would stop meaning discard.

A round trip returns to exactly the draft the user left. The configuration builder hands back `{configurationId}` only from create mode: building a configuration from New practice means wanting to use it, so it is still auto-selected, while an edit says nothing about wanting the configuration and returns with no result.

The round-trip rule is unchanged: the URL carries what must survive being forwarded, and router state carries results consumed once on arrival. The draft is now part of the address a round trip returns to.

## Alternatives considered

### Keep the selection in component state

Rejected. Losing the selection was tolerable with one rarely used exit, and not with an edit link on every configuration row.

### Keep the draft in sessionStorage

Rejected, as it was rejected the first time. An abandoned draft would reappear on the next visit to New practice and would need expiry rules of its own. A URL has no staleness: opening New practice from the overview starts clean.

### Edit in a full-screen overlay so the page never unmounts

DeckEditor's "New subject" overlay is the precedent, and it keeps the draft in memory. Rejected: the user asked to navigate to the configuration's edit page, and an overlay does nothing for "New configuration", whose "New deck…" navigates away regardless.

### Cancel forwards everything except `config` and `name`

Rejected. Any draft parameter added later would leak into the overview by default. Naming the three parameters the overview reads leaks nothing new.

### Hand back `{configurationId}` on every save

Rejected. After an edit, the auto-select would silently replace another selection in that deck, or tick a configuration the user never chose.

## Consequences

**Positive**

- The user's draft survives round trips, refresh, and browser back with no code in the pages visited, and a round trip added later inherits it.
- The developer has one mechanism, `returnTo`, carrying both where to return and what to return to.

**Negative**

- The user's URL grows by a UUID per selection plus the name, percent-encoded again inside every nested `returnTo`.
- The developer binds the name input to a local buffer read from the URL once and mirrored back on every change, since binding it straight to the URL would route each keystroke through a router navigation.
- The user with a bookmarked or hand-edited URL can name configurations that no longer exist, or two from one deck; the page removes the first and leaves the second to the server's `duplicate_deck`.
- The developer keeps the page's URL writes that react to fetched data in one effect, because two `setSearchParams` calls after one render overwrite each other.

**Neutral**
