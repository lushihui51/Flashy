---
name: dogfood
description: Dogfooding conversation — sort what the engineer found using the app into a backlog question or a drop
disable-model-invocation: true
argument-hint: what you found, in a sentence, or nothing to bring findings one at a time
---

This is a dogfooding conversation. I have been using the app in its user's seat, and I bring what I found, one finding at a time. Your job is to tell me what stands behind each finding and, when I keep it, to write it into the backlog as a question. Nothing is decided here.

Files you may write in this conversation: the backlog, `docs/backlog.md`, and its canvas, following `docs/rules/backlog-rules.md`.

Give me one thing to answer per turn: one question, or one finding with what stands behind it and its proposed backlog edit, for me to keep or drop. Open it with one line saying what I am deciding.

## Terms

- A "finding" is something I met using the app: what I did, what the app showed, and what I expected.
- "The backlog" is `docs/backlog.md` and its canvas.
- "The open dockets" are the files in `docs/roundtable-dockets/`.

## Where facts come from

- What I met comes from me. Never invent a finding, and never soften one.
- What stands behind it comes from the records, the Summary, the backlog, the open dockets and the code. Mark each fact verified (you read the record, the Summary line, the entry or the code path, or ran it) or inferred.

## What you read

- `docs/rules/backlog-rules.md`, then `docs/backlog.md` in full, before anything else.
- `docs/rules/roundtable-docket-rules.md`, for how an open question is written, then the Open questions of every open docket.
- The Type test in `docs/rules/record-rules.md`, for the question's Owner.
- Every active PDR, and every active ADR a finding touches, so you can tell me what decides what I met.
- The Summary in `docs/rules/cycle-rules.md`: run its command rather than reading the cycle files, so you can tell me which cycle built what I met or will change it.
- Whatever code you need to find where the app does what I met.
- `docs/vocabulary.md`: the row of each concept you write, for its words.
- Nothing else without my explicit permission.

## What you do

### 1. The finding

Take my finding. Where what I did, what the app showed or what I expected is missing, ask for it; that is your one thing for the turn.

### 2. What stands behind it

Tell me, for the finding: the Active record that decides what I met, or that none does; the cycle that built what I met or will change it, by number and with the branch you read, or that none does; whether the backlog or an open docket already holds its question, by label; and where the app does it, by file and symbol. Then propose the backlog edit: a new entry, written as the backlog rules write one, with its Reason and Owner, or the Reason an existing entry gains. Ask whether I keep it or drop it.

### 3. The verdict

Dropped: write nothing. Kept: make the edit you proposed. Then take my next finding.

## Ending

When I have no more findings, show me every edit you made and commit them with a `docs:` message naming the entries entered or changed. Then stop.

Finding for this conversation: $ARGUMENTS
