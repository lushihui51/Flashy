---
name: product-record
description: Product conversation, continued — turn the decisions /product-decide confirmed into Product Decision Records
disable-model-invocation: true
---

This runs after /product-decide, in the same conversation, and its input is the hand-off /product-decide ended with. I am the product owner. Your job is to absorb the confirmed decisions into the records: write the ones that earn a record, supersede or deprecate the records they break, and pass everything else to the code side. Nothing you write here is about how the app is built: every sentence must make sense to someone who has never seen code.

You may assume every decision from /product-decide:

- Is a product decision
- Takes priority against any existing decisions

Files you may write in this conversation:

- New records in `docs/pdrs/`
- The Status line of an existing record in `docs/pdrs/` that this conversation superseded or deprecated
- A report in `docs/reports/`

Give me one thing to answer per turn: one question, the triage table, one record's relations, one record's fate, or one draft, for me to approve or change.

## Terms

- "The user" is a person using the app, never me.
- "The app" is what the user meets: what it shows, what it lets them do, and what they get from it.
- A "record" is a Product Decision Record in `docs/pdrs/`.
- A "lesser decision" is a confirmed decision that earns no record of its own.
- "The report" is the report this conversation ends with: the hand-off to the code side.

## What you read

- The hand-off /product-decide gave earlier in this conversation, in full.
- `docs/rules/record-rules.md`: treat it as your Gospel; it governs everything you propose to me.
- Every active record: they must agree with the new decisions, and they are the examples of what has earned a record.
- The user-facing vocabulary AGENTS.md points at. Those are the words the user sees, so they are the words of every record.
- Nothing else without my explicit permission.

## What you do

### 1. The triage

First, propose one triage for the whole hand-off, as a table: one row per proposed record or lesser decision. A record row names the decisions it groups and why it is significant per record-rules.md; a lesser-decision row says why it is not significant per record-rules.md.

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

Or, the proposed record needs rethinking and we go back to /product-decide (see Ending).

For every record to be superseded or deprecated, list the active records citing it. For each citing, add the record to "What records it contradicts or extends".

Once the fate of all affected records has been settled, draft the proposed record and any new record we've decided on adding, one by one. Nothing is written until I've approved.

Once all new records are written, with my go-ahead mark any existing record superseded or deprecated as concluded, and park any decisions moved below record level for the report.

#### For a proposed lesser decision

Propose if it contradicts or extends any active records. Once I've approved of the affected records, go through them one by one and propose your decision on its fate and your reasoning. Nothing is decided until I say so.

The record in question can be:

- Superseded by a new record
- Deprecated and dropped altogether
- Deprecated and moved below record level

Or, the proposed decision needs rethinking and we go back to /produc-decide (see Ending).

Once the fate of all affected records has been settled, draft any new record we've decided on adding, one by one. Nothing is written until I've approved. If no new record is written, then the proposed lesser decision will be parked for the report or dropped, depending on my verdict.

Once all new records are written, with my go-ahead mark any existing record superseded or deprecated as concluded, and park any decisions moved below record level for the report.

## Ending

When every row is settled, write the report holding: every record written, by number and title; every record superseded or deprecated, and by what record if any; every parked decision and the deprecated record or the proposed lesser decision it originated from; every open question carried over from /product-decide unchanged.

If a decision needs rethinking and I am going back to /product-decide, write the report as things stand, including what is settled (same as above), what is unsettled, and what question needs rethinking and why. The reports path will be given to /product-decide.
