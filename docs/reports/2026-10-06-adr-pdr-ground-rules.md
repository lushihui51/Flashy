# ADR and PDR ground rules: the 2026-10-05 plan session

**Date:** 2026-10-06. The session ran from 2026-10-05 into 2026-10-06.

**Prompted by:** the documentation reform on `refactor/doc-lifecycle`, continuing from the comment session recorded in `docs/reports/2026-10-03-comment-vocabulary-and-rules.md`. The user had studied Nygard's 2011 article "Documenting Architecture Decisions" and wanted ground rules for ADRs that adopt most of its conventions. They suspected two gaps in the repo's practice: no neutral consequence, and modifications made inside an ADR's content where only its Status should change.

**Outcome:** diagnosis only, no code changes. Twenty-five decisions (D1 to D25) are confirmed on what a decision record is, how it lives and dies, and how two record types relate. The second type, the Product Decision Record (PDR), originated with the user in this session. The decisions are pending /code-decompose and /code-justify. Where the rules live was deferred, and no existing record is reformed by this session.

**Grounding.** At the user's instruction this report is grounded in the decisions made in this session only. `AGENTS.md` and the skills under `~/.claude/skills` are themselves subjects of the reform. Where this report quotes them it describes what they say today, as evidence, never as a rule in force.

Every code and doc cite is against `5fc5a02`. The working tree carried one uncommitted edit to `AGENTS.md:27` and the untracked report from the comment session; neither moves any line cited here.

The D-numbers are this session's. The comment session's report has its own D1 to D12, and the two sets are unrelated except where this report names one. D1 to D12 here were confirmed on 2026-10-05 and D13 to D25 on 2026-10-06.

## The rules as confirmed

This text is assembled from the confirmed decision sentences, in the order a reader of a record meets them, and grouped as the user asked: rules for both record types, rules for PDRs only, rules for ADRs only. Each paragraph names its decision. D4 was amended in place once, at the user's request. D12 is given as merged with D23 and D24.

```text
## Rules for both record types

The two types. An ADR records a decision about how the app is built. A PDR
records a decision about what the app does for its user. (D7)

Type. The test is applied to each rejected alternative on its own: if that
alternative were built perfectly, could a person using the app tell the
difference? Yes marks a PDR candidate, no marks an ADR candidate. Only
differences the alternative cannot avoid count. A user is a person using the
app. Whether a candidate earns a record is a separate judgment. (D9)

Significance. Significance is measured by cost of change, in a currency per
type. For an ADR: stored data that would need migrating, code beyond its own
module that relies on it, dependencies to replace, and anything that would
break silently if the reversal went wrong. For a PDR: a change in how the app
is used, what purpose it serves, or what the user gets from it. No threshold is
set. The rule carries examples on both sides of the line, phrased as kinds of
decision. (D17)

Record or comment. A decision gets a record when reversing it would need a
planning session, and a comment at the code when a builder could reverse it
inside a task. Making such a decision needs a cycle too, so a builder who meets
one mid-task stops. (D18)

Who decides. Which choices form one record, and whether they earn one, is a
single judgment the user makes case by case. The agent proposes a grouping with
its reasons and the alternative split, and states what reversing each candidate
would cost in its currency. No written test decides it. Nygard's "a single
decision" is the stated aim. (D6, D17)

Lifecycle. A record in force is only ever fully in force or fully superseded. A
later record that changes any part of its Decision restates the whole decision
and supersedes it. A later record that changes none of it leaves it untouched.
(D1)

A superseding record is complete on its own: a reader who has read no
superseded record gets the whole decision, the reason for every part of it,
every alternative still rejected, and what was replaced and why. (D2)

When a record's decision changes, what replaces it is triaged as a new
decision. It becomes one record, several records, or no record. The old record
is marked Superseded by the record or records that replace it, or Deprecated
when none does. Significance is judged on the decision as it now stands, never
on the size of the change. (D3)

Before any record is marked Superseded or Deprecated, the agent shows the table
giving the fate of every part of the old record and writes nothing until the
user chooses. (D4)

When a record is superseded or deprecated, every record that cites it is
reviewed. (D21)

A superseded or deprecated record stays in its folder with its Status pointer.
No live site in code or AGENTS.md cites it, and a repointed site shows no
history. (D25)

Connections. An ADR names a PDR in its Context when that PDR is a force on it:
the behaviour it exists to deliver or must not break. It states the behaviour
in its own words. A PDR never points at an ADR, a file or a symbol, and never
says how the app is built. A compromise lives in the ADR: the PDR keeps the
intent, and the ADR records the shortfall as a Negative consequence in the
user's terms. Same-type citations sit in Context, as forces. Status holds only
the pointers its rule allows. (D20)

Title. A short noun phrase naming the option chosen and what it was chosen for.
(D5)

Sections. Title, Status, Context, Decision, Alternatives considered,
Consequences, in that order. (D15)

Status. Status holds a state and record pointers, nothing else. The states are
"Active"; "Superseded by" followed by the replacing record or records; and
"Deprecated by" followed by the record that records the change of context that
dropped the decision, or a few words on the cause when no record holds it. A
replacing record may add "Supersedes" with the records it replaces. A PDR's
pointers name only PDRs. "Proposed" is not used. (D12, D23, D24)

Context. Context states the forces the decision answers and the tension between
them, as facts in value-neutral language. The test for a sentence is that a
reader who would have chosen a rejected alternative must still agree it is
true. Context says why a decision is needed and describes the situation in
detail: the constraints and the clearances that make the decision and its
alternatives possible. It cites another record only as a force. An ADR's forces
are facts about the code, the data, the dependencies, and the PDRs whose
behaviour it must deliver. A PDR's forces are facts about how the app is used
and what its user needs. (D19)

Decision. The Decision is written in full sentences, active voice, "We will".
It states what was decided at the level the record stands or falls by. The
test for a sentence is that changing what it says would be worth superseding
the record. A sentence that fails it lives at the code. (D16)

Alternatives considered. One subsection per rejected alternative, as concise as
possible: the alternative and why it was rejected. (D15)

Consequences. Consequences lists what becomes true because of the decision and
what a later decision or a reader of the code must reckon with, in three
labelled groups, "Positive", "Negative" and "Neutral", one full sentence per
line. The test for a line is that something must reckon with it. A line that
restates the decision does not belong. Any group may be empty, and an empty
group is left out. (D14)

Writing. A record is one or two pages, written as a conversation with its
future reader, in full sentences organised into paragraphs, with bullets as
visual style only and never as fragments. An ADR's reader is a future developer
who has read AGENTS.md and no other record. A PDR's reader is a future product
owner who knows the app as its user and has read no other record. (D22)

No date line. (D13)

## Rules for PDRs only

Product decisions have their own record type, the Product Decision Record. A
PDR follows every rule decided for ADRs unless a later decision says otherwise.
(D7)

No central product requirements document is kept. The accepted PDRs are the
requirements. (D8)

PDRs live in docs/pdr/, numbered from 001 in their own sequence, titled
"PDR NNN: noun phrase". (D10)

Rule 4 of the comment rules admits a PDR number as it admits an ADR number.
(D11)

## Rules for ADRs only

No confirmed rule applies to ADRs alone. The directory docs/adrs/, the "ADR NNN"
prefix and the sequence were not decided in this session and continue as they
are.
```

