# Where the rules live: the 2026-10-12 plan session

**Date:** 2026-10-12. The session ran from 2026-10-11 into 2026-10-12.

**Prompted by:** the documentation reform on `process/reform`. Three plan sessions had each deferred the same open question, where their rules live: the comment session (`docs/reports/2026-10-03-comment-vocabulary-and-rules.md`), the record session (`docs/reports/2026-10-06-adr-pdr-ground-rules.md`), and the cycle-file session (`docs/reports/2026-10-07-cycle-file-ground-rules.md`). The engineer asked whether the rules should go into the skills folders, since the skills are what use them, took an assessment, then opened /code-plan to settle the where for each rule set.

**Outcome:** eight decisions (D1 to D8) confirmed and executed. There is no decompose or justify step while the cycle itself is under reform, so at the engineer's instruction this session executed its own decisions, one commit each with the engineer's confirmation: `97e9f83` to `7546320`, preceded by `8b92806` and `ee03220`, which committed the two reports that had never been committed. No code changes. No record was written: the reasoning for all three rule sets is still only in the reports, pending the record-writing step.

**Grounding.** As in the earlier sessions, `AGENTS.md` and the skills under `~/.claude/skills` were read as subjects of the reform. Every cite of the state before this session is against `1d97ef3`; every cite of the state after is against `7546320`. Skill cites are against `~/.claude/skills` commit `76a9aac`, which still carries the uncommitted edits the cycle-file report noted.

**Terms.** As the cycle-file session fixed them: "user" is a person using the app; the human building it is "the engineer"; the planner and the builder are agents. The engineer gave the reformed skills letters, not names, in this session: A, product decisions; B, writes PDRs; C, technical decisions from a PDR; D, writes ADRs and the lines for the cycle file; E, writes the cycle file; and the builder, which the engineer's note also lettered D and this report calls F. Naming them is a separate decision.

## Decisions

Each entry gives what was decided, why, and what was rejected. All were confirmed by the engineer on 2026-10-12.

### D1: folders

The documentation folders are `docs/adrs/`, `docs/pdrs/`, `docs/reports/`, `docs/cycles/`, and a new `docs/rules/`. This replaces the record session's D10, which put PDRs in `docs/pdr/`.

- **Why:** the engineer had renamed the folders in the working tree before the session opened and named the new one; the decision confirmed them so that every later decision could name a path.
- **Rejected:** keeping `docs/adr/` and `docs/cc/`.

### D2: a rename fixes every reference

When a folder is renamed, every reference to it in every tracked file is fixed in the renaming commit, accepted records and earlier reports included; a path fix is not a change of content.

- **Why:** the record session's D1 freezes an accepted record's body and `AGENTS.md:29` says never to append to an earlier report. Both protect a decision and its reasoning; a path string is neither, and the alternative is dead links in frozen files.
- **Rejected:** leaving the frozen files with the old paths.

### D3: comment rules in AGENTS.md, verbatim

The comment rules live in `AGENTS.md`, as one section, in the confirmed text verbatim. Amended in place twice before the commit: the record session's D11 is folded in, so rule 4 reads "an ADR or PDR number" and "must read the record first"; and the rule 1 reader "has not read any ADR, PDR, or cycle file", at the engineer's instruction when the staged text was shown.

- **Why:** a comment is written in every session that touches code, including sessions that load no skill and the subagents a skill spawns, which receive the project instructions and never the skill text. Writing a comment is incidental to every task, so a pointer to a rules file would be skipped where a deliberate step would follow it. The comment rules' own reader "knows AGENTS.md", so the rules in that file are known to every reader of a comment. Verbatim over trimmed: the session showed a trimmed version, 16 lines and about 480 words against 72 lines and about 700, with every rule and test kept and the reasons and example lists cut; the engineer chose the verbatim text "for now" and may trim it when rewriting `AGENTS.md`, which would be a new decision.
- **Rejected:** the trimmed version; one line per rule in `AGENTS.md` with the full text in an ADR, which makes the ADR a rulebook, the thing the record session's D22 says an ADR is not.

