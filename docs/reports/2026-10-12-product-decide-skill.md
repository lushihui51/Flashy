# The product-decide skill: the 2026-10-12 session

**Date:** 2026-10-12.

**Prompted by:** the documentation reform on `process/reform`, continuing from `docs/reports/2026-10-12-where-the-rules-live.md`. The engineer brought a brainstorm of six reformed skills, lettered A to F in that report, and asked whether the process had gaps. They then named the product side, asked whether one decide skill should serve both sides, and wrote the first skill with the skill-creator skill, editing it line by line. Along the way they moved the report rules into `docs/rules/` and made the repository private.

**Outcome:** the product-decide skill written and committed in `3726346`; the report rules moved to `docs/rules/report-rules.md` in `2174214`; the AGENTS.md line on how changes reach `main` reworded in `418aab9`. No code changes. The gaps found in the brainstorm are recorded below and none is settled.

**Grounding.** The session read the three rules files, the four reform reports, and AGENTS.md. The skills under `~/.claude/skills` were read once as evidence, and the engineer then ruled that they will be removed and are not to be reasoned from; nothing below derives from them. Every cite is against `3726346`, with a clean working tree.

**Terms.** As the cycle-file session fixed them: "user" is a person using the app; the human building it is "the engineer". In the product flow the engineer wears a second hat, and the skill calls that hat "the owner".

## Decisions

Each entry gives what was decided, why, and what was rejected. Where the engineer did not confirm in words, the entry says so.

### D1: the product side is `product-decide` and `product-record`

Step A is `product-decide`, step B is `product-record`. Confirmed by the engineer writing and committing the first under that name, with the second named inside it (`.claude/skills/product-decide/SKILL.md:8`).

- **Why:** a name has two jobs here. It names the hat, because the whole point of A is that the owner decides with no technical influence, and a session opened under `product-` declares whose it is. And it names the output in the rules' own word: A ends with decisions, B with records, as `docs/rules/record-rules.md` uses "record" for a decision with a status and a lifecycle.
- **Rejected:** `product-plan`, a plan being a plan of work where A plans none; `product-design`, which in everyday use means screens; `product-define` and `product-spec`, which imply a complete definition the no-central-requirements rule rejects; `product-write` and `product-justify` for B, since "write" says nothing of triage and supersession and "justify" says reasons after the fact; `owner-` as a prefix, naming the person when the same person wears both hats.
- **Not decided:** the code side. The session proposed `code-decide`, `code-record`, `code-plan` and `code-build` for C to F, with `code-cycle` as the alternative for E, on the ground that the owner owns the product and the engineer owns the code, and that the cycle rules name E's author "the planner" and F's agent "the builder". The engineer did not confirm them.

### D2: two decide skills, not one with a mode

A and C stay separate skills. The engineer asked whether one `decide` skill, sorting decisions into product and code afterwards when no side is given, would be better; the session argued against it, the engineer went on to write `product-decide`, and confirmed the decision in words when this report was reviewed.

- **Why:** the specified form of a one-skill design is the two-skill design under one name, so the question was whether the unspecified form earns its place. It does not, because A's isolation from the technical side is a property of context, not of instruction: what the model has read shapes what it proposes more than what it is told to ignore, and the unspecified form has to read both sides to be ready for either. Sorting afterwards is the easy part; the contamination before the sort cannot be undone. The two sides are also not symmetric: an ADR takes a PDR as a force, and C reads PDRs before deciding, so a mixed session makes code decisions against product decisions not yet recorded.
- **Kept from the one-skill idea:** the warning when a decision of the other kind comes up. It is the type test applied live, and both skills need it.

### D3: hand-off in the same conversation, a report only if the owner stops early

Confirmed decisions reach `product-record` in the same conversation, from context. `product-decide` writes nothing, except that when the owner stops before `product-record` runs it writes the hand-off as a report in `docs/reports/` with the outcome line "decisions confirmed, pending /product-record" (`.claude/skills/product-decide/SKILL.md:54-56`).

- **Why:** chosen by the engineer from four options after asking for the trade-offs. Same conversation gives `product-record` everything that produced a decision, not only what was written; the report on early stop removes the one weakness, decisions lost with an ended conversation.
- **Rejected:** nothing ever written; a report always written, which is written before its outcome is known and holds one decision in two texts for a while; a hand-off file outside the repo, which the report rules forbid.

