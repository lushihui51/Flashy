# ADR 019: Server-stamped UTC instants, user-facing dates rendered in the stored user timezone

## Status

Accepted

## Context

Dates have to be _consistent to the user_. A review submitted at 11pm local time belongs to that local day, not to the next one; "practised today" has to mean the user's today; a displayed date has to read as the user's wall clock, not the server's. Nothing in the app renders a date yet — `created_at` and `last_activity_at` reach the frontend in `frontend/src/api/types.ts` and are read by no component — so this rule is being fixed before there is any display code to correct.

The obvious first instinct is to make the client set the timestamps, so that what lands in the database is "already in the user's timezone." That instinct runs two separate concerns together, and they have different answers.

**Storage cannot carry locality here.** Every timestamp column in the schema is `timestamptz` — `app_user.created_at` and every other `TimestampMixin.created_at` (`app/models/base.py:27`), `subject.last_activity_at` (`app/models/subject.py:34`), `deck.last_activity_at` (`app/models/deck.py:28`), `review_log.reviewed_at` (`app/models/review_log.py:43`), `card_field_mastery.updated_at` (`app/models/card_field_mastery.py:22`), and `field_def.archived_at` (`app/models/field_def.py:38`). Postgres `timestamptz` stores no timezone at all: it normalizes whatever it is given to a UTC instant on the way in and discards the offset. A client sending `2026-08-24T09:00:00-07:00` and a server sending `2026-08-24T16:00:00Z` produce byte-identical rows. Moving the clock to the client changes nothing about what is stored, so "stored in the user's timezone" is not a property this schema can express — short of switching to naive `timestamp` columns, which is rejected below.

**Consistency to the user is a rendering property.** Whether "today", a day bucket, or a displayed date is right for the user depends entirely on which zone you format and bucket in at read time. That zone therefore has to be known at read time — and it always is: every read path is user-scoped by invariant 7 (`docs/plans/001-schema-rewrite.md`), with ownership enforced in the query via `CurrentUserDep` (`app/dependencies.py`). Because no date is ever fetched without a user in hand, the user's zone is always available exactly where it is needed. The observation that "dates are not accessed without specifying a user" is the argument _for_ read-time rendering, not for baking locality into storage.

**`reviewed_at` is not cosmetic.** It is the ordering key for `rebuild_mastery`'s replay of `review_log`, and for any future FSRS-style grade derivation. `review_log` is append-only (invariant 3), so anything that interleaves a user's review history out of true order is permanent — there is no UPDATE path to repair it.

## Decision

Timestamps are **server-stamped UTC instants**. User-facing dates are **computed in the user's stored IANA timezone at read time**. Client clocks are never trusted for anything that orders or persists.

Concretely:

- Every timestamp column stays `timestamptz`, written by the server — either `server_default=func.now()` or `utcnow()` (`app/models/base.py`). No write endpoint accepts a caller-supplied timestamp.
- Every database connection pins its session `TimeZone` to UTC (`app/database.py`). Postgres returns a `timestamptz` in whatever zone the session is set to, which defaults to the _server's_ local zone — so without this the same instant is emitted as `...-04:00` on one deploy host and `...+00:00` on another. The instant is identical either way; pinning it keeps the API's representation deterministic and stops a host's local zone from leaking into responses.
- `app_user.timezone` holds the user's IANA zone name (e.g. `America/Los_Angeles`), supplied by the client, which resolves it with `Intl.DateTimeFormat().resolvedOptions().timeZone`. It rides **every** request as the `X-Timezone` header, set once in the API client's `onRequest` middleware (`frontend/src/api/client.ts`) so no call site can forget it, and is reconciled in `get_current_app_user` (`app/dependencies.py`). Sending it per-request rather than once at sign-in means a user who travels starts rendering in their new zone without any manual step. A missing or unresolvable header leaves the stored zone alone — it is never a reason to downgrade a known-good value back to UTC. Values are validated against the tz database before being stored (`app/services/timezone.py`).
- Every user-facing date — display strings, "today", day-bucketing, streaks, any calendar-day boundary — is computed in that stored zone. Formatting an instant without an explicit zone is a bug, because it silently picks up whichever zone the formatting process happens to sit in. On the frontend this is enforced, not merely documented: `frontend/src/lib/datetime.ts` is the only module allowed to touch `Intl.DateTimeFormat` or a `toLocale*String` method, and an ESLint `no-restricted-syntax` rule turns every other use into an error.
- Because the zone is a _rendering_ input, it is never consulted when writing, ordering, or comparing instants. Changing a user's zone changes what they see, never what is stored.

