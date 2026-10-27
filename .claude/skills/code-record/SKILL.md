---
name: code-record
description: Code conversation, continued — turn the decisions /code-decide confirmed into ADRs
disable-model-invocation: true
argument-hint: path of the docket
---

This runs after /code-decide, and its input is the docket's Code decisions. I am the engineer. Your job is to absorb the confirmed decisions into the ADRs: write the ones that earn an ADR, supersede or deprecate the ADRs they break, and leave everything else on the docket for /code-plan.

You may assume every Code decision on the docket:

- Is a code decision
- Takes priority against any existing ADR

Files you may write in this conversation:

- New ADRs in `docs/adrs/`
- The Status line of an existing ADR that this conversation superseded or deprecated
- The docket, following `docs/rules/roundtable-docket-rules.md`
- A design canvas, when I ask to see how something would look

Give me one thing to answer per turn: one question, the triage table, one ADR's relations, one ADR's fate, or one draft, for me to approve or change.

## Terms

- An "ADR" is a record in `docs/adrs/`; a "PDR" is a record in `docs/pdrs/`. You never write or edit a PDR.
- "The docket" is the roundtable docket whose path I give.

## What you read

- `docs/rules/roundtable-docket-rules.md`, then the docket in full, before anything else.
- `docs/rules/record-rules.md`: treat it as your Gospel; it governs everything you propose to me.
- Every active ADR: they must agree with the new decisions, and they are the examples of what has earned an ADR.
- The PDRs the docket lists, for the behaviour an ADR states in its Context.
- Nothing else without my explicit permission.

## What you do

### 1. The triage

First, propose one triage for every Code decision on the docket, as a table: one row per proposed ADR or lesser decision. An ADR row names the decisions it groups and why it is significant per record-rules.md; a lesser-decision row says why it is not significant per record-rules.md.

In addition, talk about each grouping or split you considered and did not propose, and why.

The final decision on the triage is mine.

### 2. The pass

Once I approve the triage, take the rows one at a time, in the table's order, and settle each with me before the next. Open each row with a one-line summary of the decision, then why it is record level or a lesser decision, in a sentence or two.

#### For a proposed ADR:

Propose its relation to the active ADRs and PDRs in 2 sections for my review:

1. What ADRs and PDRs it should reference in its Context
2. What ADRs it contradicts or extends

Once I have approved of the sections, go through the ADRs under "What ADRs it contradicts or extends" one by one, and propose your decision on its fate and your reasoning. Nothing is decided until I say so.

The ADR in question can be:

- Superseded by the proposed ADR
- Superseded by a new ADR
- Deprecated and dropped altogether
- Deprecated and moved below ADR level

Or, the proposed ADR needs rethinking: with my approval, put the question on the docket as an open question owned by /code-decide, with the decision resting on it, and leave the decision under Code decisions.

For every ADR to be superseded or deprecated, list the active ADRs and the live sites citing it. For each ADR citing, add the ADR to "What ADRs it contradicts or extends". Each live site citing goes on the docket.

Once the fate of all affected ADRs has been settled, draft the proposed ADR and any new ADR we've decided on adding, one by one. Nothing is written until I've approved. Never draft an ADR on a decision that rests on an open question.

Once all new ADRs are written, with my go-ahead mark any existing ADR superseded or deprecated as concluded; a decision moved below ADR level becomes a lesser decision.

#### For a proposed lesser decision

Propose if it contradicts or extends any active ADR. Once I've approved of the affected ADRs, go through them one by one and propose your decision on its fate and your reasoning. Nothing is decided until I say so.

The ADR in question can be:

- Superseded by a new ADR
- Deprecated and dropped altogether
- Deprecated and moved below ADR level

Or, the proposed decision needs rethinking: with my approval, put the question on the docket as an open question owned by /code-decide, with the decision resting on it, and leave the decision under Code decisions.

Once the fate of all affected ADRs has been settled, draft any new ADR we've decided on adding, one by one. Nothing is written until I've approved. The proposed lesser decision stays on the docket as a lesser decision or is dropped, depending on my verdict.

## Ending

When every row is settled, show me the docket edit, then make it: every ADR written, every live site that cites a superseded or deprecated ADR, every lesser decision, the Code decisions taken out, and, once I approve them, the references in other skills' items to anything you changed fixed. Then stop; /code-decide is next if anything rests on a question you put for it, otherwise /code-plan.

Docket for this conversation: $ARGUMENTS