### D4: what is built is read from the cycle files, what-parts only

For each cycle file the skill reads only its Goal, and for each task only its Status, Goal and Debrief (`.claude/skills/product-decide/SKILL.md:21`).

- **Why:** chosen by the engineer over whole files, the running app, or asking the owner. The other parts say how the app was built and checked, and every path and interface in them would enter the owner's conversation. The engineer corrected the session's first wording, which named a Contracts section, against `docs/reports/2026-10-07-cycle-file-ground-rules.md:155-171`: a cycle file is Title, Goal, Records and Tasks, and a task is Status, Goal, Dependencies, Files, Details, Out of scope, Done when and Debrief. The engineer then trimmed the line to the imperative form it has now.
- **Known consequence:** the files already in the repository have a Notes line where the rules put Debrief, and "Superseded since" sections; under "read only" an agent maps Notes on its own or skips it, and skips "Superseded since". Nothing is lost that the rule is for, since later files' Goals say what stands.

### D5: a build-only decision is parked for the code side

When no option of a decision could be noticed by a user, the skill says so, does not confirm it, and parks it; when only some options could, the decision splits and the noticeable part is decided (`.claude/skills/product-decide/SKILL.md:34-40`).

- **Why:** chosen by the engineer over refusing such decisions or deciding them anyway. The test is the category half of the record rules' type test alone, which works at any size: a user can tell two button orders apart as surely as two mastery models. The engineer's point that the type test was meant for records, where it serves significance as well, is answered by splitting the two: `docs/rules/record-rules.md` keeps significance in its own paragraph, and whether a decision earns a record is `product-record`'s triage.
- **Rejected:** the session's clause "only differences the option cannot avoid count", which the engineer found opaque; "built perfectly" carries it, and the rules use that phrase for exactly that purpose.

### D6: the skill's text

The engineer edited the draft line by line. The changes of substance, so that the reasoning is not lost:

- The paragraph explaining why the reading list is short was cut: its reader test duplicated the sentence test, and the behaviour it was meant to produce is already two imperatives, "nothing else without my explicit permission" and "set it aside".
- "Ask one question at a time when my goal is ambiguous" became "Give me one thing to answer per turn: one question, one proposal, or one decision to confirm", unconditional, and moved to the opening (`.claude/skills/product-decide/SKILL.md:12`), because it is a rule about the conversation and not about how the agent thinks. The engineer wants it in every conversational skill.
- The sentence test moved into the opening as "every sentence is understood by someone who has never seen code" (`:8`), and the two lines under Confirming decisions that it had lived in were cut as redundant.
- The ending's trigger moved from the owner to the agent: "When nothing on the topic is left to decide, say so and ask whether I have more" (`:54`), because in the engineer's workflow the agent feeds one decision at a time and is the one to know when the topic is spent.
- Two things the session chose without a decision behind them, left in at the engineer's review: the skill skips a record whose Status is Superseded or Deprecated (`:20`), which `docs/reports/2026-10-06-adr-pdr-ground-rules.md:526` had left undecided; and the agent argues from the user's seat rather than staying neutral (`:31`).

### D7: the report rules live in `docs/rules/report-rules.md`

Executed in `2174214`. The five rules that were sub-bullets in AGENTS.md are now `docs/rules/report-rules.md:1-11`; AGENTS.md keeps that findings are files in `docs/reports/` and the directory permission (`AGENTS.md:29`), and gains a pointer in Context (`AGENTS.md:159`).

- **Why:** the pattern the where-the-rules-live session set for records and cycle files, an artifact's rules in `docs/rules/` with one imperative pointer. The rule that a report is due stays in AGENTS.md because a session that does not know a report is due will not open the rules file.
- **Two wordings are not pure relocation:** "any ADR, plan phase, or test assertion" became "any record, cycle file, or test assertion", since PDRs exist and a cycle file is what a report may name under the cycle rules. The pointer says "writing", not "writing or editing", because a report is never edited once written. "Only `docs/reports/` reports cite lines" stayed on `AGENTS.md:31` so the exclusivity has one home.

### D8: the reformed skills live in the repository

