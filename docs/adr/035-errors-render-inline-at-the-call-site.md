# ADR 035: Errors render inline at their call site — no global handler, no toasts

## Status

Accepted

## Context

ADR 006 fixed the api layer as side-effect-free — `unwrap` throws and "the UI decides what an error looks like" was explicitly left unwired. Since the rebuild, every surface has answered that the same way without a record: a page renders a failed query as an inline banner where the data would have appeared (`query.isError` → "Could not load …"), and a failed mutation renders its message from local component state next to the control that triggered it — under the Save/Create button, or inside the open delete `ConfirmDialog` via its `children` slot. ADR 022's typed `ApiDetailError` supplies the message text. There is no `ErrorBoundary`, no `QueryCache`/`MutationCache` `onError`, and no toast or snackbar system anywhere in `frontend/src/`; roughly nine surfaces follow the pattern by imitation, and task 006's rating and re-run surfaces are specified against it. This ADR records the convention so it stops being folklore.

## Decision

Errors are displayed where they happen, by the component that owns the query or mutation. A failed query renders an inline banner in place of the content it would have shown. A failed mutation stores the thrown error's message in component state and renders it adjacent to the triggering control — under the submit button, inside the still-open dialog — leaving the user's input intact for retry. There is no global error channel: no `ErrorBoundary` as an error-display mechanism, no `QueryClient`-level handlers, no toasts. A surface that needs different treatment changes this ADR first.

### Alternative considered: a toast/snackbar system

Rejected: it detaches the message from the control that failed, and this app's forms are small enough that adjacency is strictly clearer. A toast layer is also a new dependency and design surface with no current need.

### Alternative considered: global `QueryCache`/`MutationCache` `onError` handlers

Rejected: a global handler needs a global place to put messages — which is the toast decision by another name — and it hides per-surface copy and recovery choices (keep the ratings, keep the dialog open) that belong at the call site.

### Alternative considered: React error boundaries

Rejected as the display mechanism: boundaries catch render crashes, not fetch failures, which are already ordinary values in query/mutation state. (Adding a crash boundary someday is a separate decision this ADR does not preclude.)

## Consequences

Benefits:

- The message sits next to the failed action, with its context and its recovery affordance; tests assert error copy in the same render they already exercise; zero dependencies added.

Costs:

- Every new surface hand-writes a few lines of error state; consistency is enforced only by review against this ADR.
- A genuinely global failure mode (e.g. auth expiry mid-session) has no channel today and will force its own decision.