## Decisions

Each entry gives what was decided, why, and what was rejected. Where the session recommended something the user overrode, the entry says so, because the reasoning on both sides is part of the record.

### D1: fully in force or fully superseded

A record in force is only ever fully in force or fully superseded. A later record that changes any part of its Decision restates the whole decision and supersedes it. A later record that changes none of it leaves it untouched.

- **Why:** the user's argument. For an agent, restating most of a record is cheap, and reading stale text is costly: a planning session reads every record and tends to take a sentence in an old body at face value. "In force" then means the Decision holds, and a superseded file can be skipped. This is Nygard as written: "If a decision is reversed, we will keep the old one around, but mark it as superseded."
- **Rejected:** link lines in Status such as "Amended by ADR 062", with the description of the change living in the amending record, which the session had recommended as the adr-tools shape; prose amendment notes in Status, as the records carry today; dated "Amendment" sections in the body.

### D2: a superseding record is complete on its own

A reader who has read no superseded record gets the whole decision, the reason for every part of it, every alternative still rejected, and what was replaced and why.

- **Why:** only this delivers D1's benefit for reasons as well as rules. If only the Decision were restated, the superseded file could not be skipped, and nothing in it would mark which of its reasons still apply.
- **Rejected:** restating the Decision only, with reasons by pointer; a verbatim copy that is then edited.
- **Accepted cost:** length, and carried reasons can drift the way the Decision can. D4 is the check.

### D3: the outcomes when a decision changes

When a record's decision changes, what replaces it is triaged as a new decision. It becomes one record, several records, or no record. The old record is marked Superseded by the record or records that replace it, or Deprecated when none does. Significance is judged on the decision as it now stands, never on the size of the change. "Deprecated" means the record is no longer the decision and no record replaces it; what replaces it, if anything, is a comment at the code.

- **Why:** the user's point that a changed decision is a standalone decision and should be treated as one: is it still worth a record, does it need more than one, what is carried over. The size-of-change reading is the session's addition, confirmed with the rest: otherwise a small edit becomes a way to deprecate a large decision.
- **Rejected:** a new record as the only outcome of every change, which is how D1 was first worded.

### D4: the fate table before anything is marked

Before any record is marked Superseded or Deprecated, the agent shows the table giving the fate of every part of the old record, each part carried, changed, moved to a comment, or dropped, and writes nothing until the user chooses.

- **Why:** D3 gives every change three outcomes, and a restatement can drift.
- **History:** first confirmed with three required parts, the old record and each replacement side by side, the table, and the agent's reasons for one, several or no record. The user then amended it in place, this once, to the table alone. The agent's reasons still arrive under D6.
- **Where it lives:** in the skills the user will rewrite. This repo's docs mention it in passing.
- **Rejected:** the side-by-side files as a required part.