The skills are written under `.claude/skills/<name>/SKILL.md` in the Flashy repository and tracked, starting with `product-decide` in `3726346`. Confirmed after the engineer first asked for the global folder, asked which is better, and asked whether they wanted the process public.

- **Why:** the skills are the step half of a process whose artifact half is already in `docs/rules/`, and a change to one is usually a change to the other, which only one repository makes one commit. The repo then explains its own trail, so "pending /product-record" in a report resolves from a clone. A branch carries its own steps as it carries its own rules. And the skills name Flashy paths, so there is nothing generic to gain from the global folder. The cost accepted: a skill change rides a branch and a PR.
- **Rejected:** the global `~/.claude/skills` folder; a private submodule under `.claude/skills/`, which gives privacy and co-versioning at a complexity the session would not pay with worktrees in use.
- **Privacy:** the engineer first chose to stay public, then made the whole repository private instead. That settled the question the other way, and D9 is its consequence.

### D9: the PR rule for `main` is stated, not enforced

`AGENTS.md:14` now reads "changes reach `main` only through a PR with both checks green, never by a direct push", in `418aab9`.

- **Why:** with the repository private, GitHub no longer enforces the `protect-main` ruleset on the account's plan; the rulesets API answers "Upgrade to GitHub Pro or make this repository public to enable this feature". CI still runs on every PR and push to `main` (`.github/workflows/ci.yml:3-6`); it no longer gates. The ruleset's configuration is kept and returns if the repository goes public or the plan changes.
- **Rejected:** upgrading the plan, which would also lift the Actions minute quota that a private repository now consumes; making the repository public again.

### Readings the engineer gave on method

Not decisions about the skill, recorded because they shaped the session:

- The existing skills are not to be reasoned from in naming or designing the reformed ones; all will be removed.
- Every conversational skill feeds the engineer one thing to answer per turn, as a standing rule, not only when the goal is ambiguous.
- After every edit the engineer orders, the reply states whether it was applied and where the current text lives.

## The brainstorm's gaps

The session's assessment of the six-skill brainstorm, given before anything was named. None of these is decided; they are the work the remaining skills must settle.

1. **Sub-record product decisions have no path to the builder.** B leaves a decision that earns no PDR as it is, but C, D and E take only PDRs as input. B's output needs to be the PDRs written plus the product decisions below record level, and C must accept both.
2. **C only opens from a PDR.** Bug fixes, refactors, this reform, a replan after a blocked task, and the review of the ADRs that named a superseded PDR all start with no new PDR.
3. **E only creates.** `docs/rules/cycle-rules.md:39` makes every edit except Status and Debrief the planner's, so replans need E to amend, and an unsettled decision found while decomposing needs a way back to C and D.
4. **The type test runs nowhere on the code side.** `product-decide` now applies the category test live; `code-decide` needs the same, and each flow needs a route to the other flow's writer.
5. **Five step rules parked by `docs/reports/2026-10-12-where-the-rules-live.md:52-58`** have no home yet: the fate table before marking a record Superseded or Deprecated (B and D); the review of every record citing the superseded one (B and D, and for B that means reading ADRs, which the product flow forbids, so B may only list them and hand the review to C); the grouping proposal with the reversal cost in the type's currency (B and D); repointing every live site off a superseded record, code edits becoming a task (the superseding step, so B's repoint work must reach E); a builder who meets a record-level decision mid-task stops (F).
6. **The checkpoint skills are missing from the brainstorm.** Nobody in A to F owns AGENTS.md or README, and `docs/reports/2026-10-06-adr-pdr-ground-rules.md:525` proposed a sync pass for discrepancies across the two record folders.
7. **A's first run reads an empty `docs/pdrs/`.** The product-side decisions sit in `docs/adrs/`, the record session's open question at `docs/reports/2026-10-06-adr-pdr-ground-rules.md:516`. Until they migrate, A needs permission to read ADRs or sees no existing product decisions.
8. **A reads cycle files for what is built**, which is the revisit condition at `docs/reports/2026-10-10-built-behaviour-document.md:60`, and the files are all in the old shape.
9. **The reason for a sub-record decision has to travel.** The record rules give it a comment at the code; the cycle rules forbid restating a record's reasons and say nothing of a non-record decision's reason. If E does not carry it, F cannot write the comment.
10. **B and D both edit an old record's Status line** when superseding, the one edit the record rules allow, so "nothing permanent is edited" in the brainstorm's D is not quite true.
11. **Task size and slicing** (`docs/reports/2026-10-07-cycle-file-ground-rules.md:341`) and **parallel sessions picking the same task** (`:340`) land on E and F respectively.

