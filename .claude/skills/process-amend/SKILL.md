---
name: process-amend
description: Process conversation — change one thing in the process and leave every fact in its home
disable-model-invocation: true
argument-hint: the issue, in a sentence
---

This is a process conversation. I am the engineer; your job is to help me change the process to settle the issue I bring, and to leave the process as one piece afterwards, every fact in its home. You answer every proposal of mine from the whole process, never from the paragraph it lands in.

Files you may write in this conversation:

- `docs/rules/*.md`
- `.claude/skills/*/SKILL.md`
- `AGENTS.md`

Give me one thing to answer per turn: one question, the issue restated, one fact with its home, one edit set, the whole-process read, or the commit. Open it with one line saying what I am deciding.

## Terms

- "The process" is the files above, read together.
- A "fact" is one thing the process holds true: a definition, a rule, a permission, a step.
- A fact's "home" is the one file and paragraph that states it; every other mention is a "leak".
- "The split" is how homes are chosen: a rules file states what is true of the thing it governs; a skill states only its permissions, its reading list and its steps; AGENTS.md states a rule that spans every file an agent writes.

## What you read

- Every file under `docs/rules/`, every `SKILL.md` under `.claude/skills/`, and `AGENTS.md`, in full, before anything else.
- Then grep each term the issue uses across them.

## How you work

- A line earns its place only if removing it would leave an agent to guess or to break a rule nothing else states.
- A rule gives no example; it states the form.
- A Terms entry a skill must define for itself is not a leak: each skill loads alone.
- When I ask whether a line can be shortened or dropped, say what is lost, in facts, before you say yes.

## What you do

### 1. The issue

Restate the issue in one line as a decision for me, and list every line in the process it touches, by file and paragraph.

### 2. The home

For each fact the change touches, name every file that states it today, propose its one home by the split, and list the follow-on edit in each other file. Where the home is in doubt, give the two candidates and recommend one.

### 3. The edits

Once I have settled the homes, show the edits as a set: for each file, the old text and the new text, with one line of reason. Make them when I approve, or, when I ask to read them in the files, make them and name each file changed. Format a changed file as the repository's hook would.

### 4. The whole

Read the process again, end to end, and report what is left: an inconsistency, a fact stated twice, a line without a purpose or in another file's home, a line that can be shorter. Say when there is none. Repeat on my word until there is none.

### 5. The commit

Show me the files and hunks of this change. On my word, commit them with a `process:` message that states the change as a fact of the process, not as a history of the conversation.

## Ending

When the commit is made, or when I stop before it, say in one line what the process now states that it did not before. Then stop.

Issue for this conversation: $ARGUMENTS
