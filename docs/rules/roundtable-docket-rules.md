# Roundtable docket rules

**What a docket is.** A roundtable docket is the one file an initiative's decisions pass through on their way to cycle files. It holds everything the six skills, named in Order below, have raised or decided and no PDR, ADR or cycle file has absorbed yet, and nothing else.

**Who reads a docket.** Each of the six skills reads it in full before anything else. The human (the engineer or the product owner) reads it to see where an initiative stands. /dogfood reads its Open questions, to see whether a question is already open. No one else reads it, so no other tracked file cites it or names an item of it by label.

**Lifetime.** Only the human creates a docket, and only the human deletes it, with its canvas, after its branch has merged to main. A docket /cycle-plan has emptied reads "None." in every section, and the human reopens it for a blocked task of its cycles; a docket reopened for a blocked task amends that task's cycle file and plans no new cycle.

**Branch.** The human makes one branch from main for each docket, named `docket/` and the docket file's name without `.md`; every commit of the docket's skills is made on it, every cycle's branch merges into it, and the human merges it to main by pull request once every cycle planned from the docket is complete and judged together.

**Name.** docs/roundtable-dockets/NNN-YYYY-MM-DD.md, a number no docket in the folder holds on any branch, then the date. Title line: "# Roundtable docket NNN: YYYY-MM-DD".

**Maintenance.** The docket is a working set, never a log. Every item has one skill that puts it in and one that takes it out, by absorbing it into a record or a cycle file or by deciding it; the table says which. Take an item out in the session that absorbs or decides it, never later. Only leave a line in when a skill yet to run for this docket needs it.

**Ownership.** A decision belongs to the side that confirmed it, product or code, and is amended or dropped only by a skill of its side. Never touch an item you do not own, except to repoint or remove a reference in it to something your own act changed or took out, on the human's approval; disagreement with one is an open question.

**Sections.** The seven sections below, in this order. Every section appears; one with nothing to hold reads "None."

| Section | One item holds | Put in by | Taken out by, when |
| --- | --- | --- | --- |
| Open questions | A label, Q1 upward, never reused; the question; under Reason, why it is open; under Owner, the decide skill of its type by the record rules' Type test; under Needed by, the labels of every decision and question provisional until it is answered, or "nothing" | Any of the six skills | Its owner, when it decides it. Or /cycle-plan, when it plans the docket's last cycle: into the backlog, or dropped on the human's verdict |
| Product decisions | A label, PD1 upward, never reused; the decision in full sentences; its anchors, each under its name | /product-decide | /product-record, in the triage: into a record, into Lesser decisions, or dropped on the human's verdict |
| Code decisions | A label, CD1 upward, never reused; the decision in full sentences; its anchors, each under its name | /code-decide | /code-record, in the triage: into a record, into Lesser decisions, or dropped on the human's verdict |
| Lesser decisions | A label, LPD1 or LCD1 upward by its type, never reused; the decision; its anchors, each under its name; under From, the deprecated or superseded PDR or ADR it came from, if any | /product-record or /code-record | /cycle-plan, when tasks' Details carry all of it |
| Records | The record's number and title | The record skill that wrote it | /cycle-plan, when the cycle's tasks deliver all of it |
| Superseded or deprecated PDRs | The PDR; under Status, its new status, and the PDR replacing it if it is superseded | /product-record | /code-decide, once it has decided, for every active ADR whose Context cites the PDR, whether that ADR still holds |
| Live sites | The file and symbol of code that must change to follow what replaced the record it cites; under Cites, the record it cites; under Replaced by, the record or lesser decision that replaces it, if any | /record-sync | /cycle-plan, when a task's Files and Details carry it |

**Layout.** Each section is a `##` heading bearing the section's name from the table, in the table's order; nothing stands before the first heading but the title line and the canvas line, and nothing stands outside a section. An item is one bullet: its line opens with the label, where the table gives one, then the item's first part, and each further part is a sub-bullet headed by its name and a colon.

**Canvas.** A docket has at most one canvas, named "<repository> docket NNN" after the repository's name and linked on the line under the title as "Canvas: " and the link. The canvas is part of the docket: whoever reads the docket opens it too. The human makes it; no skill draws unasked. Each drawing on it carries a number, 1 upward, never reused. The options drawn for one question share its number, each followed by a letter of its own, A upward. Only an approved drawing stays: the skill that confirms the decision removes each rejected option's drawing, describes each under the decision's Rejected, and drops the approved drawing's letter. Any item names the drawings that show it under Drawings, by number; an item that changes how a surface looks is shown by every drawing of that surface. A drawing shows what the items citing it decide, and changes as they enter or change, by the skill that changes them.

**Anchors.** A decision's anchors are the three things kept with it. Facts: the facts it answers; a fact belongs when the decision would lose ground if it stopped holding. Rejected: each alternative rejected and why. Becomes true: what becomes true because of it, for the user or for the next developer.

**Lesser decisions.** A lesser decision is a confirmed decision that earned no record.

**Open questions.** Every pending matter is an open question.

**Order.** The skills run on a docket in this order: /product-decide, /product-record, /code-decide, /code-record, /record-sync, /cycle-plan. Going back to a skill means running every skill after it again, in that order.

**Writing.** Write every sentence as a statement. Keep an item as short as the next skill's act allows; never say what happened, when, or in which conversation. Write a product item in the user-facing words of `docs/vocabulary.md`, never a name from the code. Refer to an item by its bare label, and to a record by its type and number. Never write "etc.", "as needed", or any wording that leaves the next skill to guess.
