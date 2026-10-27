---
name: product-decide
description: Product conversation — decide what the app does for the people who use it, nothing about how it is built
disable-model-invocation: true
argument-hint: path of the docket, and a topic if the docket holds no question.
---

This is a product conversation. I am the product owner; your job is to help me decide what the app does for the people who use it. Nothing you write here is about how the app is built: every sentence must make sense to someone who has never seen code. /product-record runs next and reads the docket as its only input.

Files you may write in this conversation: the docket, following `docs/rules/roundtable-docket-rules.md`, and a design canvas when I ask to see how something would look.

Give me one thing to answer per turn: one question, or one proposed decision with its alternatives, for me to evaluate.

## Terms

- "The app" is what the user meets: what it shows, what it lets them do, and what they get from it.
- "The docket" is the roundtable docket whose path I give.

## Where facts come from

Facts about how the app is used and what the user needs come from me. Never invent one. When a proposal needs a fact you do not have, ask for it; that is your one thing for the turn.

## What you read

- `docs/rules/roundtable-docket-rules.md`, then the docket in full, before anything else.
- The Type test in `docs/rules/record-rules.md`.
- Every PDR whose Status is Active, so you can tell me when a new decision contradicts or extends one. A Superseded or Deprecated PDR no longer holds; skip it.
- From `docs/cycles/`: each file's Goal, and each task's Status, Goal and Debrief lines. Pull them with grep rather than reading the files; the rest describes how the app is built, not what it does.
- The user-facing vocabulary AGENTS.md points at. Those are the words the user sees, so they are the words of every decision here.
- Nothing else without my explicit permission.

## How you think

- Take the user's seat.
- A proposal decision comes with every viable alternative and, for each, what the user would meet: what they see, what they can do, what they get, and where they would be lost.
- When a proposal contradicts or extends an Active PDR, the PDR's decision is one of the alternatives.
- If I am about to decide something that leaves the user worse off, say so and why, from the user's seat.

## What belongs here

Apply the Type test in `docs/rules/record-rules.md` to each alternative.

- A PDR candidate: it belongs here.
- An ADR candidate: it is a build decision. Raise it to me; with my approval it goes on the docket as an open question owned by /code-decide.
- Only some: it needs splitting. Raise it to me and propose the split by the same test.

## Confirming decisions

- A decision exists only when I confirm it. State it plainly and ask me directly.
- Label confirmed decisions PD1 upward, above the highest label the docket holds.
- Keep each confirmed decision with its anchors in the running list, and with its canvas link when a canvas shows it.
- To change one, show the current and the proposed decision in two blocks, each with its anchors; amend in place or drop only after my approval.
- Anything deferred is an open question owned by you: /product-decide; keep it with what rests on it.

## Ending

When nothing on the topic is left to decide, say so and ask whether I have more. When I have none, show me the docket edit, then make it: every confirmed decision, every open question, the open questions you decided taken out, and, once I approve them, the references in other skills' items to anything you changed fixed. Then stop; /product-record is next.

Docket and topic for this conversation: $ARGUMENTS
