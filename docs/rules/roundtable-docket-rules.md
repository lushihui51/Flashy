# Roundtable docket rules

**What a docket is.** A roundtable docket is the one file an initiative's decisions pass through on their way to cycle files. It holds everything the five skills, /product-decide, /product-record, /code-decide, /code-record and /code-plan, have raised or decided and no PDR, ADR or cycle file has absorbed yet, and nothing else.

**Who reads a docket.** Each of the five skills read this in full before it can work. The human (the engineer or the product owner) reads it to see where an initiative stands. No one else should read it, so do not cite it anywhere, ever.

**Lifetime.** A docket can only be created by the human, who also passes its path as an argument each time one of the five skills is invoked. A docket lives on a branch opened from main for it, or, when it is opened for a blocked task, on that task's cycle branch; every skill on the docket runs on that branch, and the branch reaches main by one PR. When the docket is empty, it is finished: delete it in the commit that emptied it.

**Name.** docs/roundtable-dockets/NNN-YYYY-MM-DD.md, a number no docket in the folder holds on any branch, then the date. Title line: "# Roundtable docket NNN: YYYY-MM-DD".

**Maintenance.** The docket is a working set, never a log. Every item has one skill that puts it in and one that takes it out, by absorbing it into a record or a cycle file or by deciding it; the table says which. Take an item out in the session that absorbs or decides it, never later. Only leave a line in when a skill yet to run for this docket needs it.

**Ownership.** A decision belongs to the side that confirmed it, product or code, and is amended or dropped only by its decide skill. Never touch an item you do not own, except to repoint or remove a reference in it to something your own act changed or took out, on the human's approval; disagreement with one is an open question.

**Sections.** The eight sections below, in this order. Every section appears; one with nothing to hold reads "None."

| Section | One item holds | Put in by | Taken out by, when |
| --- | --- | --- | --- |
| Open questions | A label, Q1 upward, never reused; the question, with the reason it is open; its owner, /product-decide or /code-decide; what rests on it, the labels of every decision and question provisional until it is answered, or "nothing" | Any of the five skills | Its owner, when it decides it. Or /code-plan, when neither a task of the cycle being planned nor a deferred outcome needs its answer |
| Product decisions | A label, PD1 upward, never reused; the decision in full sentences; its anchors as /product-decide keeps them | /product-decide, at the end of its session, as its hand-off | /product-record, in the triage: into a record, into Lesser decisions, or dropped on the human's verdict |
| Code decisions | A label, CD1 upward, never reused; the decision in full sentences; its anchors as /code-decide keeps them | /code-decide, at the end of its session, as its hand-off | /code-record, in the triage: into a record, into Lesser decisions, or dropped on the human's verdict |
| Lesser decisions | A label, LPD1 or LCD1 upwards depending on its type; the decision; its anchors; the deprecated or superseded PDR or ADR it came from, if any | /product-record or /code-record | /code-plan, when a task's Details carries it |
| Records | The record's number and title | The record skill that wrote it | /code-plan, when a cycle file's Records lists it |
| Superseded or deprecated PDRs | The PDR, its new status, and the PDR replacing it if it's superseded | /product-record | /code-decide, once it has decided, for every active ADR whose Context cites the PDR, whether that ADR still holds |
| Live sites | The file and symbol, or the AGENTS.md line's words; the ADR it cites; the ADR that replaces it, if any | /code-record | /code-plan, when a task's Files and Details carry the repointing |
| Deferred outcomes | The outcome and its acceptance; the outcome it waits for; the records, lesser decisions and open questions it carries, by number or label | /code-plan | /code-plan, when the outcome becomes the Goal of a cycle file |

**Layout.** Each section is a `##` heading bearing the section's name from the table, in the table's order; nothing stands before the first heading but the title line, and nothing stands outside a section. An item is one bullet. Its line opens with the label, where the table gives one, then the item's first part: the question, the decision, the record's number and title, the PDR, the file and symbol, or the outcome. Each further part is a sub-bullet headed by its name and a colon: for an open question, Reason, Owner and Rests on; for a decision, Facts, Rejected and Becomes true, the three anchors in the decide skills' order; for a lesser decision, those three and From; for a superseded or deprecated PDR, Status; for a live site, Cites and Replaced by; for a deferred outcome, Acceptance, Waits for and Carries. A decision, a lesser decision or a record may also be followed by a Canvas sub-bullet, a link to a canvas that visualises it. Refer to an item from anywhere by its bare label, and to a record by its type and number, such as PDR 012.

**Anchors.** A decision's anchors are the three things kept with it. Facts: the facts it answers, about how the app is used and what the user needs for a product decision, about what has been built and decided for a code decision; a fact belongs when the decision would lose ground if it stopped holding. Rejected: each alternative rejected and why. Becomes true: what becomes true because of it, for the user or for the next developer.

**Lesser decisions.** A lesser decision is a confirmed decision that earned no record. It reaches the builder through a task's Details, and nowhere else.

**Open questions.** Set the owner by the record rules' Type test: /product-decide for a PDR candidate, /code-decide for an ADR candidate. Every pending matter is an open question: a deferred decision, a decision parked for the other side, a PDR that cannot be delivered as decided, with why, a decision a record skill sent back for rethinking, and a decision /code-plan finds unmade. A question has two fates: Either its owner decides it, and it leaves the docket as a decision; or /code-plan finds it out of scope, when neither a task of the cycle being planned nor a deferred outcome needs its answer, and it leaves the docket, or for the backlog when the human keeps it (`docs/rules/backlog-rules.md`). (A task needs an answer when it would be written differently by it.)

**Order.** The skills run on a docket in this order: /product-decide, /product-record, /code-decide, /code-record, /code-plan. Going back to a skill means running every skill after it again, in that order.

**Writing.** Write every sentence as a statement. Keep an item as short as the next skill's act allows; never say what happened, when, or in which conversation. Write a product item in the user-facing vocabulary AGENTS.md points at, so it makes sense to someone who has never seen code. Name code by file and symbol, never by line number. Never write "etc.", "as needed", or any wording that leaves the next skill to guess.
