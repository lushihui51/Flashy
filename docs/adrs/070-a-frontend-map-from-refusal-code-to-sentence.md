# ADR 070: A frontend map from refusal code to sentence

## Status

Active

## Context

PDR 001 decides that a name from the code never appears on a screen, and ADR 069 puts every sentence the app says in one vocabulary file, `docs/vocabulary.md`, beside the code's names, which are a namespace of their own. A sentence shown when a save or a delete fails is on a screen like any other.

Today every form and delete handler renders `error.message`. ADR 065 makes that message the backend's own string detail whenever a refusal carries one, so about twenty sentences written in the code's terms reach screens, such as "practice_card is not the current card" when two tabs rate the same practice.

The backend has a second way to refuse. ADR 022 gave `unwrap` the `{code, message}` detail and `ApiDetailError`, built so that one page could branch on a code; codes exist for run start, rerun, and the health endpoint's 503 (ADR 072); `PracticeCreatePage.tsx` maps three of them to sentences of its own; and ADR 056 stated, for its one code, that the message a user reads belongs to the frontend, keyed on the code. ADR 059 shipped the current-card rejection as a plain string and declined a code because no caller branched on it.

ADR 065 fixes what the frontend knows about a failure without a code: every thrown failure carries its status; a request that got no response and a 5xx with no usable detail throw two fixed sentences chosen in `frontend/src/api/unwrap.ts`; `isNotFound` is the one 404 test, and pages test it, so a 404's string never renders. ADR 065 records as its own cost that a caller matching message text misses the structure.

Where a sentence goes is not decided here. Today a failed mutation's error renders beside the control that failed, and ADR 062 makes the connectivity banner the one app-level channel, its wording chosen by the probe's state rather than by any code. The forms validate a missing name before sending, so a validation refusal from the backend is one a form did not catch.

## Decision

We will have the backend write no sentence the user reads. Every refusal the backend returns carries a detail object with a code and a message: the code names the refusal, and the message describes it in the code's own terms, for a developer. A refusal no screen can reach may stay a plain string.

We will have one frontend function turn a failed request into the sentence the user reads, chosen by the error's code and status and never by its message, from the sentences `docs/vocabulary.md` gives, each beside the code that carries it. A known code renders its sentence. A 404 renders the page's "<Thing> not found.". No response and a 5xx render the two sentences `frontend/src/api/unwrap.ts` fixes. An unknown code, a plain-string detail, or a validation array renders "Something went wrong.".

The connectivity banner is the one sentence source outside that function.

At adoption, the refusals a user reaches gain codes: a name already taken for a subject, deck, field, or configuration; a deck short of fields; a card already rated; a card that is not the current one. Tests that asserted a string detail assert the detail object.

## Alternatives considered

### Rewrite the backend's strings in the vocabulary's words and render them

Rejected: copy would live in two languages, Python and TypeScript, and the next refusal worded in the code's terms would reach a screen the same way.

### "Something went wrong." for every failed save

Rejected: it drops the sentences the vocabulary requires, a name already taken, a deck short of fields, a card already rated, which tell the user what to change.

### Match on message text

Rejected: it breaks silently when the backend's wording changes, the same break ADR 065 rejected for 404s.

## Consequences

**Positive**

- The developer keeps every sentence a refusal shows in one frontend map, mirrored row for row by the vocabulary file; a new refusal is a code on the backend and a row on both.
- The developer changes a refusal's message on the backend without any screen changing.
- The developer never meets a string detail from a reachable refusal; the typed detail error is every reachable refusal's shape.

**Negative**

- The user reads "Something went wrong." for a refusal that ships without a code, and nothing fails; only the vocabulary check and review catch it.
- The user reads "Something went wrong." for a validation failure a form did not catch, with no hint of the field.

**Neutral**

- The developer sees the current-card rejection carry a code, the detail declined for want of a caller; the invariant behind it is unchanged.
- The developer keeps the two fixed sentences in `unwrap.ts`, which are also rows in the vocabulary.
- The developer gives the health endpoint's 503 a developer message; its code stays and the banner shows neither.
