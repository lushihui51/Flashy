# Cycle file ground rules: the 2026-10-07 plan session

**Date:** 2026-10-07.

**Prompted by:** the documentation reform on `process/reform`, continuing from the comment session in `docs/reports/2026-10-03-comment-vocabulary-and-rules.md` and the record session in `docs/reports/2026-10-06-adr-pdr-ground-rules.md`. The engineer wants cycle files to be the spec in a spec-driven process in which they never touch code and only review and guide the spec, and asked for ground rules so builders are less confused and build better. The session was to settle an audience and a purpose first, then one small, concrete decision at a time.

**Outcome:** diagnosis only, no code changes. Nineteen decisions (D1 to D19) are confirmed on what a cycle file is, who reads it, what it is for, and what each of its parts holds. They are pending /code-decompose and /code-justify. Where the rules live was deferred, as in both earlier sessions. No existing cycle file, record, AGENTS.md line, or skill is changed by this session.

**Grounding.** As in the record session, this report is grounded in the decisions made here. `AGENTS.md` and the skills under `~/.claude/skills` are subjects of the reform; where this report quotes them it describes what they say today, as evidence, never as a rule in force.

Every code and doc cite is against `1d97ef3`, with a clean working tree. Skill cites are against `~/.claude/skills` commit `76a9aac`, which carried uncommitted edits to `code-build/SKILL.md` and `suites/code.md`; the lines cited here are from the committed text.

The D-numbers are this session's. The two earlier reports have their own sets, and the three are unrelated except where this report names one.

**Terms.** Following the engineer's correction in this session: "user" is a person using the app; the human building it is "the engineer". The agent that builds a task is "the builder"; the agent in a planning session is "the planner".

## The rules as confirmed

This is the text the engineer confirmed, in the order a reader of a cycle file meets it. D4 and D5 were amended in place twice each; D3 twice; D13 once. The amended text is given.

```text
Lifetime. A cycle file serves one cycle. Once the cycle's work is merged to
main, the file is complete and is never edited again. It stays in the
repository for debugging only: to see what the builder was asked and what
it reported. The test: after the merge, deleting the file would lose
nothing the repository still needs. No tracked file cites a cycle file, as a
rule or as history; the only exceptions are a docs/reports report and a commit
message. (D1)

Readers. A cycle file is written for the builder of its cycle: an agent that
has read AGENTS.md, can read anything in the repository, and has not seen
the planning conversation. A cycle file is read as a whole by the engineer
first to approve it before it's built, and is read one task at a time to
supervise each building session. (D2)

Purpose. For the builder, a cycle file is the whole of what it is told for
the cycle: what to build; why, through the records it names; how, as
constraints the build must keep and guidance on the best way to build it;
and what must be true when each task is done. For the engineer, it is the
instrument of approval before building and of supervision during it: each
task is judged from the builder's report against the file and by testing
the app on a live server, and code is read only if the report points to
it. (D3)

Sections. Title; Goal, the cycle's single outcome, its scope, and how the
engineer will judge it; Records, the records the builder reads before
building; Tasks. In that order. Every section appears; one with nothing to
hold reads "None." (D4)

Title. A unique number in ascending order and a short noun phrase naming
the cycle's outcome. The file is docs/cycles/NNN-<slug>.md, the slug taken
from the phrase. (D6)

Goal. Three things, in prose: the outcome in one sentence; the scope, what
the cycle covers and what it leaves out; and the judgement, what the
engineer will check, and where, to accept the cycle as a whole. Never say
what prompted the cycle or how it was planned. (D7)

Records. One line per record, ADR or PDR, in force: its number and title.
Never restate the record's decision or its reasons; the builder reads the
record. (D8)

Parts of a task. Status; Goal, what the task delivers; Dependencies, the
tasks that must be done first, and which of their interfaces this task
uses; Files, the paths it may touch; Details, guidance on the best way to
build it, and every interface it creates, written out exactly; Out of
scope, what it must not do; Done when, what must be true when it is done;
Report, what the builder reports when it is done. In that order. Every
part appears; one with nothing to hold reads "None." (D5)

Task heading. A task is headed by its number, T1 upward in the order the
tasks are to be built, and a short noun phrase naming what it delivers.
(D17)

Status. A task's status is one of three: not started, "- [ ]"; done,
"- [x]", set in the task's commit, once every Done-when criterion holds
and the engineer has approved the task; blocked, "[BLOCKED]" after the
checkbox, set when the builder stops on something the file cannot settle,
with the reason in the Report. (D9)

Goal of a task. One sentence: what is true once the task is done that was
not before. Never how. (D10)

Dependencies. One line per task that must be done first: its number, and
the interfaces of it this task uses, by name. Two tasks neither of which
depends on the other, directly or through others, share no file. (D11)

Files. Every path the task may create or change, exact, from the
repository root, marked new where it does not exist yet; a generated file
counts. A path not listed is touched only with the engineer's approval.
(D12)

Details. A sentence is one of two kinds, told apart by its wording: a
constraint, "must" or "never", which the builder keeps; or guidance, the
best way the planner knows, which the builder may depart from and then
says so in the Report. An interface is written as code. A constraint that
a record decided names the record; never restate its reasons. Never
restate what the code shows; name the file or symbol to read instead.
(D13)

Out of scope. What a builder would be tempted to add here and must not,
one line each, with where it belongs: another task by number, a later
cycle, or never. (D14)

Done when. One line per criterion, each checkable by the builder alone and
each yielding evidence for the Report: a command and its exact expected
output, a test by name that must pass, or a behaviour to observe and
where. Never a judgement such as "works correctly". Never a check
AGENTS.md already requires of every commit. (D15)

Report. Written by the builder, in the file, when the task is done or
blocked. Done: the evidence for each Done-when criterion, in order; every
departure from Details or Files; and what in the code the engineer should
read, if anything, and why. Blocked: what was attempted, what was found,
and why the file cannot settle it. Never restate the task. (D16)

Writing. Every sentence is a statement or an imperative. Never
"appropriate", "as needed", "etc.", "handle edge cases", "robust", "clean
up", or any wording that leaves the builder to guess what was meant; what
the planner cannot state exactly is an unsettled decision and is raised,
never written around. (D18)

Edits before the merge. Until the cycle's merge, the builder writes only a
task's Status and Report; every other edit is the planner's, made in a
planning session. (D19)
```