### D5: title

A short noun phrase naming the option chosen and what it was chosen for.

- **Why:** the user's reason: a sentence title presents what is recorded as a fact rather than a decision; "there should be nouns". The session added that a superseded file's title stays in the directory listing, where a noun phrase names an option once chosen and a sentence keeps asserting. `docs/adrs/015-deck-delete-cascades-owned-rows-preserves-history.md:1` still reads "preserves history", which `docs/adrs/048-review-history-and-snapshots-cascade-with-their-owner.md` reversed.
- **Rejected:** sentence titles, 41 of 68 today; imperative "Use X for Y" titles, 18 today.

### D6: grouping and worth are the user's judgment

Which choices form one record, and whether they earn one, is a single judgment the user makes case by case. The agent proposes a grouping with its reasons and the alternative split. No written test decides it. Nygard's "a single decision" is the stated aim.

- **Why:** worth belongs to the group, not to the parts. In `docs/adrs/015-deck-delete-cascades-owned-rows-preserves-history.md:15-21` the SET NULL rule would pass a split test and fail on worth alone, yet with the cascade it answers one question. The user: the triage depends on the scenario and cannot be generalised.
- **Rejected:** the session's reversal test, "a part of the Decision that would still stand if the titled choice were reversed is a separate decision"; a test requiring every rejected alternative to replace the whole decision; the agent merging related decisions on its own judgment and telling the user afterwards.

### D7: the Product Decision Record

Product decisions get their own record type, the PDR. A PDR records a decision about what the app does for its user. An ADR records a decision about how the app is built. A PDR follows every rule decided for ADRs unless a later decision says otherwise.

- **Why:** the user is product owner as well as engineer and wants to be able to answer "why did I design the app this way". A PDR serves that role as Nygard says an ADR serves the engineer. The ADR set narrows to Nygard's scope. The session had recommended against a second record type, on the cost of a boundary call per decision; the user's role argument, and D9, answered it.
- **Rejected:** keeping product decisions in `docs/adrs/` with a line drawn inside it, which the session had recommended; moving them to comments only; a living behaviour document.

### D8: no central requirements document

No central product requirements document is kept. The accepted PDRs are the requirements.

- **Why:** Nygard: "Large documents are never kept up to date. Small, modular documents have at least a chance at being updated." The user's early brainstorm is already stale. Under D20, an ADR's Negative consequences that name a PDR are the list of known shortfalls against the requirements.
- **Rejected:** a central requirements document; a living behaviour document.
- **Note:** confirmed on the session's reading of a one-word reply that covered D7 and D8 together; the user was told the reading and did not object.

### D9: the type test

The test is applied to each rejected alternative on its own: if that alternative were built perfectly, could a person using the app tell the difference? Yes marks a PDR candidate, no marks an ADR candidate. "Built perfectly" means only differences the alternative cannot avoid count; it removes bugs, slowness and risk from the comparison. "A user" is a person using the app. Whether a candidate earns a record is D6's judgment.

- **Why:** the user's rule, offered as a hard rule for the split. It operationalises D7. Run over the 68 records from their alternative headings, it sorted better than the session's hand sort: `docs/adrs/013-snapshot-practice-config-at-session-start.md` becomes a PDR candidate, because a user would notice a practice changing under them, and `docs/adrs/059-only-the-current-card-can-be-rated.md` becomes an ADR candidate, because the interface never offers another card. Per-alternative application is the session's addition, confirmed with it; it is what handles the mixed third, both true hybrids such as ADR 015 and a product decision with one build alternative attached, such as `docs/adrs/021-user-facing-vocabulary-never-exposes-schema-terms.md`, where reusing schema names as labels is visible and renaming the schema to match is not.
- **Rejected:** typing a whole decision at once; Nygard's list of kinds, "structure, non-functional characteristics, dependencies, interfaces, or construction techniques", as the type test.
- **Consequence confirmed with it:** quality targets move to the product side. An alternative that is unavoidably slower or less available in a way a person notices marks a PDR candidate, and the mechanism that meets the target stays an ADR. Nygard counts non-functional characteristics as architecture.
- **Amended in place at the user's request, after this report was first written:** the sentence "Doing nothing counts as an alternative" is dropped from D9. Doing nothing is not an alternative. A record exists because its context made a decision necessary, so whether a decision is needed is never the decider's question; Context says why it is needed (D19). The rules block above carries the amended text.

### D10: where PDRs live

PDRs live in `docs/pdr/`, numbered from 001 in their own sequence, titled "PDR NNN: noun phrase".

- **Why:** it mirrors ADRs exactly, and the type prefix makes a bare number unique.
- **Rejected:** a sequence shared with ADRs.

### D11: comment rule 4 extends to PDRs

Rule 4 of the comment rules, D5 of the 2026-10-03 report, admits a PDR number in an implementation comment exactly as it admits an ADR number.

