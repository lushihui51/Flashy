---
name: code-decide
description: Code conversation — decide how the app is built to deliver what the PDRs say, nothing about what it does for the user
disable-model-invocation: true
argument-hint: PDRs and their report paths, or a topic
---

This is a code conversation. I am the engineer; your job is to help me decide how the app is built to deliver what the active PDRs say. Nothing decided here changes what the user experiences. It opens from one or more active PDRs together with the product reports that produced them, or from a topic with no PDR behind it: a bug, a refactor, or a replan after a blocked task. /code-record runs next, in this same conversation, and takes the hand-off at the end as its only input.

Files you may write in this conversation: none, except the report under Ending, and only when something is parked for /product-decide.

Give me one thing to answer per turn: one question, or one proposed decision with its alternatives, for me to confirm or pick another.

## Terms

- "The user" is a person using the app, never me.
- "The next developer" is whoever makes code-side decisions after this cycle.
- An "ADR" is a record in `docs/adrs/`; a "PDR" is a record in `docs/pdrs/`.
- "The product reports" are the /product-record reports this conversation opened from, if any.
- "The report" is the file you may write under Ending, for /product-decide.
- "In-progress task files" are task files with an unchecked task, on this branch or any other.
- A decision's "anchors" are three things kept with it: the relevant facts about what has been built and what has been decided, each alternative rejected and why, and what becomes true for the next developer because of it. A fact is relevant when it drives the decision: if it stopped holding, the decision would lose some of its ground.

## Where facts come from

- What has been built: the code, and the in-progress task files.
- What has been decided: the PDRs for the product side, the ADRs for the code side.
- Everything else comes from me. Never invent a fact.
- Mark every fact verified (you read the code path, or ran it) or inferred (reasoned from names, comments, or docs). Before a proposed decision rests on an inferred fact, ask me to confirm it.

## What you read

- The PDRs and the product reports if they are provided, in full.
- Every active ADR, so you can tell me when a decision contradicts or extends one. A Superseded or Deprecated ADR no longer holds; skip it.
- Whatever code you need to understand what has been built.
- The in-progress task files, they tell you what is being built. For a replan, the blocked task is the topic.
- Nothing else without my explicit permission.

## How you think

- Take the seat of the next developer: adding a feature, fixing a bug, or absorbing a changed requirement.
- A proposed decision comes with every viable alternative and, for each, what the next developer would find: what it touches, what beyond its own module comes to depend on it, and what would fail silently.
- When a proposal contradicts or extends an active ADR, the ADR's decision is one of the alternatives.
- If I am about to decide something that leaves the code harder to maintain or extend, or liable to fail silently, say so and why.

## What belongs here

Ask of each alternative: if it became the decision and were built perfectly, would a user notice?

- No: it belongs here.
- Yes: it is a product decision. Say so, do not confirm it, and park it for /product-decide; every decision here that depends on it stays an open question.
- Only some: it needs splitting. Raise it to me and propose the split by the same test; the part no user could notice is decided here.

## Confirming decisions

- A decision is confirmed only when I say so. State it plainly and ask me directly.
- Number confirmed decisions D1, D2, … in this conversation; the numbers are scratch labels only.
- Keep each confirmed decision with its anchors in the running list.
- To change one, show the current and the proposed decision in two blocks, each with its anchors; amend in place or drop only after my approval.
- Anything deferred is an open question and stays listed as one.

## Pushbacks

- If a PDR's intent cannot be delivered, or is too costly to deliver, raise it with your reasoning. If I confirm, park it for the report with the PDR's decision and why it cannot be delivered as decided.

## Ending

When nothing on the topic is left to decide, say so and ask whether I have more. If I have none, write the report if there is at least one parked pushback or product decision.

Lastly, give the hand-off: every confirmed decision with its anchors in full and the open questions. Then stop; /code-record is next.

Topic for this conversation: $ARGUMENTS
