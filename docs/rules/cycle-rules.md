# Cycle file rules

**Lifetime.** A cycle file serves one cycle. Once the cycle's work is merged into its docket's branch, the cycle is complete and its file is never edited again. It stays in the repository for debugging, to see what the builder was asked and what it reported, and for the Summary. The test: after the merge, deleting the file would lose nothing the repository still needs but the Summary. No tracked file cites a cycle file, as a rule or as history, but the Waits for line of another cycle file.

**Branch.** The engineer makes the cycle's branch from its docket's branch, named by the repository's `type:` prefix, a slash and the cycle file's name without `.md`; every commit of the cycle is made on it, and the engineer merges it back into the docket's branch.

**Readers.** A cycle file is written for the builder of its cycle: an agent that has read AGENTS.md, can read anything in the repository, and has not seen the planning conversation or the docket. A cycle file is read as a whole by the engineer first to approve it before it's built, and is read one task at a time to supervise each building session. /product-decide and /dogfood read only its Summary.

**Edits before the merge.** Until the cycle's merge, the builder writes a task's Status and Debrief; for a path outside the task's Files that the engineer approves, the Files and Dependencies lines that path changes; and, on the cycle's canvas, only an alternative to a drawing, beside it, the drawing and its alternative then lettered A upward under the drawing's number, and the alternative staying only as evidence a blocked task's Debrief cites; every other edit is the planner's, made by /cycle-plan.

**Commits.** A task's commit holds its code, tests and cycle-file edit; its message is the repository's `type:` prefix, the task's Goal as the statement, and `(cycle NNN Tn)`. The cycle file's own commit, by the planner, has the message `docs: plan cycle NNN, <title>`. An amendment by the planner has the message `docs: amend cycle NNN, <what the file now states>`.

**Purpose.** For the builder, a cycle file is the whole of what it is told for the cycle. The engineer judges each task from its Debrief and by testing the app on a live server, and reads code only where the Debrief points.

**Summary.** This command prints each cycle file's Outcome and each task's Status and Goal, from the checked-out branch only:

````
awk 'FNR==1{fence=0; print "==> " FILENAME} /^```/{fence=!fence; next} fence || /^$/{next} /^Outcome:/{print; next} /^### /{t=substr($0,5); sub(/ — .*/,"",t); next} /^\*\*[A-Za-z ]+\*\*$/{part=$0; next} part=="**Status**"{s=$0; sub(/^- /,"",s); part=""; next} part=="**Goal**"{print t " " s " " $0; part=""}' docs/cycles/*.md
````

A task is built only when its Status is done, and a cycle's Outcome holds only from when every task of it is done until a later cycle changes it. Whoever reads the Summary says what it found in the conversation and, by Lifetime, cites no cycle file in a tracked file.

## The cycle

**Sections.** Title; Goal, the cycle's outcome, scope and judgement; Records, the records the builder reads before building; Tasks. In that order. Every section appears; one with nothing to hold reads "None."

**Title.** A number and a noun phrase of two to five words naming the thing the cycle changes, never what becomes true of it. The file is docs/cycles/NNN-<slug>.md; the slug is the phrase in lowercase ASCII words joined by hyphens.

**Goal.** Three labelled paragraphs, in prose, in this order. Outcome: the cycle's approved outcome, stated in one sentence. Scope: what the cycle covers and what it leaves out. Judgement: what the engineer checks, and where, to accept the cycle as a whole. Never say what prompted the cycle or how it was planned.

**Records.** One line per active record, ADR or PDR: its number and title. Never restate the record's decision or its reasons; the builder reads the record.

**Canvas.** When a task cites a drawing, the cycle has a canvas of its own, named "<repository> cycle NNN" after the repository's name and linked on the line under the title, or under the Waits for line, as "Canvas: " and the link. /cycle-plan makes it from the docket's canvas, holding only the drawings the cycle's tasks cite, each under its number from the docket's canvas and as the docket's canvas held it when /cycle-plan last wrote the cycle file. The canvas is part of the cycle file.

**Waits for.** When a cycle uses what a cycle not yet complete delivers, or shares a file with one, the line under the title reads "Waits for: " and, for each such cycle, its number and the interfaces of it this cycle uses, by name. Two cycles neither of which waits for the other, directly or through others, share no file.

## A task

**Parts of a task.** Status; Goal, what the task delivers; Dependencies, the tasks that must be done first, and which of their interfaces this task uses; Files, the paths it may touch; Details, the constraints and guidance for building it, and every interface it creates, written out exactly; Out of scope, what it must not do; Done when, what must be true when it is done; Debrief, what the builder reports when it is done. In that order. Every part appears; one with nothing to hold reads "None."

**Task heading.** A task is headed by its number, T1 upward in the order the tasks are to be built, and a noun phrase naming what it delivers.

**Cut.** A task leaves the branch working with its tests green when it completes; work that would leave the branch broken until another task is done belongs in that task. Work with no checkable criterion of its own rides in a task whose evidence shows it.

**Status.** A task's status is one of three: not started, "- [ ]"; done, "- [x]", set in the task's commit, once every Done-when criterion holds; blocked, "[BLOCKED]" after the checkbox, set when the builder stops on something the file cannot settle, with the reason in the Debrief.

**Goal of a task.** One sentence: what is true once the task is done that was not before. Never how.

**Dependencies.** One line per task that must be done first: its number, and the interfaces of it this task uses, by name. Two tasks neither of which depends on the other, directly or through others, share no file.

**Files.** Every path the task may create or change, exact, from the repository root, marked new where it does not exist yet; a generated file counts. A path not listed is not touched.

**Details.** A sentence is one of two kinds, told apart by its wording: a constraint, "must" or "never", which the builder keeps; or guidance, the best way the planner knows, which the builder may depart from. A lesser decision placed here is written out as a constraint. A drawing cited from the cycle's canvas, by its number, is a constraint on everything it shows, except what the task's Out of scope names. An interface is written as code. A constraint that a record decided names the record; never restate its reasons. Never restate what the code shows; name the file or symbol to read instead.

**Out of scope.** What a builder would be tempted to add here and must not, one line each, with where it belongs: another task by number, a later cycle, an unsettled decision, or never.

**Done when.** One line per criterion, each checkable by the builder alone and each yielding evidence for the Debrief: a command and its exact expected output, a test by name that must pass, or a behaviour to observe and where. Never a judgement such as "works correctly". Never a check AGENTS.md already requires of every commit. The last task's Done when carries the cycle's judgement.

**Debrief.** Written by the builder, in the file, when the task is done or blocked. Done: the evidence for each Done-when criterion, in order; every departure from guidance in the Details; and what in the code the engineer should read, if anything, and why. Blocked: what was attempted, what was found, and why the file cannot settle it. Never restate the task.

**Writing.** Every sentence is a statement or an imperative. Never "appropriate", "as needed", "etc.", "handle edge cases", "robust", "clean up", or any wording that leaves the builder to guess what was meant; what the planner cannot state exactly is an unsettled decision, one that no record and no docket item settles, and is never written around.