## Decisions

Each entry gives what was decided, why, and what was rejected. Where the session proposed wording the engineer replaced, the entry says so.

### D1: lifetime

A cycle file serves one cycle, is complete and frozen once the cycle's work is merged to main, and is kept for debugging only. The test is that deleting it after the merge would lose nothing the repository still needs. No tracked file cites it, as a rule or as history; a docs/reports report and a commit message are the only exceptions.

- **Why:** the engineer's choice of spec-first, in Böckeler's sense: the spec is written before the code and not maintained after. Today's files are authored once and then patched for weeks, and a builder reading one cannot tell an instruction from history from a rule still in force. The durable homes already exist: the record session's D8 makes the PDRs the requirements, and its D16 sends mechanism to the code.
- **Rejected:** a living spec per area, maintained across cycles, which contradicts the record session's D8 and would pay its D1 restatement cost a second time; a split into a per-cycle work order plus a new living-spec type; "even as history" applied to reports and commit messages, which the engineer carved out because a report is the debugging use and a commit message is not a tracked file.
- **Consequences named in the session:** sync stops writing "Superseded since" sections; cross-cycle bookkeeping such as `docs/cycles/022-practice-row-configuration-label.md:5-9` goes; records stop saying "Implemented by cycle" and "cycle 015 T9's Notes line found the gap"; comments and test names stop citing a cycle, T, D, MD, phase or section number. This closes the comment session's open question 2 and the record session's open question 2.

### D2: readers

Written for the builder of its cycle, an agent that has read AGENTS.md, can read anything in the repository, and has not seen the planning conversation. Read whole by the engineer to approve it before building, and one task at a time to supervise each build session.

- **Why:** the writer must know what the builder has read against what it can look up. The engineer's refinement: the builder has read AGENTS.md only, has the whole repository including earlier cycle files, and rarely needs one, since under D1 they are for debugging. The session's draft had the builder "has read the records the file names"; the engineer's wording moves that to what the file tells the builder to read.
- **Rejected:** the session's draft, which repeated D1, described what each reader does with the file (moved to D3), and named a builder who has read every record in force. The 68 records run to roughly 37,000 words and the set only grows.
- **Terms fixed here:** "user" is a person using the app; the human is "the engineer".

### D3: purpose

For the builder, the whole of what it is told: what, why through records, how as constraints and guidance, and what must be true when done. For the engineer, approval before and supervision during, judged from the report and by testing on a live server, reading code only if the report points to it.

