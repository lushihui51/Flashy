# Record rules

**Reader.** A record is written for a reader who has read AGENTS.md and no other record; the table at the end says who that reader is for each type.

**Type.** The test is applied to each rejected alternative on its own: if that alternative were built perfectly, could a person using the app tell the difference? Yes marks a PDR candidate, no marks an ADR candidate. Only differences the alternative cannot avoid count. A user is a person using the app. Whether a candidate earns a record is a separate judgment.

**Significance.** Significance is measured by cost of change, in a currency per type; the table at the end gives each. No hard threshold is set.

**Grouping.** Nygard's "a single decision" is the aim.

## Relations

**Connections.** A record cites another record only as a force (a fact driving the decision), in Context, and states what it takes from it in its own words. The table at the end says what each type may cite. Status holds only the pointers its rule allows.

**Compromise.** A compromise lives in the ADR: the PDR keeps the intent, and the ADR records the shortfall as a Negative consequence in the user's terms.

## Supersession

**All or nothing.** A record is only ever fully active, fully superseded or fully deprecated. A later record that changes any part of its Decision restates the whole decision and supersedes it. A later record that changes none of it leaves it untouched.

**The replacing record.** When a record's decision changes, what replaces it is triaged as a new decision. It becomes one record, several records, or no record. Significance is judged on the decision as it now stands, never on the size of the change. A superseding record is complete on its own: a reader who has read no superseded record gets the whole decision, the reason for every part of it, every alternative still rejected, and what was replaced and why.

**The old record.** The old record is marked Superseded by the record or records that replace it, or Deprecated when none does. A superseded or deprecated record stays in its folder with its Status pointer. No live site in code or AGENTS.md cites it, and a repointed site shows no history.

## The record

**Sections.** Title, Status, Context, Decision, Alternatives considered, Consequences, in that order.

**Title.** A short noun phrase naming the option chosen and what it was chosen for. The title line is the record's type and number, then the phrase.

**Name.** `NNN-<slug>.md` in the type's folder, numbered from 001 in the type's own sequence; the slug is taken from the title.

**Status.** Status holds a state and record pointers, nothing else. The states are "Active"; "Superseded by" followed by the replacing record or records; and "Deprecated by" followed by the record that records the change of context that dropped the decision, or a few words on the cause when no record holds it. A replacing record may add "Supersedes" with the records it replaces. "Proposed" is not used.

**Context.** Context states the forces the decision answers and the tension between them, as facts in value-neutral language. It says why a decision is needed and describes the situation in detail: the constraints and the clearances that make the decision and its alternatives possible. It cites another record only as a force. The test for a sentence is that a reader who would have chosen a rejected alternative must still agree it is true.

**Decision.** The Decision is written in full sentences, active voice, "We will". It states what was decided at the level the record stands or falls by. The test for a sentence is that changing what it says would be worth superseding the record. A sentence that fails it lives at the code.

**Alternatives considered.** One subsection per rejected alternative, as concise as possible: the alternative and why it was rejected.

**Consequences.** Consequences lists what becomes true because of the decision and what a later decision or a reader of the code must reckon with, in three labelled groups, "Positive", "Negative" and "Neutral", one full sentence per line. The test for a line is that something must reckon with it. A line that restates the decision does not belong.

**Writing.** A record is one or two pages, written as a conversation with its future reader, in full sentences organised into paragraphs, with bullets as visual style only and never as fragments.

**No date line.**

## By type

|  | ADR | PDR |
| --- | --- | --- |
| Records | A decision about how the app is built | A decision about what the app does for its user |
| Reader | A future developer | A future product owner who knows the app as its user |
| Lives in | `docs/adrs/`, titled "ADR NNN: noun phrase" | `docs/pdrs/`, titled "PDR NNN: noun phrase" |
| Significance currency | Stored data that would need migrating, code beyond its own module that relies on it, dependencies to replace, and anything that would break silently if the reversal went wrong | A change in how the app is used, what purpose it serves, or what the user gets from it |
| Forces in Context | Facts about the code, the data, the dependencies, and the PDRs whose behaviour it must deliver | Facts about how the app is used and what its user needs |
| May cite | ADRs, and PDRs | PDRs only |
