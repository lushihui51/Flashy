# A built-behaviour document: the 2026-10-09 plan session

**Date:** 2026-10-10. The session ran from 2026-10-09 into 2026-10-10.

**Prompted by:** the documentation reform on `process/reform`, continuing from the three sessions recorded in `docs/cc/2026-10-03-comment-vocabulary-and-rules.md`, `docs/cc/2026-10-06-adr-pdr-ground-rules.md` and `docs/cc/2026-10-07-task-file-ground-rules.md`. The engineer, reading Cockburn's _Writing Effective Use Cases_, first asked whether a PDR as the record session defined it is a sea-level goal of the user. They then named a gap: nothing in the ecosystem of ADRs, PDRs, task files and comments says what has been built on the product side, and they proposed a document to hold that.

**Outcome:** deferred, no code changes. The engineer dropped the document at the end of the session and keeps task files as the answer to what was built, to see how it goes. No decision from this session stands, and nothing is pending /code-decompose or /code-justify. The condition for revisiting is under open question 1.

**Grounding.** At the engineer's instruction the session read the three reports named above before anything else, and treated `AGENTS.md`, the ADRs, the task files and the skills under `~/.claude/skills` as subjects of the reform rather than rules in force. The README was read because the engineer named it. No ADR was read.

Every cite is against `1d97ef3`. The working tree carried the 2026-10-07 report untracked; its lines are cited from that file as it stood.

**Terms.** As the task session fixed them: "user" is a person using the app; the human building it is "the engineer"; the agent in a planning session is "the planner"; the agent building a task is "the builder".

## Finding 1: a PDR is not a sea-level goal

The engineer asked whether each PDR, as the record session defined it, is a sea-level goal in Cockburn's sense. The answer the session gave, and the engineer did not dispute, is no. A PDR is a decision between behaviours; a sea-level use case is a goal a user achieves in one sitting. They differ on four counts.

- **Grain.** The record session's D6 (`docs/cc/2026-10-06-adr-pdr-ground-rules.md:194-199`) keeps Nygard's "a single decision" as the aim. Cockburn's unit is one goal of one primary actor. One sea-level goal embodies several PDR candidates from the D17 examples (`:518-524`), such as what a retry must contain and how mastery is shown, and one PDR such as the words users see cuts across every goal. The relation is many-to-many.
- **Altitude.** Cockburn pins a use case to one level and tests it: can the user do it in one sitting and go away happy. The D17 examples sit at every level and none is a goal. "How mastery is computed and shown" is a rule a user never performs; "the order of two buttons" is below what Cockburn admits as a use case. Nothing in the record rules asks a PDR to sit at an altitude.
- **Shape.** D5 (`:84-85`) titles a record with the option chosen; Cockburn names a use case with the goal as a verb phrase. D16's "We will" (`:107-110`) is the team committing; a main success scenario is the actor acting and the system responding. D15's Alternatives considered (`:87-88`) has no counterpart: a use case never records the behaviours it rejected, and recording them is the reason a decision record exists.
- **Kind.** D9's confirmed consequence (`:216-223`) moves quality targets into PDRs, and D17 puts the vocabulary there. Cockburn keeps performance, interface and business rules off the use case text, as the other requirements around it. A PDR covers kinds of requirement a use case leaves out.

Where the two meet: D19 (`:97-106`) makes a PDR's forces "facts about how the app is used and what its user needs", and a sea-level goal is such a fact, so the goal is a force in a PDR's Context in the way D20 (`:76-83`) makes a PDR a force on an ADR. Some PDRs set a goal's success guarantee, such as what deleting a field removes. And Cockburn's altitude could serve as the threshold D17 (`:31-37`) leaves unset: a reversal that adds or removes a sea-level goal or changes its guarantee costs a cycle, while one that touches a subfunction step is a builder's. None of this was proposed as a decision.

One observation on D8 (`:136-137`, `:208-214`), "the accepted PDRs are the requirements", came out of the comparison and was not taken further. Cockburn's list of goal names is meant to be complete over the users' goals. The PDR set is not complete by construction: D18 (`:39-42`) gives a record only to a decision whose reversal needs a planning session, so a behaviour nobody argued about has no PDR. The PDR set is the contested requirements, and no document answers "what can a user do here". That observation is what the second finding grew from.

## Finding 2: nothing says what is built

The engineer's gap, checked against the three rule sets. Each describes what the rules say today.

- **Records never carry built state.** Status holds "Active", "Superseded by" or "Deprecated by" and nothing else (`docs/cc/2026-10-06-adr-pdr-ground-rules.md:90-95`, D23 at `:316-321`, D24 at `:323-328`). Putting built state there would also cover the wrong set, since under D18 an uncontested behaviour has no record.
- **Task files stop being the cumulative view.** Task D1 (`docs/cc/2026-10-07-task-file-ground-rules.md:22-28`, `:132-138`) freezes a file at merge, keeps it for debugging only, and tests it by whether deleting it would lose nothing the repository still needs. Its reasoning (`:136`) says the durable homes already exist, the PDRs for requirements and the code for mechanism. The code holds what is built, but no product-side reader opens it: task D3 (`:36-43`) has the engineer read code only when a report points to it, and record D22 (`docs/cc/2026-10-06-adr-pdr-ground-rules.md:122-126`) gives a PDR's reader no technical context. Today the planning skill reads every task file as that view (`docs/cc/2026-10-07-task-file-ground-rules.md:328`).
- **Comments describe the present, one site at a time.** Comment rule 5 (`docs/cc/2026-10-03-comment-vocabulary-and-rules.md:70-76`) makes every comment current, and nothing assembles them.
- **The README's Status paragraph is the only live statement.** `README.md:57-59` lists what is built, what is a placeholder and what is implemented but unexposed, for a reader deciding whether to use the app. The engineer's position is that this is not the README's job.

