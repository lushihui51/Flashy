# Cycle file rules

**Lifetime.** A cycle file serves one cycle. Once the cycle's work is merged to main, the file is complete and is never edited again. It stays in the repository for debugging only: to see what the builder was asked and what it reported. The test: after the merge, deleting the file would lose nothing the repository still needs. No tracked file cites a cycle file, as a rule or as history; the only exceptions are a docs/reports report and a commit message.

**Readers.** A cycle file is written for the builder of its cycle: an agent that has read AGENTS.md, can read anything in the repository, and has not seen the planning conversation. A cycle file is read as a whole by the engineer first to approve it before it's built, and is read one task at a time to supervise each building session.

**Edits before the merge.** Until the cycle's merge, the builder writes only a task's Status and Debrief; every other edit is the planner's, made by /code-plan.

**Purpose.** For the builder, a cycle file is the whole of what it is told for the cycle: what to build; why, through the records it names; how, as constraints the build must keep and guidance on the best way to build it; and what must be true when each task is done. For the engineer, it is the instrument of approval before building and of supervision during it: each task is judged from the builder's debrief against the file and by testing the app on a live server, and code is read only if the debrief points to it.

## The cycle

**Sections.** Title; Goal, the cycle's single outcome, its scope, and how the engineer will judge it; Records, the records the builder reads before building; Tasks. In that order. Every section appears; one with nothing to hold reads "None."

**Title.** A unique number in ascending order and a short noun phrase naming the cycle's outcome. The file is docs/cycles/NNN-<slug>.md, the slug taken from the phrase.

**Goal.** Three things, in prose: the outcome in one sentence; the scope, what the cycle covers and what it leaves out; and the judgement, what the engineer will check, and where, to accept the cycle as a whole. Never say what prompted the cycle or how it was planned.

**Records.** One line per active record, ADR or PDR: its number and title. Never restate the record's decision or its reasons; the builder reads the record.

## A task

**Parts of a task.** Status; Goal, what the task delivers; Dependencies, the tasks that must be done first, and which of their interfaces this task uses; Files, the paths it may touch; Details, guidance on the best way to build it, and every interface it creates, written out exactly; Out of scope, what it must not do; Done when, what must be true when it is done; Debrief, what the builder reports when it is done. In that order. Every part appears; one with nothing to hold reads "None."

**Task heading.** A task is headed by its number, T1 upward in the order the tasks are to be built, and a short noun phrase naming what it delivers.

**Status.** A task's status is one of three: not started, "- [ ]"; done, "- [x]", set in the task's commit, once every Done-when criterion holds and the engineer has approved the task; blocked, "[BLOCKED]" after the checkbox, set when the builder stops on something the file cannot settle, with the reason in the Debrief.

**Goal of a task.** One sentence: what is true once the task is done that was not before. Never how.

**Dependencies.** One line per task that must be done first: its number, and the interfaces of it this task uses, by name. Two tasks neither of which depends on the other, directly or through others, share no file.

**Files.** Every path the task may create or change, exact, from the repository root, marked new where it does not exist yet; a generated file counts. A path not listed is touched only with the engineer's approval.

**Details.** A sentence is one of two kinds, told apart by its wording: a constraint, "must" or "never", which the builder keeps; or guidance, the best way the planner knows, which the builder may depart from and then says so in the Debrief. An interface is written as code. A constraint that a record decided names the record; never restate its reasons. Never restate what the code shows; name the file or symbol to read instead.

**Out of scope.** What a builder would be tempted to add here and must not, one line each, with where it belongs: another task by number, a later cycle, or never.

**Done when.** One line per criterion, each checkable by the builder alone and each yielding evidence for the Debrief: a command and its exact expected output, a test by name that must pass, or a behaviour to observe and where. Never a judgement such as "works correctly". Never a check AGENTS.md already requires of every commit.

**Debrief.** Written by the builder, in the file, when the task is done or blocked. Done: the evidence for each Done-when criterion, in order; every departure from Details or Files; and what in the code the engineer should read, if anything, and why. Blocked: what was attempted, what was found, and why the file cannot settle it. Never restate the task.

**Writing.** Every sentence is a statement or an imperative. Never "appropriate", "as needed", "etc.", "handle edge cases", "robust", "clean up", or any wording that leaves the builder to guess what was meant; what the planner cannot state exactly is an unsettled decision and is raised, never written around.
