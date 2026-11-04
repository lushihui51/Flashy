---
name: code-record
description: Code conversation, continued — turn the decisions /code-decide confirmed into ADRs
disable-model-invocation: true
argument-hint: path of the docket
---

Its input is the docket's Code decisions. I am the engineer. Your job is to absorb the confirmed decisions into the ADRs: write the ones that earn an ADR, supersede or deprecate the ADRs they break, and leave everything else on the docket.

You may assume every Code decision on the docket:

- Is a code decision
- Takes priority against any existing ADR

Files you may write in this conversation:

- New ADRs in `docs/adrs/`
- The Status line of an existing ADR that this conversation superseded or deprecated
- An ADR that has not reached main, in place
- The docket and its canvas, following `docs/rules/roundtable-docket-rules.md`

Give me one thing to answer per turn: one question, the triage table, one ADR's relations, one touched ADR's fate, the list of untouched ADRs, or one draft, for me to approve or change.

## Terms

- An "ADR" is a record in `docs/adrs/`; a "PDR" is a record in `docs/pdrs/`.
- "The docket" is the roundtable docket whose path I give.

## What you read

- `docs/rules/roundtable-docket-rules.md`, then the docket in full, before anything else.
- `docs/rules/record-rules.md`: treat it as your Gospel; it governs everything you propose to me.
- Every active ADR, as the examples of what has earned an ADR.
- The PDRs the docket lists, for the behaviour an ADR states in its Context.
- Nothing else without my explicit permission.

## What you do

### 1. The triage

First, propose one triage for every Code decision on the docket, as a table: one row per proposed ADR or lesser decision. Each row names the decisions it groups, the active record they make one decision with, if any, and why it is, or is not, significant per record-rules.md.

In addition, talk about each grouping or split you considered and did not propose, and why.

The final decision on the triage is mine.

### 2. The pass

Once I approve the triage, take the rows one at a time, in the table's order, and settle each with me before the next. Open each row with a one-line summary of the decision, then why it is record level or a lesser decision, in a sentence or two.

When you propose the fates of the ADRs a row affects, take one turn for each ADR you propose to touch, then one turn listing every ADR you propose to leave untouched. For every ADR, touched or untouched, show a table with one row per sentence of its Decision and three columns: "Line, as written", the sentence quoted word for word, or "(new)" and the sentence for a line the replacement would add; "Fate", one of kept, changed, dropped or added, with the new wording for a changed line; and "Cause", the docket decision that forces the fate, by label, with one sentence on how, or for a kept line why nothing on the docket changes it.

Before you show me an ADR draft, check the draft against the whole of `docs/rules/record-rules.md`, line by line, and fix every rule the draft breaks; I see only the checked draft.

#### For a proposed ADR

Propose its relation to the active ADRs and PDRs in 2 sections for my review:

1. What ADRs and PDRs it should reference in its Context
2. What ADRs it contradicts or extends

The ADRs under the second section are the affected ADRs.

#### For a proposed lesser decision

Propose which active ADRs it contradicts or extends. Those are the affected ADRs.

#### The affected ADRs

Once I have approved the affected ADRs, propose your decision on each one's fate and your reasoning. Nothing is decided until I say so. The ADR in question can be:

- Untouched, when no new decision changes its Decision or makes one decision with it
- Edited in place, when it has not reached main
- Superseded by the proposed ADR
- Superseded by a new ADR
- Deprecated and dropped altogether
- Deprecated and moved below record level

Or, the proposed ADR or lesser decision needs rethinking: with my approval, put the question on the docket as an open question owned by /code-decide, with the decision needing its answer, and leave the decision under Code decisions.

For every ADR to be superseded or deprecated, list the active ADRs citing it; each one joins the affected ADRs.

Once the fate of every affected ADR has been settled, draft the proposed ADR, where the row proposes one, and any new ADR we've decided on adding, one by one. For a decision built before its record, date it and each candidate citation from git history, and keep only the citations older than the decision. Nothing is written until I've approved. Never draft an ADR on a decision that needs an open question's answer. A proposed lesser decision stays on the docket as a lesser decision or is dropped, depending on my verdict.

Once all new ADRs are written, with my go-ahead mark any existing ADR superseded or deprecated as concluded and make the in-place edits; a decision moved below record level becomes a lesser decision.

## Ending

When every row is settled, show me the docket edit, then make it. Then stop.

Docket for this conversation: $ARGUMENTS