The gap is therefore a consequence of the reform, opened where task D1's reasoning assumed a durable home for product state that the other rules do not provide.

## The document the session converged on, and why it was dropped

The engineer proposed a document for the product owner that says what is built, separate from PDRs because a PDR is a decision with a reason and a status of Active or Superseded, never built or unbuilt, and folding built state into it would couple two things. The engineer's own correction of their earlier wording: PDRs are not "the product" but how the product should be and why, from a product owner's view, serving a user; the new document would say what is built, and reading the two together would show what is decided and not built.

The shape the session had converged on before the drop, none of it in force:

- The file is `docs/behaviour.md`, named so because "product" would read as including what is not built. It lives as long as the app, says at every moment what the app does on main, taken from the code, never what it used to do or will do, and any sentence checked against the code on main is true.
- It names no record, document, file or symbol, and says what the app does in its own words. The engineer added "for now": whether it may later name PDRs was left open.
- It is written for the engineer and the planner. The engineer reads it to know what the app does today, and against the PDRs to see where the two differ, before deciding what to build next; the planner reads it to check a proposal against what is already built.
- It is updated on a cycle's branch only after the engineer deems the feature or fix complete, right before the merge into main. Updating after the merge was rejected because main would then carry code the file does not describe; updating inside the last task was rejected because no task should own the file.
- It is a set of use cases after Cockburn, each at sea level, one goal a user achieves in one sitting, with the app as a black box, which gives it a completeness test: every such goal has a use case. Organisation by screen, by entity and by PDR were rejected, the last on coverage.
- The form of a use case was the point reached when the engineer stopped: a title as a verb phrase, preconditions, minimal guarantee, success guarantee, a numbered main success scenario and extensions numbered against the step they leave, with stakeholders and interests, trigger, scope, level and technology variations left out as intent or mechanism.

The engineer then dropped the whole idea and chose to keep things as they are: task files were made ephemeral by task D1, but they are the natural answer to what was built, and the engineer will see how that goes before adding a document type.

The session named one tension in that choice, which the engineer accepted knowingly. Task D1 keeps a task file "for debugging only" and tests it by deletion losing nothing the repository still needs. If task files are the answer to what was built, they are needed after the merge and that test fails for every one of them. Either task D1's purpose widens to include that answer, or the gap returns the first time the planner needs the current product and finds only frozen per-cycle files. The session's recommendation at the time was to keep the document, and the engineer's decision went the other way.

## Open questions

None of these is decided. Nothing here should become a default downstream.

1. **The revisit condition.** The built-behaviour document is revisited when one of two things happens: a planning session needs to know what the app does today and cannot assemble it from the frozen task files, or the engineer wants to compare the PDRs with what is built and has nothing to compare them against. At that point task D1's deletion test and "debugging only" purpose are the rules the answer contradicts or extends. The shape above is the starting point, not a decision.
2. **Completeness of the PDR set.** Under record D8 the PDRs are the requirements, and under D18 only contested decisions get a record, so nothing lists what a user can do with the app. Whether that matters was not decided. A list of sea-level goals is the Cockburn-shaped alternative the record session never weighed against D8.
3. **Cockburn's altitude as D17's threshold.** Record D17 sets no threshold and carries examples instead. The session observed that goal levels could supply one for PDRs and did not propose it.
4. **The README's Status paragraph.** `README.md:57-59` is the one live statement of what is built, written for an outsider. Whether it stays as the only such statement, and who keeps it true, was not raised beyond the engineer's view that it is not the README's purpose.

## Related

- **`docs/cc/2026-10-06-adr-pdr-ground-rules.md`.** Finding 1 reads its D5, D6, D9, D15, D16, D17, D19 and D20 against Cockburn and extends none of them. The D8 observation is new. Its D7 and D8 both rejected "a living behaviour document" (`:206`, `:213`) as the home of product decisions; the dropped document would have been one in a different role, as the home of built state, and the session named Nygard's reason against large documents as applying to it whatever its role. Its D25 (`:72-74`) was the rule a document citing PDRs would have had to extend; the dropped shape cites nothing, so the question did not arise.
- **`docs/cc/2026-10-07-task-file-ground-rules.md`.** Finding 2 rests on its D1, D2 and D3. The engineer's closing choice, task files as the answer to what was built, is in tension with D1's purpose and deletion test as recorded above. Its D11 (`:84-87`) was the reason the dropped document could not be a task's file.
- **`docs/cc/2026-10-03-comment-vocabulary-and-rules.md`.** The dropped document's reference rule borrowed rule 4's "complete without any reference" (`:62-68`), and its present-state rule borrowed rule 5 (`:70-76`).
- **`README.md`.** `:51` says every design decision is in `docs/adr/`; `:57-59` is the Status paragraph. Neither is changed.
- **ADRs.** None was read, at the engineer's instruction, and none is contradicted, because nothing is decided.
- **Skills.** The engineer said the document would have been maintained by the sync step and read by the planning step, if those survive the reform. No skill is changed.
