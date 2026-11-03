---
name: product-record
description: Product conversation, continued — turn the decisions /product-decide confirmed into Product Decision Records
disable-model-invocation: true
argument-hint: path of the docket
---

This runs after /product-decide, and its input is the docket's Product decisions. I am the product owner. Your job is to absorb the confirmed decisions into the PDRs: write the ones that earn a PDR, supersede or deprecate the PDRs they break, and leave everything else on the docket for the code side. Nothing you write here is about how the app is built: every sentence must make sense to someone who has never seen code.

You may assume every Product decision on the docket:

- Is a product decision
- Takes priority against any existing decisions

Files you may write in this conversation:

- New PDRs in `docs/pdrs/`
- The Status line of an existing PDR in `docs/pdrs/` that this conversation superseded or deprecated
- The docket, following `docs/rules/roundtable-docket-rules.md`
- A design canvas, when I ask to see how something would look

Give me one thing to answer per turn: one question, the triage table, one PDR's relations, one touched PDR's fate, the list of untouched PDRs, or one draft, for me to approve or change.

## Terms

- "The app" is what the user meets: what it shows, what it lets them do, and what they get from it.
- "The docket" is the roundtable docket whose path I give.

## What you read

- `docs/rules/roundtable-docket-rules.md`, then the docket in full, before anything else.
- `docs/rules/record-rules.md`: treat it as your Gospel; it governs everything you propose to me.
- Every active PDR: they must agree with the new decisions, and they are the examples of what has earned a PDR.
- The user-facing vocabulary in `docs/vocabulary.md`. Those are the words the user sees, so they are the words of every PDR.
- Nothing else without my explicit permission.

## What you do

### 1. The triage

First, propose one triage for every Product decision on the docket, as a table: one row per proposed PDR or lesser decision. A PDR row names the decisions it groups and why it is significant per record-rules.md; a lesser-decision row says why it is not significant per record-rules.md.

In addition, talk about each grouping or split you considered and did not propose, and why.

The final decision on the triage is mine.

### 2. The pass

Once I approve the triage, take the rows one at a time, in the table's order, and settle each with me before the next. Open each row with a one-line summary of the decision, then why it is record level or a lesser decision, in a sentence or two.

When you propose the fates of the PDRs a row affects, take one turn for each PDR you propose to touch, then one turn listing every PDR you propose to leave untouched. For every PDR, touched or untouched, show a table with one row per sentence of its Decision and three columns: "Line, as written", the sentence quoted word for word, or "(new)" and the sentence for a line the replacement would add; "Fate", one of kept, changed, dropped or added, with the new wording for a changed line; and "Cause", the docket decision that forces the fate, by label, with one sentence on how, or for a kept line why nothing on the docket changes it.

Before you show me a PDR draft, check the draft against the whole of `docs/rules/record-rules.md`, line by line, and fix every rule the draft breaks; I see only the checked draft.

#### For a proposed PDR:

Propose its relation to the active PDRs in 2 sections for my review:

1. What PDRs it should reference in its Context
2. What PDRs it contradicts or extends

Once I have approved of the sections, go through the PDRs under "What PDRs it contradicts or extends", and propose your decision on each one's fate and your reasoning. Nothing is decided until I say so.

The PDR in question can be:

- Untouched, when no new decision changes its Decision
- Superseded by the proposed PDR
- Superseded by a new PDR
- Deprecated and dropped altogether
- Deprecated and moved below record level

Or, the proposed PDR needs rethinking: with my approval, put the question on the docket as an open question owned by /product-decide, with the decision needing its answer, and leave the decision under Product decisions.

For every PDR to be superseded or deprecated, list the active PDRs citing it. For each citing, add the PDR to "What PDRs it contradicts or extends".

Once the fate of all affected PDRs has been settled, draft the proposed PDR and any new PDR we've decided on adding, one by one. Nothing is written until I've approved. Never draft a PDR on a decision that needs an open question's answer.

Once all new PDRs are written, with my go-ahead mark any existing PDR superseded or deprecated as concluded; a decision moved below record level becomes a lesser decision.

#### For a proposed lesser decision

Propose if it contradicts or extends any active PDRs. Once I've approved of the affected PDRs, go through them and propose your decision on each one's fate and your reasoning. Nothing is decided until I say so.

The PDR in question can be:

- Superseded by a new PDR
- Deprecated and dropped altogether
- Deprecated and moved below record level

Or, the proposed decision needs rethinking: with my approval, put the question on the docket as an open question owned by /product-decide, with the decision needing its answer, and leave the decision under Product decisions.

Once the fate of all affected PDRs has been settled, draft any new PDR we've decided on adding, one by one. Nothing is written until I've approved. The proposed lesser decision stays on the docket as a lesser decision or is dropped, depending on my verdict.

Once all new PDRs are written, with my go-ahead mark any existing PDR superseded or deprecated as concluded; a decision moved below record level becomes a lesser decision.

## Ending

When every row is settled, show me the docket edit, then make it: every PDR written, every PDR superseded or deprecated, every lesser decision, the Product decisions taken out, and, once I approve them, the references in other skills' items to anything you changed fixed. Then stop; /product-decide is next if anything needs the answer to a question you put for it, otherwise /code-decide.

Docket for this conversation: $ARGUMENTS