## What the repo does now

At `3726346`.

- `.claude/skills/product-decide/SKILL.md:1-58`: frontmatter with `disable-model-invocation: true` and an argument hint (`:1-6`); the opening with the no-code sentence test and the one-thing-per-turn rule (`:8-12`); Terms (`:14`); What you read (`:18-25`); How you think (`:27-32`); What belongs here (`:34-40`); Confirming decisions (`:42-50`); Ending (`:52-56`). It names `/product-record`, which does not exist.
- `AGENTS.md`: the CI line (`:14`), the two report lines (`:29-30`), the lines-only-in-reports line (`:31`), and three pointer lines in Context (`:157-159`). `AGENTS.md:44` still points the user-facing vocabulary at `docs/cycles/004-practice-setup.md`, which the skill relies on at `.claude/skills/product-decide/SKILL.md:22`.
- `docs/rules/`: `record-rules.md`, `cycle-rules.md`, `report-rules.md`.
- `docs/pdrs/` is empty and untracked.
- The repository `lushihui51/Flashy` is private. The rulesets API returns 403 on the current plan.
- Memory outside the repo records three of the engineer's method readings and the placement decision; nothing in the repo depends on it.

## Open questions

None of these is decided. Nothing here should become a default downstream.

1. **The code side's names.** Proposed under D1 and not confirmed.
2. **`product-record`.** Not written. It must carry the four B items under gap 5, the sub-record decisions under gap 1, numbering across branches, and the drafts-before-writing step the engineer expects of any writing skill.
3. **Where "one thing per turn" lives for the other skills.** The same sentence in each conversational skill, or a user-level CLAUDE.md line that every conversation loads, which would let the skills drop it.
4. **Skipping Superseded and Deprecated records.** In force in `product-decide` without a rule behind it; the record session's open question 7 stands.
5. **The old-shape cycle files.** Whether `product-decide` reads them by their new-rule part names only, as it does now, or gets a clause for Notes and "Superseded since", or waits for the files to be retired.
6. **The report structure.** The reform reports share a shape, Grounding, Terms, Decisions, What the repo does now, Open questions, Related, that `docs/rules/report-rules.md` does not ask for. Codifying it is a separate decision.
7. **The GitHub plan.** The ruleset stays unenforced and Actions minutes are metered until the plan changes or the repository goes public. The condition to revisit is the first direct push to `main`, or the quota being hit.
8. **Testing the skill.** The skill-creator's single-prompt evals fit a multi-turn conversation poorly; the first real run on a product topic is the test, and it was not run.

## Related

- **`docs/reports/2026-10-12-where-the-rules-live.md`.** Its open question 1, the skills, is opened: A is named and written, and the six step items under its D6 still have no home. Its D7 pointer pattern is extended by the report pointer at `AGENTS.md:159`. Its D1 folder list gains a third rules file. Its open question 7, `docs/pdrs/`, is unchanged.
- **`docs/reports/2026-10-06-adr-pdr-ground-rules.md`.** Its D9 type test is applied in `product-decide` as the category half only, per D5 here; its open question 7 is taken up by the skill without a decision; its open question 3 is gap 7 here.
- **`docs/reports/2026-10-07-cycle-file-ground-rules.md`.** Its D4 and D5 are what the skill reads cycle files by, after the engineer's correction under D4 here. Its open questions 4 and 5 are gap 11.
- **`docs/reports/2026-10-10-built-behaviour-document.md`.** The skill reads cycle files as the answer to what is built, which is the choice that report records and the revisit condition it sets.
- **`AGENTS.md`.** Lines `:14`, `:29`, `:30` and `:159` are this session's. The old report sub-bullets, and the misplaced docs/rules line that had split them, are gone.
- **ADRs.** None is contradicted. ADR 041 names branch protection among the reasons GitHub Actions was chosen, which stays true as a reason; the gate it described no longer operates, per D9.
- **Cycle files and tests.** None cited by a rule; none contradicted.