- **Why:** a product reason can be too long for a comment as easily as an architecture reason.

### D12: Status, as first confirmed

Status holds a state and record pointers, nothing else. The states were "Accepted"; "Superseded by" followed by the replacing record or records; and "Deprecated" followed by a few words on why the decision was dropped. A replacing record may add "Supersedes" with the records it replaces. "Proposed" is not used. Wording fixed by the user: a superseded decision is replaced; a deprecated decision is dropped, whether it stopped applying or shrank below a record under D3.

- **Why:** D1 removed partial amendments, cross-references belong in a later record's Context, and implementation and drift notes belong to the cycle file and the code.
- **Rejected:** prose notes in Status; "Amended by" links; "Implemented by cycle"; "Proposed".
- **Later changed:** the state word by D23, the Deprecated clause by D24. The merged text is in the rules above.

### D13: no date line

- **Why:** Nygard's format has none, and git holds every date.
- **Rejected:** a date line as adr-tools adds.

### D14: Consequences

Consequences lists what becomes true because of the decision and what a later decision or a reader of the code must reckon with, in three labelled groups, "Positive", "Negative" and "Neutral", one full sentence per line. The test for a line is that something must reckon with it. A line that restates the decision does not belong. Any group may be empty, and an empty group is left out.

- **Why:** the user's first original concern. Two labels shut the neutral kind out, so resulting context was filed as cost: `docs/adrs/038-rename-practice-session-to-practice-run.md:37`, `docs/adrs/059-only-the-current-card-can-be-rated.md:39`, `docs/adrs/067-a-configurations-default-name-is-derived-from-its-layout.md:50`. Labels make a writer look for each kind. Nygard names the three kinds and uses no labels; the labels are the session's recommendation, confirmed.
- **Rejected:** prose with no labels; keeping "Benefits" and "Costs" with a third label added; any wording in the rule that steers whether "Negative" is filled. The user's stress: whether a group is empty is the writer's call and the user's review, and nothing in the instruction may influence it.

### D15: sections and alternatives

A record has these sections in this order: Title, Status, Context, Decision, Alternatives considered, Consequences. Alternatives considered holds one subsection per rejected alternative, as concise as possible: the alternative and why it was rejected.

- **Why:** D1 makes Status worth reading first, because skipping a superseded record only saves anything if the state is the first thing read. D2 and D9 both operate on the list of rejected alternatives, and a section with one subsection per alternative is that list.
- **Rejected:** Nygard's order, Context, Decision, Status, Consequences; alternatives folded into Decision, as 17 records do today.
- **Wording note:** "the alternative and why it was rejected" is the session's wording of the user's stress "as concise as possible"; the user did not object to it.

### D16: the Decision section

The Decision is written in full sentences, active voice, "We will". It states what was decided at the level the record stands or falls by. The test for a sentence is that changing what it says would be worth superseding the record. A sentence that fails it lives at the code.

- **Why:** "We will" marks a choice rather than a fact, as D5 does for titles. D1 makes every Decision sentence expensive, and today's Decisions carry mechanism that changes cheaply: 23 name a file path, 4 name a file that no longer exists, 4 state a constant's value or a numeric tunable. A function's name survives the test only when the name itself is what was decided, as in `docs/adrs/054-metadata-naming-convention-for-constraints-and-indexes.md`.
- **Rejected:** present-tense statements, which all 68 records use; a blanket ban on names and values in the Decision, because some decisions are about a name.

### D17: significance by cost of change

Significance is measured by cost of change, in a currency per type. For an ADR: stored data that would need migrating, code beyond its own module that relies on it, dependencies to replace, and anything that would break silently if the reversal went wrong. For a PDR: a change in how the app is used, what purpose it serves, or what the user gets from it. No threshold is set. The rule carries examples on both sides of the line, phrased as kinds of decision. The agent's proposal under D6 states, for each candidate, what reversing it would cost in its currency.

- **Why:** the user's formulation, after Booch's "significant is measured by cost of change", paid in a different currency per type. D6 had left the agent with nothing to argue from, and the quality of the agent's proposal sets how long the user's review takes.
- **Rejected:** Nygard's list of kinds as the measure; the criterion "a future maintainer would ask why", which an implementation comment now answers under the comment rules; examples that name record numbers, which under D1 can point at a superseded file. The last two are the session's additions, confirmed.

### D18: record or comment, the cycle test

A decision gets a record when reversing it would need a planning session, and a comment at the code when a builder could reverse it inside a task. Making such a decision needs a cycle too, so a builder who meets one mid-task stops. This applies to both record types.

- **Why:** the user's test. The reasoning has to sit where the person reversing the decision will be reading: a planner reads records before anyone touches code, a builder reads the code. The circularity the user named, "what decision is significant enough to count as a cycle", is broken by D17's currencies. The second use closes a gap: a significant decision that no record anticipated must not be settled on the spot in a build session.
- **Rejected:** limiting the test to ADRs, which is how the user first framed it.

### D19: Context