### D4: one record-rules file

The record rules live in one file, `docs/rules/record-rules.md`, in the three sections the confirmed text already has: rules for both record types, rules for PDRs only, rules for ADRs only.

- **Why:** the confirmed text has about 110 lines binding both types, 10 for PDRs only and none for ADRs only, and the record session's D7 makes a PDR follow every ADR rule unless a later decision says otherwise. Two complete files put every shared rule in two places with only a sync pass to notice drift; a PDR-only stub mirrors D7 but makes a PDR writer read two files.
- **Rejected:** the engineer's opening intent, `adr-rules.md` and `pdr-rules.md` as two complete copies; `adr-rules.md` plus a PDR-only stub.

### D5: the cycle-file rules file

The cycle-file rules live in `docs/rules/cycle-rules.md`, in the confirmed text in full.

- **Why:** one artifact, one text, one writer and one reader; nothing competed.
- **Rejected:** nothing was raised.

### D6: artifact rules in the repo, step rules in the skills

A rule about what an artifact is lives in the repo, in `AGENTS.md` or `docs/rules/`; a rule about what an agent does in a step lives in that step's skill and nowhere in the repo. From the record text six items move to the skills: the fate table shown before marking a record Superseded or Deprecated (record D4) and the review of every record citing a superseded one (record D21), both to B and D; the owner's case-by-case judgment of grouping and worth with the agent's proposal and its costs (record D6, all but "a single decision is the aim", and the last sentence of record D17), to B and D; "a builder who meets one mid-task stops" (record D18, second clause), to F; "the repointing is the skills' job" (record D25, last sentence), to whichever step supersedes, with the code edits it needs becoming a task. The cycle-file text and the comment text move nothing. Reading attached: a rules file and a skill carry rule text only, never a report's D-entries; the why and the rejected alternatives go to records; D-numbers appear only in the reports.

- **Why:** four reasons, given in the assessment that preceded the session and not disputed. The repo must explain its own trail: `~/.claude/skills/suites/code.md:39` says a decision counts only once it is in an ADR, a cycle file or `AGENTS.md`, `README.md:55` says the commands live outside and "what is checked in is the trail they leave", and the record rules' reader "has read AGENTS.md and no other record", so what a Status pointer means must be learnable from the repo. The reasoning lands in the repo's records, and rule text in a second git repo has nothing keeping it aligned with them; a guard test belongs next to the rule it enforces. The skills repo is global and generic, `~/.claude/skills/AGENTS.md:3` says every edit there changes behaviour in every session and `suites/code.md:34` lists the paths the skills assume in a target repo, while the rules carry Flashy facts. And step rules already have that shape in the skills, as "Files you may write in this step" and "show me all drafts" lines. The engineer's own rule, from the cycle-file session, that a rule for an agent is an imperative, is why the six items become instructions in the skill's voice rather than copied sentences.
- **Sorting differences from the record report:** its open question 1 sorted its D8 and D11 as step rules. This session put D8, no central requirements document, in the file, because it is a property of the PDR set that any reader needs and no step performs it; and D11 in `AGENTS.md`, because it is a comment rule. The engineer confirmed the full rundown, one row per record decision, before this decision.
- **Rejected:** the record text whole in the rules file with the skills repeating the six items; the rules in the skills folders, which was the engineer's opening question.

### D7: pointer lines

`AGENTS.md` carries one pointer line per rules file, in its Context section, worded as an imperative to read the file before writing or editing that artifact, and these two lines replace the two "see docs/…" lines there.

- **Why:** nothing else led a session to `docs/rules/`, and the readers both rule sets name have read `AGENTS.md`. The imperative binds at the moment of writing. The second old line, "Cycle files (one per cycle, per-task Notes, "Superseded since" corrections)", stopped being true under the cycle rules.
- **Described and not taken up:** a nested `docs/cycles/AGENTS.md` or `docs/adrs/AGENTS.md`, which Claude Code loads on demand when a file in that directory is opened with Read, and only then; it would not reach the writer of a new record, and it was not verified to fire in this setup.