- **Why:** the engineer does not actively read the diff; they read the builder's report and test the app, and open code only when pointed to. The engineer added the "why" and "how" items: the records paint the picture, and the file may constrain and guide how the builder builds.
- **Rejected:** the session's draft with what and done-when only, which left "how" open; "where the report points" in favour of "if the report points to it".

### D4: sections

Title, Goal, Records, Tasks, in that order; every section appears, with "None." when empty.

- **Why:** derived from D3's four items plus the file's entry point. The engineer's Goal definition, "the cycle's single outcome, its scope, and how the engineer will judge it", replaced the session's "what the app does after this cycle that it does not now". The engineer wants sections always present for uniformity, never forced to hold content.
- **Rejected:** today's "Minor decisions" and "Deferred" sections. A minor decision dies with the file under D1, so it is a constraint inside a task, with its comment at the code per the record session's D18; a deferred item is an Out of scope line. A "Contracts" section, first confirmed and then removed by amendment, below.
- **History:** confirmed with "Records and Contracts appear only when there is something to put in them"; amended in place to "every section appears"; amended in place again to drop Contracts when the engineer withdrew the session's D9 proposal in favour of folding it into D4 and D5.

### D5: parts of a task

Status, Goal, Dependencies, Files, Details, Out of scope, Done when, Report, in that order; every part appears, with "None." when empty.

- **Why:** today's structure, with Dependencies lifted out of the heading, and Notes renamed Report because D1 keeps the file "to see what the builder was asked and what it reported" and D3 makes the report the engineer's evidence.
- **Rejected:** cycle 022's "Commit" line, by omission from the list; a "Minor decisions" part.
- **History:** amended in place with D4 to "every part appears"; amended again to carry what the withdrawn Contracts section held: Dependencies gained "and which of their interfaces this task uses", Details gained "and every interface it creates, written out exactly". The session's first wording of the Dependencies clause was rejected as confusing; the engineer's "the tasks that must be done first and their interfaces this task uses" became the confirmed form.

### The withdrawn Contracts section

The engineer asked whether Contracts exist for parallel building, and whether a shared interface does not already force a dependency. The session agreed: an interface is defined in a file; a task that uses one another task creates cannot be built or tested until that task is done; so it depends on it, runs after it, and its builder reads the real signature (D2). Every Contracts section in cycles 016 through 022 has one task that creates each interface and consumers that already declare a dependency on it. What Contracts also did, and where it goes: the planner writes the consumer's Details against "as T1 creates it" instead of a pinned shape; the engineer still sees every shape, in the creating task, because they read the whole file; a rule several independent tasks apply, such as cycle 021's table at `docs/cycles/021-empty-state-add-button.md:19-33`, is the record behind it, ADR 066 there.

The session proposed this as D9. The engineer chose instead to amend D4 and D5 in place and withdrew the number, which the next decision reused.

The question of whether an interface is mentioned in the consumer or the producer was settled for the consumer: a dependency is declared by the one that needs it; a forward list in the producer goes stale on replan and the producer may already be committed; the shape has one home, the producer's Details.

### D6: title

A unique number in ascending order and a short noun phrase naming the cycle's outcome; the file is `docs/cycles/NNN-<slug>.md`, the slug from the phrase.

- **Why:** the engineer's wording. A number keeps the directory ordered and gives commit subjects something to cite.
- **Rejected:** the engineer's own earlier addition that the slug is also the cycle's branch, and the session's wording of it as `<prefix>/<slug>`; both withdrawn by the engineer.

### D7: Goal

Outcome in one sentence, scope, and the engineer's judgement of the cycle as a whole, in prose. Never say what prompted the cycle or how it was planned.

- **Why:** D4's definition of the section, written out. The last sentence replaces today's intro paragraphs, which carry the prompting report, the planning date, the branch, and earlier cycle files affected (`docs/cycles/022-practice-row-configuration-label.md:3-11`); under D2 none of that is for the builder.
- **Rejected:** "Nothing on what prompted the cycle", replaced at the engineer's instruction by "Never say", because the text is read by an agent and a rule is worded as an imperative.

### D8: Records

One line per record in force, number and title; never restate the decision or its reasons.

- **Why:** D2 has the file name what the builder must read, and the builder reads the record itself.
- **Rejected:** the session's "then what in this cycle it binds" on each line. The engineer asked whether it was necessary; it is not, because each task cites the record where it binds (D13), so the section is only the reading list.