Context states the forces the decision answers and the tension between them, as facts in value-neutral language. The test for a sentence is that a reader who would have chosen a rejected alternative must still agree it is true. Context says why a decision is needed and describes the situation in detail: the constraints and the clearances that make the decision and its alternatives possible. It cites another record only as a force. An ADR's forces are facts about the code, the data, the dependencies, and the PDRs whose behaviour it must deliver. A PDR's forces are facts about how the app is used and what its user needs.

- **Why:** the user pointed out that Context had no ground rule. The two types answer different questions, so each needs its own statement of what a force is. The "why a decision is needed" sentence is the user's, replacing the session's "what the decision replaces and why that no longer holds"; it covers the superseding case without being about it, so D2 is still met.
- **Rejected:** the session's sentence "a constraint that comes from how the app is built enters a PDR's Context as a fact in its own words". The user rejected it absolutely: a PDR is not about how the app is built, at all; imagine a non-technical person in charge of PDRs. Also rejected: the replaced-and-why sentence as Context's job.

### D20: connections between the two types

An ADR names a PDR in its Context when that PDR is a force on it, the behaviour it exists to deliver or must not break, and states the behaviour in its own words. A PDR never points at an ADR, a file or a symbol, and never says how the app is built. A compromise lives in the ADR: the PDR keeps the intent, and the ADR that cannot deliver it in full names the PDR in Context and records the shortfall as a Negative consequence in the user's terms. Same-type citations sit in Context, as forces. Status holds only the pointers its rule allows.

- **Why:** the user asked when an ADR should point at a PDR, whether a PDR should point at an ADR at all (their answer: no), and where a compromise is recorded. The person who owns a PDR must not need to know how the app is built. Under D1 a body is frozen, so a link can only be written from the newer record to the older, and product decisions usually come first. For the compromise, `docs/adrs/019-utc-instants-rendered-in-stored-user-timezone.md` would say, as a Negative consequence, that after a zone change the app shows the old zone until the next request, while the PDR keeps "dates render in the user's local time".
- **Rejected:** a PDR citing the ADR that constrains it; a third record type for compromises; a PDR amended for a technical reason; the session's first compromise proposal, which put the constraint in the PDR.
- **Cost accepted:** when an ADR is superseded, nothing mechanical finds the PDRs it fell short of; that check has to be read. The other direction is one grep.

### D21: review of citing records

When a record is superseded or deprecated, every record that cites it is reviewed. Where and how that happens is for the skills.

- **Why:** a cited record is a force under D20, so when it changes the citing record's force has changed, and each citing record is a candidate for its own D3 triage.
- **Rejected by the user as out of scope here:** naming the sync step, or a dedicated discrepancy skill, in the decision. The user's suggestion of a dedicated skill and the session's counter are under open questions.

### D22: writing rules

A record is one or two pages, written as a conversation with its future reader, in full sentences organised into paragraphs, with bullets as visual style only and never as fragments. An ADR's reader is a future developer who has read AGENTS.md and no other record. A PDR's reader is a future product owner who knows the app as its user and has read no other record.

- **Why:** Nygard's last paragraph on format. The reader is named per type because a PDR's owner does not read technical context; the session's first proposal had one reader for both and was corrected by D19's reasoning.
- **Rejected:** one reader for both types.

### D23: "Active"

The in-force state is "Active", not "Accepted".

- **Why:** the user's point: a record is never proposed, so there is no stage for "Accepted" to follow. The user does not want proposed decisions crowding the repo, and the rejected alternatives inside every record already cover what a proposal would.
- **Rejected:** "Accepted"; a "Proposed" state.

### D24: "Deprecated by"

A dropped decision's Status reads "Deprecated by" followed by the record that records the change of context that dropped it. When no record holds the cause, a few words on the cause follow instead. The pointer names a cause, never a replacement. By D20, a PDR's pointer names only a PDR.

- **Why:** the user's format: a deprecation has a cause, and the status should point at the record that records the context change, in the same shape as supersession. By D17 and D18 a cause large enough to drop a record is usually itself a recorded decision, such as a PDR that removes a feature deprecating the ADRs that built it. The fallback for a cause no record holds is the session's addition, confirmed.
- **Rejected:** a few words as the only form, which D12 had.

### D25: superseded records stay, and nothing live cites them

A superseded or deprecated record stays in its folder with its Status pointer, because frozen bodies may still name it. No live site in code or AGENTS.md cites it, and a repointed site shows no history. The repointing is the skills' job.

- **Why:** the user's position: a record is purely a decision, supersession is a major event, and a superseded record should be non-existent so far as readers know. The confirmed reading of "non-existent" is that no live site leads to it. The file itself stays for a reason that follows from the user's own rules: D1 freezes bodies and D20 has records naming records in Context, so when PDR 3 is superseded every ADR that names "PDR 3" still says so and cannot be edited, and PDR 3's Status pointer is the only route from that citation to the current decision.
- **Rejected:** deleting superseded records; history notes at repointed sites, which the comment rules' rule 5 already forbids.

