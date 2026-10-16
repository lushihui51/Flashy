---
name: code-record
description: Code conversation, continued — turn the decisions /code-decide confirmed into ADRs
disable-model-invocation: true
---

This runs after /code-decide, in the same conversation, and its input is the hand-off /code-decide ended with. I am the engineer. Your job is to absorb the confirmed decisions into the ADRs: write the ones that earn an ADR, supersede or deprecate the ADRs they break, and pass everything else to the cycle file. Every ADR you write is read by a developer who has read AGENTS.md and no other ADR or PDR.

You may assume every decision from /code-decide:

- Is a code decision
- Takes priority against any existing ADR

Files you may write in this conversation:

- New ADRs in `docs/adrs/`
- The Status line of an existing ADR that this conversation superseded or deprecated
- A report in `docs/reports/`

Give me one thing to answer per turn: one question, the triage table, one ADR's relations, one ADR's fate, or one draft, for me to approve or change.

## Terms

- "The user" is a person using the app, never me.
- An "ADR" is a record in `docs/adrs/`; a "PDR" is a record in `docs/pdrs/`. You never write or edit a PDR.
- A decision's "anchors" are the three things /code-decide kept with it: the relevant facts about what has been built and what has been decided, each alternative rejected and why, and what becomes true for the next developer because of it.
- A "lesser decision" is a confirmed decision that earns no ADR of its own; it reaches the builder through the cycle file, with its anchors.
- A "live site" is a line in the code or in AGENTS.md that cites an ADR by number.
- "The report" is the report this conversation ends with: the hand-off to /code-plan.

## What you read

- The hand-off /code-decide gave earlier in this conversation, in full.
- `docs/rules/record-rules.md`: treat it as your Gospel; it governs everything you propose to me.
- Every active ADR: they must agree with the new decisions, and they are the examples of what has earned an ADR.
- The PDRs the hand-off names, for the behaviour an ADR states in its Context.
- Nothing else without my explicit permission.

## What you do

### 1. The triage

First, propose one triage for the whole hand-off, as a table: one row per proposed ADR or lesser decision. An ADR row names the decisions it groups and what reversing it would cost, in record-rules.md's currency for an ADR: the stored data to migrate, the code beyond its own module that relies on it, the dependencies to replace, and what would break silently. A lesser-decision row says why a builder could reverse it inside a task.

In addition, talk about each grouping or split you considered and did not propose, and why.

The final decision on the triage is mine.

### 2. The pass

Once I approve the triage, take the rows one at a time, in the table's order, and settle each with me before the next.

#### For a proposed ADR:

Propose its relation to the active ADRs and PDRs in 2 sections for my review:

1. What ADRs and PDRs it should reference in its Context: the ADRs that are forces on it, and the PDRs whose behaviour it delivers or must not break
2. What ADRs it contradicts or extends

Once I have approved of the sections, go through the ADRs under "What ADRs it contradicts or extends" one by one, and propose your decision on its fate and your reasoning. Nothing is decided until I say so.

The ADR in question can be:

- Superseded by the proposed ADR
- Superseded by a new ADR
- Deprecated and dropped altogether
- Deprecated and moved below ADR level

Or, the proposed ADR needs rethinking and we go back to /code-decide (see Ending).

For every ADR to be superseded or deprecated, list the active ADRs and the live sites citing it. For each ADR citing, add the ADR to "What ADRs it contradicts or extends". For each live site citing, park it for the report.

Once the fate of all affected ADRs has been settled, draft the proposed ADR and any new ADR we've decided on adding, one by one. Nothing is written until I've approved.

Once all new ADRs are written, with my go-ahead mark any existing ADR superseded or deprecated as concluded, and park any decisions moved below ADR level for the report.

#### For a proposed lesser decision

Propose if it contradicts or extends any active ADR. Once I've approved of the affected ADRs, go through them one by one and propose your decision on its fate and your reasoning. Nothing is decided until I say so.

The ADR in question can be:

- Superseded by a new ADR
- Deprecated and dropped altogether
- Deprecated and moved below ADR level

Or, the proposed decision needs rethinking and we go back to /code-decide (see Ending).

Once the fate of all affected ADRs has been settled, draft any new ADR we've decided on adding, one by one. Nothing is written until I've approved. If no new ADR is written, then the proposed lesser decision will be parked for the report or dropped, depending on my verdict.

## Ending

When every row is settled, write the report holding: every ADR written, by number and title; every ADR superseded or deprecated, and by what ADR if any; every live site that cites a superseded or deprecated ADR; every lesser decision bound for the cycle file, with its anchors and the ADR or decision it originated from; every open question carried over from /code-decide unchanged. The report's path is given to /code-plan.

If a decision needs rethinking and I am going back to /code-decide, write the report as things stand, including what is settled (same as above), what is unsettled, and what question needs rethinking and why. The report's path will be given to /code-decide.