The sanctioned escape hatch is **offline capture**, and only that. If practice is ever done offline and synced later, the client's timestamp is the truth and the server's sync time is a lie — at which point a client-supplied `reviewed_at` on the rating endpoint alone becomes correct, sanity-clamped server-side (not in the future beyond a small skew tolerance, not before the owning session's `created_at`). That is additive and confined to the one table where it pays for itself; it is deliberately not built until offline practice is actually on the roadmap.

## Alternatives considered

### Naive `timestamp` columns holding the client's local wall clock

Rejected flatly. This is the only shape that literally stores a date "in the user's timezone", and it costs the ordering guarantee the mastery design leans on. During a DST fall-back the local wall clock repeats an hour: two reviews an hour apart both store `01:30`, and `ORDER BY reviewed_at` is no longer chronological. Replaying an append-only `review_log` through `MasteryStrategy` in the wrong order yields a different, silently wrong mastery value, with no way to repair it. It would also mean migrating every timestamp column, deleting every `server_default=now()`, and adding a client timestamp to every create/update endpoint — a large, irreversible change to buy a property that read-time rendering already provides.

### Keep `timestamptz`, but have the client supply the instant

Rejected. Relative to this decision, it adds exactly one thing: the recorded instant comes from the client's clock rather than the server's. For an online app those differ by network latency — seconds, invisible to any feature in the product. What it costs is real. Client clocks are routinely skewed by minutes, sometimes hours, sometimes deliberately, and a skewed clock writing `reviewed_at` can interleave review history out of true order permanently. It would also grow every write endpoint by a timestamp field, require server-side validation and clamping on all of them, and force a decision about retries submitting stale times. That is a large trusted surface to defend for a benefit that rounds to zero — outside offline capture, which is handled as the narrow escape hatch above rather than as a global policy.

### Derive the zone per request from a header or IP, rather than storing it

Rejected. A zone that is re-derived per request makes historical rendering unreproducible — the same review renders on different calendar days depending on where the request came from — and it is unavailable entirely to anything that is not an inbound browser request (a scheduled job, an export, a server-rendered digest). Storing it on `app_user` gives one stable answer per user that every read path can reach.

## Consequences

Benefits:

- Instants stay strictly ordered under DST transitions, travel, and clock skew, so `rebuild_mastery`'s replay of the append-only `review_log` is reproducible.
- The zone is a single stored value per user, reachable by every read path — including ones with no browser attached — so display, day-bucketing, and streaks agree with each other by construction.
- Changing a user's zone is a pure rendering change, requiring no data migration and rewriting no history.
- The rule is being written before any date-rendering code exists, so no existing display has to be corrected.

Costs:

- Every date-formatting site has to pass the zone explicitly; a bare `toLocaleDateString()` is wrong, and being wrong is invisible for any developer whose own machine sits in the user's zone. The ESLint rule above covers the frontend; the equivalent care on the backend (never formatting or bucketing without `app_user.timezone` in hand) rests on review, since there is no analogous lint for it.
- Every request now carries an extra header, and one that changes triggers a write. The write only fires on an actual change, so the steady state is a comparison and nothing more.
- Cross-user aggregate reporting (e.g. "reviews per day across all users") has no single correct day boundary. This is inherent to per-user local days rather than a consequence of this choice, and no such report exists today.
- Offline practice, if built, needs the narrow client-supplied `reviewed_at` exception and its clamping logic rather than getting it for free.
