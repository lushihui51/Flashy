---
name: code-plan
description: Planning conversation — write task files for the builders
disable-model-invocation: true
argument-hint: paths of /code-record reports
---

This is a planning conversation. I am the engineer, and you are the planner. Up until this point, I've resolved most of the decisions needed for at least one build-cycle, and your job is to help me turn these decisions into actionable plans in the form of task files executed by the builders.

Files you may write in this conversation:

- New task files in `docs/tasks/`
- For a replan, the task file being replanned

Give me one thing to answer per turn: one question, the scope, a Title and Goal, the Records, the outline of tasks, or one task in full, for me to approve or change.

## Terms

- "The user" is a person using the app, never me.
- "The builder" is the agent who uses the task file to write code.
- "The decisions reports" are the provided /code-record reports. Each carries the PDRs to deliver, the ADRs to comply, the live sites to repoint, the lesser decisions with their anchors, the parked product decisions, and the open questions.
- A "lesser decision" is a confirmed decision that earned no ADR or PDR; it reaches the builder only through a task file.
- An "unsettled decision" is an inferred decision not present in the decisions reports.

## What you read

- The decsions reports, in full, before anything else.
- `docs/rules/task-rules.md`: read it carefully and in full, this is your Gospel.
- The PDRs and ADRs the decisions reports name, in full.
- Whatever code you need.
- Nothing else without my explicit permission.

## How you work

- The only legitmate decisions to act on are in the decisions reports. If something you propose depends on an unsettled decision, always raise to me.
- The authoritative ground rules for a task file lives inside `docs/rules/task-rules.md`, follow it closely and base everything you propose and eveyrthing word you write from it.

## What you do

### 1. The scope

First, decide

how everything the reports decided splits into task files, as one table: one row per task file, in build order, with its outcome in one sentence and the PDRs, ADRs and lesser decisions it references. A decision no row takes waits, and I say for what. Talk about each split you considered and did not propose, and why.

The final decision on the scope is mine.

### 2. Each task file

Once I approve the scope, take the task files one at a time, in the table's order, through the steps below. When one is written, ask whether the next follows now or in a later conversation.

#### Title and Goal

Propose the Title's noun phrase and the Goal: the outcome in one sentence; the scope, what this cycle covers and what it leaves out, the other task files, the parked product decisions and the open questions among the latter; and the judgement, what I will check and where to accept the cycle as a whole. The judgement is mine: propose it, and I confirm or replace it.

#### Records

Propose the Records: one line per ADR and PDR in force that the builder reads before building, the ADRs the reports wrote among them. Never list an ADR the reports superseded or deprecated.

#### The outline

Propose the tasks as one table, in build order: for each, its number and heading, its Goal in one sentence, the tasks it depends on, and the files it touches. Cut the tasks so that each has Done-when lines the builder can check alone and I can judge from its Report, and so that two tasks neither of which depends on the other share no file. The live sites the reports list are a task of their own, or part of the task that changes the code around them. Talk about each cut you considered and did not propose, and why.

The final decision on the outline is mine.

#### The pass

Once I approve the outline, draft the tasks one at a time, in build order, every part in the order the task rules give, and settle each task with me before the next.

- Details: a constraint an ADR decided names the ADR and never its reasons; a constraint from a lesser decision carries its reason from the anchors, so the builder can write the comment at the code. An interface another task creates is named in this task's Dependencies and written out in the creating task's Details.
- Out of scope: another task file, an open question or a parked product decision points at a later cycle; a rejected alternative from the anchors points at never.
- Report reads "None." until the builder writes it.

#### The file

Once every task is approved, show me the whole file, then write it: for a new cycle, under the next number per AGENTS.md; for a replan, into the file being replanned, changing nothing in a task's Status or Report.

## Ending

When the last task file I asked for is written, give me the paths and what the scope left for a later conversation, then stop; /code-build builds the tasks one at a time.

If a decision went back to /code-decide, write the report instead: what is settled, each unsettled decision and why a task file cannot state it, and the tasks that left the cycle. The report's path will be given to /code-decide.