### D9: Status

Not started, done, or blocked. Done is set in the task's commit, once every Done-when criterion holds and the engineer has approved the task. Blocked carries its reason in the Report.

- **Why:** the engineer added approval and the commit to "done". Today's build skill checks a task off when the criteria pass and commits after the engineer confirms (`code-build/SKILL.md:21`); under D9 the checkbox and the commit are one event, after approval.
- **Rejected:** the session's first wording, which did not say whose status it was; an "in progress" state, raised as an open point because `code-build/SKILL.md:16` lets a session pick "the next unchecked task whose dependencies are all checked off" and AGENTS.md allows several sessions in one checkout. The engineer dropped it: the build skill will be reformed.

### D10: Goal of a task

One sentence, what is true once the task is done that was not before; never how.

### D11: Dependencies

One line per prerequisite task, its number and the interfaces of it this task uses by name. Two tasks neither of which depends on the other, directly or through others, share no file.

- **Why:** the second sentence is what makes parallel build sessions safe, carried from `code-decompose/SKILL.md:23`. Shared files need no mention in either task, since each lists its Files.

### D12: Files

Every path the task may create or change, exact, marked new where it does not exist yet; generated files count; a path not listed is touched only with the engineer's approval.

- **Why:** the approval clause gives the builder a rule for the file a build turns out to need, instead of a blanket ban that would block it.

### D13: Details

Two kinds of sentence, told apart by wording: a constraint, "must" or "never", which the builder keeps; and guidance, which the builder may depart from and then reports. An interface is written as code. A constraint a record decided names the record, never its reasons. Never restate what the code shows; name the file or symbol.

- **Why:** D3's "constraints the build must keep and guidance on the best way", made operational: the builder needs to know which sentences it may depart from. The record clause is D8's reading rule applied at the point of use. The last sentence follows from D2's builder, who can open any file.
- **Wording:** the engineer asked what "a choice made by a record cites it" meant; the sentence became "a constraint that a record decided names the record".

### D14: Out of scope

What a builder would be tempted to add and must not, one line each, with where it belongs: another task by number, a later cycle, or never.

- **Rejected:** "naming the record that rejected it" after "never"; there may be no such record.

### D15: Done when

One line per criterion, checkable by the builder alone, each yielding evidence for the Report: a command and its exact expected output, a test by name, or a behaviour and where to observe it. Never a judgement word. Never a check AGENTS.md already requires of every commit.

- **Why:** D3 makes the report the engineer's evidence, so a criterion whose only check is reading the code cannot be judged. The last sentence follows from D2: the builder has read AGENTS.md, so today's per-task repetition of `npx vitest run`, `npm run lint` and `npm run build` is noise.

### D16: Report

Written by the builder, in the file, when the task is done or blocked. Done: evidence per criterion in order, every departure from Details or Files, and what in the code the engineer should read and why. Blocked: what was attempted, what was found, why the file cannot settle it. Never restate the task.

- **Why:** D1 keeps the file for "what it reported"; D3 has the engineer judge from the report and read code only where it points; D9 and D13 send the blocked reason and guidance departures here. Today the report is a one-line Notes entry plus a chat message that is lost (`code-build/SKILL.md:20-21`).

### D17: task heading

Number, T1 upward in build order, and a short noun phrase.

- **Why:** D11 and D14 refer to a task "by number" and nothing had said how a task is numbered or headed.

### D18: writing

Every sentence a statement or an imperative; the banned words; what cannot be stated exactly is an unsettled decision, raised rather than written around.

- **Why:** carried from `code-decompose/SKILL.md:30` into the file's own rules.

### D19: edits before the merge

Until the merge, the builder writes only Status and Report; every other edit is the planner's, in a planning session.

- **Why:** D1 covers the file after the merge; this covers it before. It is `code-build/SKILL.md:10` restated as a property of the file.

### Readings and corrections the engineer gave on method

Not decisions about cycle files, recorded because they shaped the wording:

- A decision's text states only that decision: no sentence repeats an earlier decision, and none settles something that belongs to a later one. The session's first D2 draft was rejected on both counts.
- A rule an agent will read is worded as an imperative: "Never say", not "Nothing on".
- An amendment to a confirmed decision is made in place, with old and new shown before approval, rather than as a new number. D4 and D5 were amended this way; the Contracts proposal was withdrawn rather than numbered.