### D8: edits to a rules file

"Never edit a file in `docs/rules/` without the engineer's explicit permission." Amended in place: the decision was first confirmed as "after its first write, a file in docs/rules/ changes only in the commit that writes the record changing the rule it restates, and no other step, pass, or task edits it". When that was shown as the `AGENTS.md` line the engineer found the wording confusing and replaced the gate with explicit permission.

- **Why:** a rules file is a restatement of decisions, the relation `AGENTS.md` lines have to records today. Left unsaid, a distill-style pass would tighten it or a builder would patch it, and the restatement and the record drift apart.
- **Rejected:** the record-commit gate, as the first wording; a file with no rule about who edits it.

### Readings the engineer gave on method

Not decisions about where rules live, recorded because they shaped the session:

- "There is no decompose, the repo is going through reform, so you are the sole actor for these decisions": the session executed D1 to D8 itself, asking for confirmation before each commit.
- The D-entries in a report are history and reference. Neither a skill nor a rules file copies them; only rule text is written, and the why goes to records.
- The current skills are not to be reasoned about; the reformed steps are referred to by letter until named.

## What was executed

One commit per decision, each confirmed by the engineer after the staged content was shown.

- `8b92806`, `ee03220`: the cycle-file and built-behaviour reports, committed at `docs/cc/` as they were written, so the rename moved them with the rest.
- `97e9f83` (D1, D2): 89 renames with content unchanged, 68 records and 21 reports, and 102 path fixes in 22 files: 3 lines of `AGENTS.md`, 13 links in `README.md`, 3 records, 6 cycle files, 12 reports. The record report's "docs/pdr/" lines were left, being a replaced decision and not a renamed folder. `docs/pdrs/` exists in the working tree only; git cannot commit an empty directory, so the first PDR creates it.
- `822c750` (D3): `AGENTS.md:59-132`, the `## Comments` section, between Conventions and Mastery model; the file went from 85 to 160 lines. The block's eight headings were demoted from `##` to `###`; `AGENTS.md:109` and `:111` carry "ADR or PDR"; `:79` is the widened reader line.
- `2d71fa4` (D4): `docs/rules/record-rules.md`, 53 lines, the confirmed block unwrapped to one paragraph per line with the D-tags stripped and the paragraph labels bolded. Not verbatim, each shown and confirmed with the commit: the six D6 removals and the D11 line; `docs/rules/record-rules.md:13`, "Grouping", the one sentence that survived "Who decides", under a label of this session's choosing; `:53`, the ADRs-only section, written as the mirror of the PDR line, which is what the 68 files do and not a decision of the record session; and the Significance examples, struck at the engineer's instruction together with the sentence "The rule carries examples on both sides of the line, phrased as kinds of decision", so `:9` ends at "No threshold is set."
- `14b2f9b` (D5): `docs/rules/cycle-rules.md`, 39 lines, verbatim apart from the stripped tags and bolded labels. `docs/rules/cycle-rules.md:3` reads "a docs/reports report", the rename sweep's rendering of "a docs/cc report".
- `bc16862` (D7): `AGENTS.md:160-161`.
- `7546320` (D8): `AGENTS.md:30`.

## What the repo does now

At `7546320`, with a clean working tree apart from the empty `docs/pdrs/`.

