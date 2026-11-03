# AGENTS.md rules

**Purpose.** AGENTS.md tells an agent what it must know to work in this repository that no tool enforces.

**Readers.** An agent reads it at the start of every session and inside every subagent, before any other file.

**Location.** One file, `AGENTS.md`, at the repository root, and none in any subdirectory.

**Sections.** Four, fixed, in this order, each a header with bullets under it and nothing else. An empty section keeps its header.

- Project: where things live, what the product is, and who the product's users are.
- Commands: the commands an agent cannot guess.
- Hard rules: the acts that are never done, an agent will stop and ask.
- Conventions: the default judgment calls, an agent who departs from one says so and why.

**Line.** One bullet is a statement and two optional sub-lines under it, `Reason:` and `Guard:`.

**Statement.** The facts or rules about one topic, in one sentence that states them unambiguously in about 200 characters; split a longer one into its facts, or cut it. A rule is an imperative. Present tense. Name a thing by the stablest handle that still identifies it: a command, a directory, a file, a symbol. Never a line number, a count, a date, a version, or any value the next commit can change. Give no mechanism or example; they live in the record the Reason names. Add no emphasis marker: a rule agents keep breaking gets a guard, not capitals.

**Reason.** Names the records behind the line, as `ADR NNN` or `PDR NNN`. With no record, gives the reason in about 50 characters. With neither, exclude this sub-line.

**Guard.** Names the test file that enforces the line and nothing else. With no test, exclude this sub-line.

**Inclusion Test.** A line earns its place in one of two ways. It prevents a mistake an agent makes without it and nothing else prevents at the time the work is done: a rule broken, a wrong command run, or work done on a wrong fact, where the agent would not ask the human first and no check catches it before the work would have to be redone. Or it saves a question the human would otherwise answer every session.

**Skills.** A line never restates what a skill says for an act an agent reaches only through that skill. An act an agent can reach with no skill loaded keeps its line even where a skill states the same rule.

**Budget** The file holds at most fifty lines. Once it is full, a line that enters names the line it displaces.

**Changes.** Only the human can initiate a change, but any agents can edit the file under the human's command.