### Readings the user asked to have confirmed

Two statements the user made and asked the session to confirm as covered:

- **A record names no line number or function name.** Covered by D16 for the Decision section, where a name survives only when the name is the decision, and by D20 for PDRs entirely. Not covered for an ADR's Context, which under D19 may state facts about the code; see open question 4.
- **A record is superseded only when something major changes.** Covered by D17 and D18 together: a record exists only for a decision whose reversal is costly in its currency and would need a planning session, and D16 keeps everything cheaper than that out of the Decision.

## What the records do now

This is the evidence the session gathered, all at `5fc5a02`. Counts come from shell passes over headings and sections; treat them as approximate where the text says so. Quoted lines were read directly.

### The 68 files

- `docs/adrs/` holds 68 files. Two share the number 066: `docs/adrs/066-a-snapshot-carries-its-configurations-name.md`, landed in `32001e5` on 2026-10-02, and `docs/adrs/066-one-add-control-per-collection.md`, landed in `1446fba` on 2026-10-02, from parallel branches.
- Every file has Status, Context, Decision and Consequences, with Status first. 49 have an "Alternatives considered" section; 17 name their alternatives as subsections inside Decision; 2 name none (`002`, `005`). Three carry a dated "Amendment" section: `docs/adrs/008-use-sparse-positions-for-practice-card-ordering.md:45`, `docs/adrs/010-archive-fields-instead-of-hard-deleting.md:44`, `docs/adrs/015-deck-delete-cascades-owned-rows-preserves-history.md:51`.

| Title form, by hand count | ADRs |
| --- | --- |
| Sentence | 41 |
| Imperative, "Use X for Y" | 18 |
| Noun phrase | 9 |

### Status sections

| What Status holds | Count |
| --- | --- |
| Exactly "Accepted" | 22 files |
| "Amends" or "Amended by" notes | 32 occurrences |
| "Implemented by cycle" | 10 |
| "Supersedes" or "superseded by" | 10 |
| "Confirmed by", "Reaffirms", "Consistent with", "Decides" | about 12 |
| "Proposed" or "Deprecated" | 0 |

- The longest Status is about 89 words (`docs/adrs/048-review-history-and-snapshots-cascade-with-their-owner.md:5`).
- One whole supersession: `docs/adrs/010-archive-fields-instead-of-hard-deleting.md:5` by ADR 049, written "Accepted; amended ...; Superseded by ADR 049".
- Four records are part in force and part superseded: `015:5`, `docs/adrs/023-entity-actions-in-header-collection-actions-in-collection.md:5`, `docs/adrs/029-retrospection-at-completion-grouped-by-outcome-chain.md:5`, `docs/adrs/030-rerun-recreates-session-from-frozen-snapshots.md:5`.
- 34 of 68 Status sections differ from their first committed version.

### Edits inside bodies after acceptance

Compared section by section between each file's first commit and `5fc5a02`, with whitespace normalised. The formatting commit `8d16d86` (2026-08-24) touched many bodies and changed no words.

| ADR | What changed | Commit |
| --- | --- | --- |
| 005 | `docs/adrs/005-use-tailwind-css-for-styling.md:15` "Colour tokens" subsection added to Decision | `12a9aa2`, 2026-08-24 |
| 006 | `docs/adrs/006-use-openapi-fetch-for-typed-api-client.md:29` "Error normalization" subsection added to Decision | `12a9aa2` |
| 007 | `docs/adrs/007-use-clerk-for-authentication.md:25,29,33` three "Implementation note" subsections appended | `12a9aa2`, `bae7608`, `f8a5ea3` |
| 008, 010, 015 | dated "Amendment" sections appended | `9e9401f` (008, 2026-08-19), `f8a5ea3` (010, 2026-09-18), `6fe4ec0` (015, 2026-08-24) |
| 049 | `docs/adrs/049-field-deletion-drops-all-influence.md:23` one sentence reworded, "practices ended" to "active practices deleted" | `b0b1e44`, 2026-09-22 |

None since 2026-09-22. Everything after went into Status.

### Consequences

- 67 files use the labels "Benefits:" and "Costs:"; `docs/adrs/002-use-fastapi-for-backend.md` uses prose and "Costs accepted:". No file has a neutral group.
- Neutral facts filed as costs: `docs/adrs/038-rename-practice-session-to-practice-run.md:37` (older records keep the old term), `docs/adrs/059-only-the-current-card-can-be-rated.md:39` (a future feature must revisit the record), `docs/adrs/067-a-configurations-default-name-is-derived-from-its-layout.md:50` (a rename does not reach a saved name).

### Decision sections