- `AGENTS.md` is 161 lines in eight sections: Project, Commands, Hard rules, Conventions, Comments, Mastery model, Entity vocabulary, Context. `AGENTS.md:29` governs `docs/reports/` and keeps "`reports` is the only directory under `docs/` you may write to without asking"; `:30` is D8; `:34` keeps "only `docs/reports/` reports cite lines".
- `AGENTS.md:47` and `:139` still point into `docs/cycles/004-practice-setup.md` and `docs/cycles/010-mastery-log.md`, the living contracts the cycle-file session left open. Both now contradict `docs/rules/cycle-rules.md:3`, "No tracked file cites a cycle file".
- 48 lines across `AGENTS.md`, `README.md`, `app/`, `tests/` and non-generated `frontend/src/` cite a cycle file or a cycle number. `tests/api_tests/test_activity_tracking.py:3` cites `docs/plans/003-frontend-rebuild-creation-flows.md`, a path from before `docs/cycles/` existed.
- `README.md:51` says every design decision is in `docs/adrs/`, which the record session's D7 makes untrue once the first PDR exists; `README.md:55` says the cycle file "pins the contracts the tasks share", untrue under the cycle rules. Only the paths in both lines were changed here.
- `docs/rules/record-rules.md` and `docs/rules/cycle-rules.md` restate decisions no record holds; the why for every rule in them is only in the three reports.
- The skills at `76a9aac` still name the old folders on 13 lines: `code-plan/SKILL.md:14`, `code-justify/SKILL.md:10`, `:16`, `:18`, `code-sync/SKILL.md:8`, `:12`, `code-distill/SKILL.md:21`, `suites/code.md:13`, `:17`, `:23`, `:25`, `:34`, `:35`. They were left alone at the engineer's instruction, the skills being rewritten.

## Open questions

None of these is decided. Nothing here should become a default downstream.

1. **The skills.** The six step items under D6 have no home until the skills are named; their wording as instructions is for that rewrite. The 13 old-path lines go with it.
2. **The records behind the rules.** No ADR records the comment rules, the record rules, or the cycle-file rules; `docs/rules/` has nothing behind it but the reports. Writing them is the record-writing step's work, and how the decisions group into records is the engineer's judgment under the record session's D6.
3. **The Significance examples.** The record session's D17 said the rule carries examples; the only examples were its unconfirmed draft table, and the engineer struck both the table and the sentence. Whether examples return, and in what wording, is open.
4. **The living contracts and the cycle-file citations.** `AGENTS.md:47` and `:139` and the 48 citing lines are the retrofit the cycle-file session's open questions 2 and 3 named, now against a rule in force.
5. **The README.** Lines `:51` and `:55`, as above; a distill-step matter.
6. **The first cycle file under the cycle rules.** No step yet writes the new shape, and the current decompose skill writes the old one. Whether the next cycle's file follows `cycle-rules.md` by hand or waits for E was not decided.
7. **`docs/pdrs/`.** Empty and uncommitted until the first PDR.

## Related

- **`docs/reports/2026-10-03-comment-vocabulary-and-rules.md`.** Its open question 1 is closed by D3. Its D5 (rule 4) is in `AGENTS.md:105-111` with the record session's D11 folded in; its D2 reader line is widened to PDRs at `AGENTS.md:79`.
- **`docs/reports/2026-10-06-adr-pdr-ground-rules.md`.** Its open question 1 is closed by D4 and D6. Its D10 is replaced by D1. The step parts of its D4, D6, D17, D18, D21 and D25 leave the file under D6; its D8 and D11 are sorted differently from its own open question 1, as recorded under D6 here. Its D17 sentence on examples is not in `docs/rules/record-rules.md`, open question 3 here. Its open question 5, the examples table, is struck rather than confirmed.
- **`docs/reports/2026-10-07-cycle-file-ground-rules.md`.** Its open question 1 is closed by D5. Its D1 is now in force at `docs/rules/cycle-rules.md:3` and contradicted by `AGENTS.md:47` and `:139`, open question 4 here. Its "What the skills say today" lines stand; no skill changed.
- **`docs/reports/2026-10-10-built-behaviour-document.md`.** Nothing here touches it.
- **`AGENTS.md`.** Lines `:29`, `:30`, `:34`, `:59-132`, `:160` and `:161` are this session's; `:47` and `:139` are the contradiction above.
- **ADRs.** None is contradicted; none was written.
- **Skills.** Named under "What the repo does now". The engineer rewrites them.
