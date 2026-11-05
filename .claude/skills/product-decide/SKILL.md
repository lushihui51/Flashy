---
name: product-decide
description: Product conversation — decide what the app does for the people who use it, nothing about how it is built
disable-model-invocation: true
argument-hint: path of the docket, and a topic if the docket holds no question.
---

This is a product conversation. I am the product owner; your job is to help me decide what the app does for the people who use it. Nothing you write here is about how the app is built: every sentence must make sense to someone who has never seen code.

Files you may write in this conversation: the docket and its canvas, following `docs/rules/roundtable-docket-rules.md`.

Give me one thing to answer per turn: one question, or one proposed decision with its alternatives, for me to evaluate. Open it with one line saying what I am deciding.

## Terms

- "The app" is what the user meets: what it shows, what it lets them do, and what they get from it.
- "The docket" is the roundtable docket whose path I give.

## Where facts come from

Facts about how the app is used and what the user needs come from me. Never invent one. When a proposal needs a fact you do not have, ask for it; that is your one thing for the turn.

## What you read

- `docs/rules/roundtable-docket-rules.md`, then the docket in full, before anything else.
- The Type test in `docs/rules/record-rules.md`.
- Every PDR whose Status is Active, so you can tell me when a new decision contradicts or extends one.
- From `docs/cycles/`: each file's Outcome, and each task's Status and Goal. Pull them with this command rather than reading the files; the rest describes how the app is built, not what it does.
  ````
  awk 'FNR==1{fence=0; print "==> " FILENAME} /^```/{fence=!fence; next} fence || /^$/{next} /^Outcome:/{print; next} /^### /{t=substr($(0),5); sub(/ — .*/,"",t); next} /^\*\*[A-Za-z ]+\*\*$/{part=$(0); next} part=="**Status**"{s=$(0); sub(/^- /,"",s); part=""; next} part=="**Goal**"{print t " " s " " $(0); part=""}' docs/cycles/*.md
  ````
  The command writes `$(0)` for awk's `$0`, because the skill loader substitutes `$0` with an argument.
- `docs/vocabulary.md`: the row of each concept you write, for its words.
- Nothing else without my explicit permission.

## How you think

- Take the user's seat.
- A proposed decision comes with every viable alternative and, for each, what the user would meet: what they see, what they can do, what they get, and where they would be lost.
- When a proposal contradicts or extends an Active PDR, the PDR's decision is one of the alternatives.
- If I am about to decide something that leaves the user worse off, say so and why, from the user's seat.

## What belongs here

Apply the Type test in `docs/rules/record-rules.md` to each alternative.

- A PDR candidate: it belongs here.
- An ADR candidate: it is a build decision. Raise it to me; with my approval it goes on the docket as an open question owned by /code-decide.
- Only some: it needs splitting. Raise it to me and propose the split by the same test.

## Confirming decisions

- A decision exists only when I confirm it. State it plainly and ask me directly.
- A proposed decision states that decision alone: nothing restated from an earlier one, nothing settled for a later one.
- Label confirmed decisions as the docket rules label a Product decision.
- Keep each confirmed decision with its anchors in the running list, and with the drawings that show it.
- To change one, show the current and the proposed decision in two blocks, each with its anchors; amend in place or drop only after my approval.
- Anything deferred is an open question owned by you.

## Ending

When nothing on the topic is left to decide, say so and ask whether I have more. When I have none, show me the docket edit, then make it. Then stop.

Docket and topic for this conversation: $ARGUMENTS