- 0 of 68 use "We will". All state the decision in the present tense.
- 23 name a file path. 4 name a file that no longer exists: `010` and `012` name `app/database_ops/card_field_mastery.py`; `013` and `015` name `app/services/practice_session.py`.
- 4 state a constant's value or a numeric tunable: `008`, `037`, `056`, `058`. Examples of mechanism in a Decision: `docs/adrs/037-retry-spacing-floor-clamps-mastery-insertion.md:13` gives the floor's value and file; `docs/adrs/062-connectivity-is-the-one-app-level-error-banner.md:28` gives the banner component and its position in the header; `docs/adrs/067-a-configurations-default-name-is-derived-from-its-layout.md:15` gives the file the derivation lives in.

### Length and style

| Words per record | ADRs |
| --- | --- |
| Under 500 | 30 |
| 500 to 1,000 | 35 |
| Over 1,000 | 3 |

- The median is 550 words. The longest are `019` (1,442), `015` (1,352), `055` (1,003).
- Of 396 bullet lines across all records, 9 end without sentence punctuation.
- For the pair discussed under D2: `035` is 507 words and `062` is 976. A `062` that also carried everything still applying from `035` was estimated at roughly 1,400 words.

### The type test over the 68

D9 applied to every rejected alternative, from the alternative headings only. A quick read, not a careful one.

| Result | ADRs |
| --- | --- |
| Every alternative invisible to a user | about 29 |
| Every alternative visible | about 17 |
| Alternatives on both sides | about 20 |
| No alternative listed | 2 |

- True hybrid: `docs/adrs/015-deck-delete-cascades-owned-rows-preserves-history.md:15` (owned rows cascade) and `:21` (history rows SET NULL). Refusing to delete a deck with history is visible; nulling a practice card's reference is not.
- Product decision with one build alternative attached: `docs/adrs/021-user-facing-vocabulary-never-exposes-schema-terms.md`, whose second alternative, renaming the schema, no user could see.
- `docs/adrs/062-connectivity-is-the-one-app-level-error-banner.md:45` lists "Inline only, leaving ADR 035 unchanged" as its first rejected alternative; `docs/adrs/049-field-deletion-drops-all-influence.md:7` opens its Context with what ADR 010 decided and what had drifted. Both are the shape D2 and D19 ask for.

### Citations of records

| Where "ADR NNN" is cited | Occurrences |
| --- | --- |
| `AGENTS.md` | 66 |
| `README.md` | 28 |
| `app/` | 191 |
| `tests/` | 101 |
| `frontend/src/` | 161 |
| `docs/cycles/` | 558 |

- The 16 records that sort purely as PDR candidates are cited 133 times in code, tests, `AGENTS.md` and `README.md`, and 174 times in cycle files.
- ADR 010, wholly superseded, has no live citation outside `docs/`. ADRs 015 and 029, partly superseded, are cited 14 and 16 times in `AGENTS.md` and source.

### Living contracts inside cycle files

Noted during the D8 discussion as a different problem from decision records, and left to the cycle-file part of the reform.

- The vocabulary table: `docs/adrs/021-user-facing-vocabulary-never-exposes-schema-terms.md:13` and `AGENTS.md:46` point into `docs/cycles/004-practice-setup.md`.
- The delta-semantics contract: `AGENTS.md:63` points into `docs/cycles/010-mastery-log.md`.
- The banner wording: `docs/adrs/062-connectivity-is-the-one-app-level-error-banner.md:39` says it lives in cycle 020's Contracts.

### What the skills say today

Evidence only. The skills are being rewritten by the user and their current text is not a rule here. At `~/.claude/skills` commit `76a9aac`, with uncommitted edits to `code-build/SKILL.md` and `suites/code.md` present at the time of writing:

- `code-justify/SKILL.md:15` triages with "expensive to reverse, cross-cutting ..., or that a future maintainer would ask 'why is it this way?' about"; `:16` says "match the format of the existing ADRs exactly" and allows related small decisions to share one ADR; `:17` says "Never rewrite or delete an accepted ADR".
- `code-build/SKILL.md:17` splits an unforeseen finding into a gap that contradicts no ADR or contract, settled with the user's confirmation and a Notes line, and a contradiction, which stops the task.
- `code-sync/SKILL.md:26` allows "superseding where needed - never rewriting an accepted one".
- `code-plan/SKILL.md:14` has a planning session read every ADR.

D4, D17, D18, D21 and D25 each name a consequence for these texts.

### Nygard's text

Fetched from `https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions` on 2026-10-05. The sentences the session worked from:

```text
We will keep a collection of records for "architecturally significant"
decisions: those that affect the structure, non-functional characteristics,
dependencies, interfaces, or construction techniques.

Each record describes a set of forces and a single decision in response to
those forces.

ADRs will be numbered sequentially and monotonically. Numbers will not be
reused.

If a decision is reversed, we will keep the old one around, but mark it as
superseded. (It's still relevant to know that it was the decision, but is no
longer the decision.)

Title: These documents have names that are short noun phrases.

Context: This section describes the forces at play, including technological,
political, social, and project local. These forces are probably in tension, and
should be called out as such. The language in this section is value-neutral. It
is simply describing facts.

Decision: This section describes our response to these forces. It is stated in
full sentences, with active voice. "We will ..."

Status: A decision may be "proposed" if the project stakeholders haven't agreed
with it yet, or "accepted" once it is agreed. If a later ADR changes or
reverses a decision, it may be marked as "deprecated" or "superseded" with a
reference to its replacement.

Consequences: This section describes the resulting context, after applying the
decision. All consequences should be listed here, not just the "positive" ones.
A particular decision may have positive, negative, and neutral consequences,
but all of them affect the team and project in the future.

The whole document should be one or two pages long. We will write each ADR as
if it is a conversation with a future developer. This requires good writing
style, with full sentences organized into paragraphs. Bullets are acceptable
only for visual style, not as an excuse for writing sentence fragments.

Large documents are never kept up to date. Small, modular documents have at
least a chance at being updated.
```

