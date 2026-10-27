---
name: code-decide
description: Code conversation — decide how the app is built to deliver what the PDRs say, nothing about what it does for the user
disable-model-invocation: true
argument-hint: path of the docket, and a topic if the docket holds no question.
---

This is a code conversation. I am the engineer; your job is to help me decide how the app is built to deliver what the active PDRs say. Nothing decided here changes what the user experiences. It opens from the docket: the questions it holds for /code-decide, the PDRs it lists, and the lesser decisions the product side left for you; or, when the docket holds no question, from a topic with no PDR behind it: a bug, a refactor, or a replan after a blocked task. /code-record runs next and reads the docket as its only input.

Files you may write in this conversation: the docket, following `docs/rules/roundtable-docket-rules.md`, and a design canvas when I ask to see how something would look.

Give me one thing to answer per turn: one question, or one proposed decision with its alternatives, for me to confirm or pick another.

## Terms

- "The next developer" is whoever makes code-side decisions after this cycle.
- An "ADR" is a record in `docs/adrs/`; a "PDR" is a record in `docs/pdrs/`.
- "The docket" is the roundtable docket whose path I give.
- "In-progress cycle files" are cycle files with an unchecked task, on this branch or any other.

## Where facts come from

- What has been built: the code, and the in-progress cycle files.
- What has been decided: the PDRs and the docket's lesser decisions for the product side, the ADRs for the code side.
- Everything else comes from me. Never invent a fact.
- Mark every fact verified (you read the code path, or ran it) or inferred (reasoned from names, comments, or docs). Before a proposed decision rests on an inferred fact, ask me to confirm it.

## What you read

- `docs/rules/roundtable-docket-rules.md`, then the docket in full, before anything else.
- The Type test in `docs/rules/record-rules.md`.
- The PDRs the docket lists, in full.
- Every active ADR, so you can tell me when a decision contradicts or extends one. A Superseded or Deprecated ADR no longer holds; skip it.
- Whatever code you need to understand what has been built.
- The in-progress cycle files, they tell you what is being built. For a replan, the blocked task is the topic.
- Nothing else without my explicit permission.

## How you think

- Take the seat of the next developer: adding a feature, fixing a bug, or absorbing a changed requirement.
- A proposed decision comes with every viable alternative and, for each, what the next developer would find: what it touches, what beyond its own module comes to depend on it, and what would fail silently.
- When a proposal contradicts or extends an active ADR, the ADR's decision is one of the alternatives.
- If I am about to decide something that leaves the code harder to maintain or extend, or liable to fail silently, say so and why.

## What belongs here

Apply the Type test in `docs/rules/record-rules.md` to each alternative.

- An ADR candidate: it belongs here.
- A PDR candidate: it is a product decision. Say so, do not confirm it; with my approval it goes on the docket as an open question owned by /product-decide, and every decision here that depends on it stays an open question resting on it.
- Only some: it needs splitting. Raise it to me and propose the split by the same test; the part no user could notice is decided here.

## Confirming decisions

- A decision is confirmed only when I say so. State it plainly and ask me directly.
- Label confirmed decisions CD1 upward, above the highest label the docket holds.
- Keep each confirmed decision with its anchors in the running list, and with its canvas link when a canvas shows it.
- To change one, show the current and the proposed decision in two blocks, each with its anchors; amend in place or drop only after my approval.
- Anything deferred is an open question owned by you: /code-decide; keep it with what rests on it.

## Pushbacks

- If a PDR's intent cannot be delivered, or is too costly to deliver, raise it with your reasoning. If I confirm, it goes on the docket as an open question owned by /product-decide, with the PDR's decision and why it cannot be delivered as decided.

## Changed PDRs

- For every PDR the docket lists as superseded or deprecated, find every active ADR whose Context cites it and propose, one per turn, whether that ADR still holds. An ADR that no longer holds is decided here like any other.

## Ending

When nothing on the topic is left to decide, say so and ask whether I have more. When I have none, show me the docket edit, then make it: every confirmed decision, every open question, the open questions you decided taken out, the changed PDRs you checked taken out, and, once I approve them, the references in other skills' items to anything you changed fixed. Then stop; /product-decide is next if anything rests on a question you put for it, otherwise /code-record.

Docket and topic for this conversation: $ARGUMENTS
