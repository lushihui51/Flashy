---
name: product-record
description: Product conversation, continued — turn the decisions /product-decide confirmed into Product Decision Records
disable-model-invocation: true
argument-hint: path of the docket
---

This runs after /product-decide, and its input is the docket's Product decisions. I am the product owner. Your job is to absorb the confirmed decisions into the records: write the ones that earn a record, supersede or deprecate the records they break, and leave everything else on the docket for the code side. Nothing you write here is about how the app is built: every sentence must make sense to someone who has never seen code.

You may assume every Product decision on the docket:

- Is a product decision
- Takes priority against any existing decisions

Files you may write in this conversation:

- New records in `docs/pdrs/`
- The Status line of an existing record in `docs/pdrs/` that this conversation superseded or deprecated
- The docket, following `docs/rules/roundtable-docket-rules.md`

Give me one thing to answer per turn: one question, the triage table, one record's relations, one record's fate, or one draft, for me to approve or change.

## Terms

- "The user" is a person using the app, never me.
- "The app" is what the user meets: what it shows, what it lets them do, and what they get from it.
- A "record" is a Product Decision Record in `docs/pdrs/`.
- "The docket" is the roundtable docket whose path I give.
- A "lesser decision" is a confirmed decision that earns no record of its own; it reaches the code side through the docket.

## What you read

- `docs/rules/roundtable-docket-rules.md`, then the docket in full, before anything else.
- `docs/rules/record-rules.md`: treat it as your Gospel; it governs everything you propose to me.
- Every active record: they must agree with the new decisions, and they are the examples of what has earned a record.
- The user-facing vocabulary AGENTS.md points at. Those are the words the user sees, so they are the words of every record.
- Nothing else without my explicit permission.

## What you do

### 1. The triage

First, propose one triage for every Product decision on the docket, as a table: one row per proposed record or lesser decision. A record row names the decisions it groups and why it is significant per record-rules.md; a lesser-decision row says why it is not significant per record-rules.md.

In addition, talk about each grouping or split you considered and did not propose, and why.

The final decision on the triage is mine.

### 2. The pass

Once I approve the triage, take the rows one at a time, in the table's order, and settle each with me before the next.

#### For a proposed record:

Propose its relation to the active records in 2 sections for my review:

1. What records it should reference in its Context
2. What records it contradicts or extends

Once I have approved of the sections, go through the records under "What records it contradicts or extends" one by one, and propose your decision on its fate and your reasoning. Nothing is decided until I say so.

The record in question can be:

- Superseded by the proposed record
- Superseded by a new record
- Deprecated and dropped altogether
- Deprecated and moved below record level

Or, the proposed record needs rethinking: with my approval, put the question on the docket as an open question owned by /product-decide, with the decision resting on it, and leave the decision under Product decisions.

For every record to be superseded or deprecated, list the active records citing it. For each citing, add the record to "What records it contradicts or extends".

Once the fate of all affected records has been settled, draft the proposed record and any new record we've decided on adding, one by one. Nothing is written until I've approved. Never draft a record on a decision that rests on an open question.

Once all new records are written, with my go-ahead mark any existing record superseded or deprecated as concluded; a decision moved below record level becomes a lesser decision.

#### For a proposed lesser decision

Propose if it contradicts or extends any active records. Once I've approved of the affected records, go through them one by one and propose your decision on its fate and your reasoning. Nothing is decided until I say so.

The record in question can be:

- Superseded by a new record
- Deprecated and dropped altogether
- Deprecated and moved below record level

Or, the proposed decision needs rethinking: with my approval, put the question on the docket as an open question owned by /product-decide, with the decision resting on it, and leave the decision under Product decisions.

Once the fate of all affected records has been settled, draft any new record we've decided on adding, one by one. Nothing is written until I've approved. The proposed lesser decision stays on the docket as a lesser decision or is dropped, depending on my verdict.

Once all new records are written, with my go-ahead mark any existing record superseded or deprecated as concluded; a decision moved below record level becomes a lesser decision.

## Ending

When every row is settled, show me the docket edit, then make it: every record written, every record superseded or deprecated, every lesser decision, and the Product decisions taken out. Then stop; /product-decide is next if you put a question back to it, otherwise /code-decide.

Docket for this conversation: $ARGUMENTS