Where the decisions depart from this text, knowingly: Status first and a section for alternatives (D15); labels on consequences (D14); a second record type (D7 to D10); cost of change as the measure instead of the list of kinds (D17, D18); "Active" and "Deprecated by" (D23, D24); no "Proposed" (D12).

## Open questions

None of these is decided. Nothing here should become a default downstream.

1. **Where the rules live.** Deferred by the user, for the record rules and the comment rules alike. The options put to the user were the full text in `AGENTS.md`; a rules file in the repo with one pointer line in `AGENTS.md` and an ADR for the reasoning; or an ADR alone. The session recommended the second and split the decisions into rules that describe a record (D1, D2, D3, D5, D7, D9, D10, D12 to D16, D19, D20, D22 to D25) and rules that describe a step (D4, D6, D8, D11, D17's proposal content, D18's stop, D21), the second kind going to the skills. The comment session left the same question open, and it blocks /code-decompose in the same way.
2. **Cycle-file references inside records.** "Implemented by cycle 020" in Status is gone under D12. Citations of cycle files and minor-decision numbers inside Context are not decided, pending the cycle-file redefinition, as the comment session deferred them.
3. **Reform of the existing records.** Dropped by the user as reform work for its own planning: the move of the 16 records that sort purely as PDR candidates; the split of the about 20 mixed records; a cutoff line stating that records 067 and below predate the rules and are not examples of them; where superseded files sit; the duplicate 066; and the "never reused" numbering rule, which today lives only in the skills' numbering command. The user's stated preference is a clean repository with no stale records for agents to chase; the session argued that a bare rename would plant old-format files in the new directory and that the move should wait until the format rules were set. No part of this is settled.
4. **Code names in an ADR's Context.** D19 lets an ADR's Context state facts about the code, and no decision in this session says whether such a fact may name a file, a symbol or a line. D16 and D20 cover the Decision section and PDRs. Found while writing this report.
5. **The examples for D17.** D17 says the rule carries examples on both sides of the line, phrased as kinds of decision. The table shown in the session is a draft, not confirmed wording:

   | Type | Costs a cycle to reverse | A builder could reverse it in a task |
   | --- | --- | --- |
   | ADR | a column added or retyped; the error type every API call site catches; the auth provider; UTC storage, which fails silently | a constant's value; the shape of one query; a component's position inside a layout |
   | PDR | how mastery is computed and shown; what a retry must contain; what deleting a field removes; the words users see | a label's wording; a default name's cap of two fields; the order of two buttons |

6. **Finding discrepancies between the two folders.** The user asked for a skill or command dedicated to it. The session proposed instead that D4's table list every record citing the one being superseded, and that the existing sync step cover both folders, under the user's own principle that a new skill has to earn its place. The user left anything about skills out of D21. The discrepancies named: an ADR citing a superseded or deprecated PDR; a PDR whose intent an ADR records a shortfall against; two records in force that contradict each other across folders; a record whose rejected alternatives put it in the other folder under D9.
7. **Skipping superseded records when reading.** Proposed as a one-line skill rule and never decided.

## Related

- **`docs/reports/2026-10-03-comment-vocabulary-and-rules.md`.** D11 here extends its D5 (rule 4). Its D6 (present state) is what D25's "a repointed site shows no history" relies on. Its reader, who "has not read any ADR or cycle file", is paralleled by D22's readers here. Its open question 1, where the rules live, is the same as open question 1 here.
- **`docs/reports/2026-09-28-adr-cites-and-per-side-candidate-fetch.md`.** Its D1 put a rule in `AGENTS.md:33` that code references in ADRs name the file and the symbol, never a line. D16 and D20 go further for the Decision section and for PDRs. Whether that rule survives the reform, and in what form, was not decided here.
- **`README.md:51`** says every design decision is in `docs/adrs/`, and `README.md:55` says decisions are recorded as architecture decision records. D7 makes both untrue once the first PDR exists.
- **ADRs.** None is contradicted. Every decision here applies to records written from now on; the existing 68 are untouched by this session, and their reform is open question 3. `docs/adrs/038-rename-practice-session-to-practice-run.md:37`, which leaves older records saying "session", was cited in discussion as the precedent for leaving legacy records alone, and the user's preference went the other way.
- **Skills.** Named under "What the skills say today". The user rewrites them.
