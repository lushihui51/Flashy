# Cycle file rules

**Lifetime.** A cycle file serves one cycle. Once the cycle's work is merged to main, the file is complete and is never edited again. It stays in the repository for debugging only: to see what the builder was asked and what it reported. The test: after the merge, deleting the file would lose nothing the repository still needs. No tracked file cites a cycle file, as a rule or as history; the only exception is a commit message.

**Readers.** A cycle file is written for the builder of its cycle: an agent that has read AGENTS.md, can read anything in the repository, and has not seen the planning conversation. A cycle file is read as a whole by the engineer first to approve it before it's built, and is read one task at a time to supervise each building session.

**Edits before the merge.** Until the cycle's merge, the builder writes a task's Status and Debrief and, for a path outside the task's Files that the engineer approves, the Files and Dependencies lines that path changes; every other edit is the planner's, made by /cycle-plan.

**Commits.** A task's commit holds its code, tests and cycle-file edit; its message is the repository's `type:` prefix, the task's Goal as the statement, and `(cycle NNN Tn)`. The cycle file's own commit, by the planner, has the message `docs: plan cycle NNN, <title>`.

**Purpose.** For the builder, a cycle file is the whole of what it is told for the cycle: what to build; why, through the records it names; how, as constraints the build must keep and guidance on the best way to build it; and what must be true when each task is done. For the engineer, it is the instrument of approval before building and of supervision during it: each task is judged from the builder's debrief against the file and by testing the app on a live server, and code is read only if the debrief points to it.

## The cycle

**Sections.** Title; Goal, the cycle's outcome, scope and judgement; Records, the records the builder reads before building; Tasks. In that order. Every section appears; one with nothing to hold reads "None."

**Title.** A unique number in ascending order and a short noun phrase naming the cycle's outcome. The file is docs/cycles/NNN-<slug>.md, the slug taken from the phrase.

**Goal.** Three labelled paragraphs, in prose, in this order. Outcome: the cycle's approved outcome, stated in one sentence. Scope: what the cycle covers and what it leaves out. Judgement: what the engineer checks, and where, to accept the cycle as a whole. Never say what prompted the cycle or how it was planned.

**Records.** One line per active record, ADR or PDR: its number and title. Never restate the record's decision or its reasons; the builder reads the record.

**Canvas.** When a task cites a drawing, the cycle has a canvas of its own, linked on the line under the title as "Canvas: " and the link. /cycle-plan makes it from the docket's canvas, holding only the drawings the cycle's tasks cite, each under its number and letter from the docket's canvas. Only the planner edits it before the cycle's merge, and no one edits it after.

## A task

**Parts of a task.** Status; Goal, what the task delivers; Dependencies, the tasks that must be done first, and which of their interfaces this task uses; Files, the paths it may touch; Details, guidance on the best way to build it, and every interface it creates, written out exactly; Out of scope, what it must not do; Done when, what must be true when it is done; Debrief, what the builder reports when it is done. In that order. Every part appears; one with nothing to hold reads "None."

**Task heading.** A task is headed by its number, T1 upward in the order the tasks are to be built, and a short noun phrase naming what it delivers.

**Cut.** A task leaves the branch working with its tests green when it completes; work that would leave the branch broken until another task is done belongs in that task. Work with no checkable criterion of its own rides in a task whose evidence shows it.

**Status.** A task's status is one of three: not started, "- [ ]"; done, "- [x]", set in the task's commit, once every Done-when criterion holds; blocked, "[BLOCKED]" after the checkbox, set when the builder stops on something the file cannot settle, with the reason in the Debrief.

**Goal of a task.** One sentence: what is true once the task is done that was not before. Never how.

**Dependencies.** One line per task that must be done first: its number, and the interfaces of it this task uses, by name. Two tasks neither of which depends on the other, directly or through others, share no file.

**Files.** Every path the task may create or change, exact, from the repository root, marked new where it does not exist yet; a generated file counts. A path not listed is not touched.

**Details.** A sentence is one of two kinds, told apart by its wording: a constraint, "must" or "never", which the builder keeps; or guidance, the best way the planner knows, which the builder may depart from. A lesser decision placed here is a constraint. A drawing cited from the cycle's canvas, by its number and letter, is guidance. An interface is written as code. A constraint that a record decided names the record; never restate its reasons. Never restate what the code shows; name the file or symbol to read instead.

**Out of scope.** What a builder would be tempted to add here and must not, one line each, with where it belongs: another task by number, a later cycle, or never.

**Done when.** One line per criterion, each checkable by the builder alone and each yielding evidence for the Debrief: a command and its exact expected output, a test by name that must pass, or a behaviour to observe and where. Never a judgement such as "works correctly". Never a check AGENTS.md already requires of every commit. The last task's Done when carries the cycle's judgement.

**Debrief.** Written by the builder, in the file, when the task is done or blocked. Done: the evidence for each Done-when criterion, in order; every departure from Details or Files; and what in the code the engineer should read, if anything, and why. Blocked: what was attempted, what was found, and why the file cannot settle it. Never restate the task.

**Writing.** Every sentence is a statement or an imperative. Never "appropriate", "as needed", "etc.", "handle edge cases", "robust", "clean up", or any wording that leaves the builder to guess what was meant; what the planner cannot state exactly is an unsettled decision, one that no record and no docket item settles, and is never written around. Name code by file and symbol, never by line number.