## What the cycle files do now

Evidence gathered at `1d97ef3`. Counts come from shell passes; treat them as approximate where the text says so.

### The 22 files

- `docs/cycles/` holds 22 files, 4,338 lines in all. The largest is `docs/cycles/003-frontend-rebuild-creation-flows.md` at 910 lines; the smallest `docs/cycles/007-primary-field.md` at 34.
- Every file has, in order, the sections "ADRs", "Minor decisions", "Contracts", "Tasks". 13 open with a "Superseded since" section; 6 end with a "Deferred" section. The layout matches `suites/code.md:31`.
- "Superseded since" holds 61 bullets across the 13 files. `docs/cycles/004-practice-setup.md:9-18` is the longest, seven bullets dated from 2026-09-14 to 2026-10-01.
- 112 Contracts subsections across the 22 files. In cycles 016 through 022 each interface has one creating task and its consumers declare a dependency on that task: `docs/cycles/022-practice-row-configuration-label.md:151` gives the chains, and T6 at `:287` depends on T3 and T4 for the shapes at `:69-96`.
- 114 Notes lines; 3 read exactly "none". The rest carry as-built facts, deviations, and test results: `docs/cycles/022-practice-row-configuration-label.md:180` and `:320` are typical.
- Cycle 022 alone adds a `**Commit:**` line per task (`:179`, `:203`, `:234`, `:256`, `:284`, `:319`).

### Edits after authoring

| File | Commits | First | Last | Sync-type commits |
| --- | --- | --- | --- | --- |
| 001 | 11 | 2026-08-25 | 2026-09-28 | 8 |
| 004 | 13 | 2026-08-25 | 2026-10-01 | 6 |
| 015 | 17 | 2026-09-24 | 2026-10-01 | 5 |
| 022 | 5 | 2026-10-02 | 2026-10-02 | 0 |

"Sync-type" counts commits whose subject mentions sync, distill, or superseded. Ten files were last edited two or more weeks after their first commit.

### Who cites a cycle file

| Where | Count |
| --- | --- |
| `AGENTS.md` lines | 6 (`:39`, `:46`, `:63`, `:71`, `:74`, `:85`) |
| `README.md` lines | 1 (`:55`) |
| ADR files, of 68 | 37 |
| ADR Status lines (line 5) | 18, of which "Implemented by cycle" 11 |
| `app/` lines | 15 |
| `tests/` lines | 10 |
| `frontend/src/` lines, non-generated | 16 |
| `frontend/src/api/types.ts` lines, generated | 5 |
| Test names citing a cycle, MD, T or phase | 19 |
| docs/reports reports, of 19 | 12 |
| Commit subjects on any branch, "(cycle NNN" | 62 |

- Two AGENTS.md lines point at rules that live only in a cycle file: `AGENTS.md:46` at the vocabulary table in `docs/cycles/004-practice-setup.md:40-61`, and `AGENTS.md:63` at the delta-semantics contract in `docs/cycles/010-mastery-log.md`. The record session's report noted these as living contracts inside cycle files and left them to this part of the reform; the engineer put their relocation outside this session.
- `AGENTS.md:85` describes cycle files as "(one per cycle, per-task Notes, "Superseded since" corrections)".
- `README.md:55` says the cycle file "pins the contracts the tasks share and gives every task checkable done-criteria".
- Context citations in records: `docs/adrs/057-every-field-create-writes-the-dense-value-rows.md:11` opens with "The 2026-09-24 investigation of cycle 015 T9's Notes line found the gap"; `docs/adrs/045-alembic-is-the-only-schema-path.md:13` says "happened during the mastery-ledger cycle (cycle 010)"; `docs/adrs/064-the-health-endpoint-is-the-one-unauthenticated-route.md:61` defers to "cycle 020 MD-1".
- Code citations: `app/models/practice_deck.py:46` names "cycle 022 T2"; `frontend/src/components/practice/ConfigurationPickList.tsx:15` names "cycle 019 MD-6"; `app/routers/api/deletion_impact.py:28` names "cycle 013 MD-2".

### What the skills say today

Evidence only; the engineer rewrites the skills.

