# Record rules

## Rules for both record types

**The two types.** An ADR records a decision about how the app is built. A PDR records a decision about what the app does for its user.

**Type.** The test is applied to each rejected alternative on its own: if that alternative were built perfectly, could a person using the app tell the difference? Yes marks a PDR candidate, no marks an ADR candidate. Only differences the alternative cannot avoid count. A user is a person using the app. Whether a candidate earns a record is a separate judgment.

**Significance.** Significance is measured by cost of change, in a currency per type. For an ADR: stored data that would need migrating, code beyond its own module that relies on it, dependencies to replace, and anything that would break silently if the reversal went wrong. For a PDR: a change in how the app is used, what purpose it serves, or what the user gets from it. No threshold is set.

**Record or comment.** A decision gets a record when reversing it would need a planning session, and a comment at the code when a builder could reverse it inside a task. Making such a decision needs a cycle too.

**Grouping.** Nygard's "a single decision" is the aim.

**Lifecycle.** A record in force is only ever fully in force or fully superseded. A later record that changes any part of its Decision restates the whole decision and supersedes it. A later record that changes none of it leaves it untouched.

A superseding record is complete on its own: a reader who has read no superseded record gets the whole decision, the reason for every part of it, every alternative still rejected, and what was replaced and why.

When a record's decision changes, what replaces it is triaged as a new decision. It becomes one record, several records, or no record. The old record is marked Superseded by the record or records that replace it, or Deprecated when none does. Significance is judged on the decision as it now stands, never on the size of the change.

A superseded or deprecated record stays in its folder with its Status pointer. No live site in code or AGENTS.md cites it, and a repointed site shows no history.

**Connections.** An ADR names a PDR in its Context when that PDR is a force on it: the behaviour it exists to deliver or must not break. It states the behaviour in its own words. A PDR never points at an ADR, a file or a symbol, and never says how the app is built. A compromise lives in the ADR: the PDR keeps the intent, and the ADR records the shortfall as a Negative consequence in the user's terms. Same-type citations sit in Context, as forces. Status holds only the pointers its rule allows.

**Title.** A short noun phrase naming the option chosen and what it was chosen for.

**File Name.** `docs/pdrs/NNN-<slug>.md`; the slug is taken from the title.

**Sections.** Title, Status, Context, Decision, Alternatives considered, Consequences, in that order.

**Status.** Status holds a state and record pointers, nothing else. The states are "Active"; "Superseded by" followed by the replacing record or records; and "Deprecated by" followed by the record that records the change of context that dropped the decision, or a few words on the cause when no record holds it. A replacing record may add "Supersedes" with the records it replaces. A PDR's pointers name only PDRs. "Proposed" is not used.

**Context.** Context states the forces the decision answers and the tension between them, as facts in value-neutral language. The test for a sentence is that a reader who would have chosen a rejected alternative must still agree it is true. Context says why a decision is needed and describes the situation in detail: the constraints and the clearances that make the decision and its alternatives possible. It cites another record only as a force. An ADR's forces are facts about the code, the data, the dependencies, and the PDRs whose behaviour it must deliver. A PDR's forces are facts about how the app is used and what its user needs.

**Decision.** The Decision is written in full sentences, active voice, "We will". It states what was decided at the level the record stands or falls by. The test for a sentence is that changing what it says would be worth superseding the record. A sentence that fails it lives at the code.

**Alternatives considered.** One subsection per rejected alternative, as concise as possible: the alternative and why it was rejected.

**Consequences.** Consequences lists what becomes true because of the decision and what a later decision or a reader of the code must reckon with, in three labelled groups, "Positive", "Negative" and "Neutral", one full sentence per line. The test for a line is that something must reckon with it. A line that restates the decision does not belong. Any group may be empty, and an empty group is left out.

**Writing.** A record is one or two pages, written as a conversation with its future reader, in full sentences organised into paragraphs, with bullets as visual style only and never as fragments. An ADR's reader is a future developer who has read AGENTS.md and no other record. A PDR's reader is a future product owner who knows the app as its user and has read no other record.

**No date line.**

## Rules for PDRs only

Product decisions have their own record type, the Product Decision Record. A PDR follows every rule decided for ADRs unless a later decision says otherwise.

No central product requirements document is kept. The accepted PDRs are the requirements.

PDRs live in docs/pdrs/, numbered from 001 in their own sequence, titled "PDR NNN: noun phrase".

## Rules for ADRs only

ADRs live in docs/adrs/, numbered from 001 in their own sequence, titled "ADR NNN: noun phrase".
