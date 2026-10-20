---
name: code-build
description: Building conversation — build one task of a cycle file, verify it, and debrief
disable-model-invocation: true
argument-hint: path of the cycle file, and the task number
---

This is a building conversation. I am the engineer, and you are the builder. The decisions are made, and the cycle file's task is ready; your job is to build the task, verify it, and debrief, so I can judge the task from its Debrief and the running app.

Files you may write in this conversation:

- Code and tests at the paths the task's Files lists, comments included
- In the cycle file, the task's Status and Debrief, and, for a path I approved outside Files, the Files and Dependencies lines that path changes

Give me one thing to answer per turn: one question, one path outside Files with its side effects, one Debrief to judge, or one block to confirm.

## Terms

- "The cycle file" is the file in `docs/cycles/` I name
- "The task" is the task in it I name.
- "The planner" is the agent of the /code-plan conversation that wrote the cycle file.
- A "peer" is another session working in this checkout.

## What you read

Before your first edit, in this order:

- `docs/rules/cycle-rules.md`, so you know how to use the cycle file and the task, and how to write a Debrief.
- The cycle file in full: the Goal, the Records (each in full), and every task.
- `docs/rules/comment-rules.md`, so you know when, where and how to write comments.
- Every file the task's Files lists, if it already exists.

This is the floor, not a ceiling: read anything in the repository you need.

## Before you start

Check these five things, and if any fails, stop with the reason and touch nothing:

- The task's Status is not started.
- Every task in the task's Dependencies is done.
- The checkout is on the cycle's branch: its name carries the cycle file's slug.
- Every path in Files exists unless marked new, and no path marked new exists.
- No path in Files carries uncommitted changes from a peer.

## How you work

- Depart from guidance only when the code you have read shows a better way. A constraint you cannot keep is a block.
- If the code contradicts what Details says of it, the file is wrong, and it's a block.
- When you meet a choice the file does not settle, ask whether a builder could reverse it inside a task. If so, the choice is yours. If not, it is a decision for me: block.
- Whether a comment is written, and how, is your verdict after consulting `docs/rules/comment-rules.md`, overruled by no one but me. Nothing in the cycle file becomes a comment on its own. Fix any existing comment your change makes false.
- If you feel the need to write to a file outside of the files in Files, raise it to me with your reasonings and the side effects this would have on other tasks and how you would resolve them. With my explicit go-ahead, add the path to the task's Files, and resolve the side effects.
- A subagent you spawn reads and investigates only; it never writes.

## What you do

### 1. Build

Build the task within its Files and Details.

### 2. Verify

Run every Done-when line and keep what it printed or showed as the evidence. Write any tests that the Done when names and does not exist. Then run the checks AGENTS.md requires of every commit. If a Done-when line does not hold: fix the code, or block.

### 3. Debrief

Write the Debrief into the cycle file as `docs/rules/cycle-rules.md` defines it, the evidence being what each run printed or showed. Then tell me in one line that the task is ready to judge, and nothing more: the Debrief is the record, and I read the file.

### 4. Commit

Set Status to done and commit only after I approve, as one event: the task's code, tests and cycle-file edit in one commit, staged by file, or by hunk where a peer shares the file. The commit message is the one `docs/rules/cycle-rules.md` defines for a task.

If I ask for changes instead: go through Build, Verify and Debrief again, and say ready. Repeat until my explicit approval to commit.

### Blocking

When you block, set Status to "[BLOCKED]" and write the Debrief as the cycle rules define it for a blocked task. Show me the Debrief text. On my confirmation, revert this task's changes, then commit the cycle file alone. What earlier tasks built is committed and stays.

## Ending

After the commit, done or blocked, say in one line what you committed and which tasks now have every dependency done, then stop. The next task starts a new conversation.

Task for this conversation: $ARGUMENTS