- `code-decompose/SKILL.md:11`: "the cycle file for a piece of work is a living document". `:16`: the sections "Decisions (pending /code-justify)", "ADRs", "Minor decisions", "Contracts", "Tasks". `:24`: "Pin contracts up front. Any interface two tasks share ... is written out exactly in "Contracts" before any task references it." `:28`: Goal, Files, Details, Out of scope, Done when. `:30`: the banned words. `:32`: the checkbox and the "Notes:" line. `:34`: the self-review "as a builder with no memory of this conversation, reading only this file and the code".
- `code-build/SKILL.md:10`: the builder writes "checkboxes, "Notes:" lines, "[BLOCKED]" markers and replan briefs" and never a task's Goal, Files, Details, Out of scope, Done when or Contracts. `:16`: "the next unchecked task whose dependencies are all checked off". `:20`: the review guide, in chat. `:21`: check off when "Done when" passes, then commit after the engineer confirms.
- `code-sync/SKILL.md:12`: "status corrections in cycle files". `:20`: "Any checked task whose "Done when" criteria no longer hold against the current code?" `:22`: "does each cycle file's "Contracts" section still match the interfaces as actually implemented?"
- `code-distill/SKILL.md:22`: per-feature state "lives in docs/cycles/". `:30`: conventions "in repeated Notes lines".
- `code-plan/SKILL.md:14`: a planning session reads every cycle file.
- `suites/code.md:31-33`: the shared vocabulary of section names, task structure, and markers, to be changed "everywhere or nowhere".

D1, D4, D5, D9, D16 and D19 each change what one or more of these lines describe.

## Open questions

None of these is decided. Nothing here should become a default downstream.

1. **Where the rules live.** Deferred, as in both earlier sessions. The same options stand: the full text in `AGENTS.md`; a rules file in the repo with one pointer line in `AGENTS.md` and a record for the reasoning; or a record alone. The three sets of rules now deferred on the same question are the comment rules, the record rules, and these. It blocks /code-decompose for all three.
2. **The living contracts.** The vocabulary table (`docs/cycles/004-practice-setup.md:40-61`, pointed at by `AGENTS.md:46` and `docs/adrs/021-user-facing-vocabulary-never-exposes-schema-terms.md:13`) and the delta-semantics contract (`docs/cycles/010-mastery-log.md`, pointed at by `AGENTS.md:63`) violate D1's deletion test today. The engineer put their review outside this session; the rules apply to cycle files written from now on.
3. **Retrofit of existing citations.** The 37 records, 41 source and test lines, 19 test names, and 6 AGENTS.md lines that cite a cycle file are reform work for their own planning, like the record session's open question 3.
4. **The build skill's task selection.** An "in progress" state was dropped because the build skill will be reformed; whether two sessions in one checkout can pick the same task is then the skill's problem.
5. **Task size and slicing.** `code-decompose/SKILL.md:21-22` requires vertical slices sized by review effort. Not raised in this session; it is a rule about how tasks are cut, and whether it is a property of the file or of the decompose step was not decided.
6. **Cycle and branch.** D1 ends a file's life at "merged to main". Whether one cycle file is always one branch merged once was not decided; D6's branch clause was withdrawn.

## Related

- **`docs/reports/2026-10-03-comment-vocabulary-and-rules.md`.** Its D5 left open "a line forbidding references to cycle files and to MD, T, D, phase, or section numbers" until cycle files were redefined. D1 here closes it: a comment is in a tracked file, so it never cites a cycle file or any number inside one. Its D2 reader, who "has not read any ADR or cycle file", is consistent with D2 here.
- **`docs/reports/2026-10-06-adr-pdr-ground-rules.md`.** Its open question 2, cycle-file citations inside records, is closed by D1 here: a record never cites a cycle file. Its D18, a decision a builder could reverse inside a task gets a comment at the code, is what D4 relies on in dropping "Minor decisions". Its D22 names a reader per record type; D2 here does the same for cycle files. Its "Living contracts inside cycle files" section is open question 2 here.
- **`AGENTS.md`.** Lines `:39`, `:46`, `:63`, `:71`, `:74` and `:85` cite cycle files or describe their old shape and stop being true under D1 and D4 once the rules are in force. None is changed here.
- **`README.md:55`.** "pins the contracts the tasks share" stops being true under the amended D4 and D5.
- **ADRs.** No record decides anything about cycle files, so none is contradicted and /code-justify starts from nothing. The 37 that cite cycle files are open question 3.
- **Skills.** Named under "What the skills say today". `suites/code.md:31-33` lists the strings D4, D5, D9 and D16 change.
