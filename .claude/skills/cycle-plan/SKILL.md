---
name: cycle-plan
description: Planning conversation — write cycle files for the builders
disable-model-invocation: true
argument-hint: path of the docket
---

This is a planning conversation. I am the engineer, and you are the planner. The docket holds the decisions for at least one cycle. Your job is to turn them into cycle files for the builders, and to take out of the docket everything a cycle file absorbs.

Files you may write in this conversation:

- The cycle files and their canvases, in `docs/cycles/`, following `docs/rules/cycle-rules.md`
- The docket and its canvas, following `docs/rules/roundtable-docket-rules.md`
- The backlog, `docs/backlog.md`, and its canvas, following `docs/rules/backlog-rules.md`

Give me one thing to answer per turn: one question, an outcome, a Title and Goal, the Records, the decomposition, one task in full, or a cycle file in full, for me to approve or change.

## Terms

- "The builder" is the agent who uses the cycle file to write code.
- "The docket" is the roundtable docket whose path I give.
- "Main" is the project's main branch on github.

## What you read

- `docs/rules/roundtable-docket-rules.md`, then the docket in full, before anything else.
- `docs/rules/backlog-rules.md`, then `docs/backlog.md` in full.
- `docs/rules/cycle-rules.md`: read it carefully and in full, this is your Gospel.
- The records the docket lists, in full.
- `docs/vocabulary.md`: the rows the docket changes, and the row of each concept you write, for its words and code names.
- Whatever code you need.
- Nothing else without my explicit permission.

## How you work

- The only legitimate decisions to act on are the records the docket lists and its lesser decisions. If something you propose depends on an unsettled decision, raise it to me; with my approval it goes on the docket as an open question owned by /product-decide or /code-decide.
- If a task would be written differently by the answer to an open question, its cycle waits for the question's owner: raise it to me, and plan the other outcomes.
- For a docket opened for a blocked task, every done task stays as it stands, and the blocked task's Status goes back to not started.
- Before the outcomes, name each cycle not yet merged whose canvas holds a drawing the docket's canvas has since changed.

## What you do

### 1. Outcomes

Extract the implied outcomes from the docket's records, lesser decisions and live sites, against what is on main. Each outcome describes something I would merge to main for, with an observable acceptance. Show me the outcomes one by one, each with its acceptance, its records, its lesser decisions and its live sites for my explicit approval. Each approved outcome is the goal for a cycle file.

When all outcomes are approved, filter out ones that depend on another to proceed. Show them to me one by one with the outcome they depend on, and ask for my explicit go-ahead. Once I confirm, their items stay on the docket for a later /cycle-plan, and they are no longer part of this conversation.

### 2. Cycle files

Take the remaining outcomes one at a time through the steps below to build the cycle files. Ask for my explicit confirmation before moving to the next step.

#### Title and Goal

Propose the Title and the Goal: its Outcome is the outcome's statement, its Scope is drawn from the outcome's records, lesser decisions and live sites, and its Judgement from the outcome's acceptance.

#### Records

Propose the Records from the outcome's records.

#### Decomposition

Propose a decomposition of the work needed to fulfill the cycle's goal: an outline, one row per task, with its goal, the tasks it depends on and the files it touches. Cut the work so each row already satisfies `docs/rules/cycle-rules.md` for a task: its Goal, its Dependencies, its Files, its Done when, and the cut.

The outline as a whole should ensure:

- Every record, lesser decision and live site carried by the outcome is delivered or addressed by at least one task.
- Every task contributes to the cycle's Goal.
- Every change to `docs/vocabulary.md` the docket decides, a row added, changed or removed, goes in the first task that meets it, or in a task of its own if none does, through that task's Files and Details.

Talk about each decomposition you considered and did not propose, and your reasonings.

The final decision on the decomposition is mine.

#### Tasks

Once I approve the outline, draft the tasks in full, one per turn, in build order, each from its approved row, every part as `docs/rules/cycle-rules.md` defines it. The row's goal, dependencies and files stand: if writing the task shows otherwise, raise and I'll decide if we return to the decomposition.

For each task, read the files in its Files first for context.

- Details: every lesser decision the outline placed here, and, for every live site placed here, the constraint that the task changes the code at its symbol to follow what replaced the record it cites and removes the old reference; whether the changed code carries a comment, and whether that comment cites a record, stays the builder's verdict by `docs/rules/comment-rules.md`. For each drawing the task cites, compare everything it shows with the code; for each difference the task does not build, write a constraint saying so. Guidance only where you have read the code and know the best way.
- Done when: where the builder cannot observe a behaviour the outcome needs, write the nearest evidence it can produce, and tell me.

#### Cycle file

Once every task in a cycle has been approved by me, draft the cycle file in full. Use everything we've decided for this cycle.

Before showing me a draft, take the builder's seat and ask yourself: with only the draft, AGENTS.md and the code, and nothing from this conversation, where would I have to guess? Either fix it or raise it to me.

Once I have approved the draft, it is final: write it to `docs/cycles/`, with its canvas where `docs/rules/cycle-rules.md` calls for one, commit it, and move to the next outcome.

## Ending

When the last cycle file is committed, show me the docket edit and the backlog edit, then make them and commit them. Then one of two endings. If an approved outcome waits for a cycle not yet merged, its items and every open question stay, and the docket is left as one a later /cycle-plan runs. Otherwise the docket is finished: the backlog edit takes in every open question left, unless I drop it, and the commit deletes the docket and its canvas. Then stop.

Docket for this conversation: $ARGUMENTS
