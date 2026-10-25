# 025 — Record pointers in code, in one form and guarded

## Goal

Outcome: Every record number in code sits in an implementation comment after its reason, as `(ADR NNN)` or `(PDR NNN)`, no test or describe name carries one, and a guard test keeps every cited record Active.

Scope: The three guard files' docstrings, assertion messages and one test name; the seventeen frontend test and describe names that end in a record number; the ESLint comment and its two messages; and a new guard test over `app/`, `tests/`, `alembic/`, `frontend/src/`, `frontend/eslint.config.js` and AGENTS.md. AGENTS.md is read by the guard and never edited here: its citations are repointed before this cycle is built. Not covered: what any test or lint rule checks, every file under `docs/`, and the wording of any comment beyond its pointer's form.

Judgement: In the repository, run pytest and see the guard pass; grep the six roots for record numbers and find only the parenthesised form inside comments and docstrings, none in a test or describe name; then set one cited record's Status to anything but Active in the working tree, run the guard, and read the citing lines it lists before reverting.

## Records

- ADR 019: Server-stamped UTC instants, user-facing dates rendered in the stored user timezone
- ADR 045: Alembic as the only schema path
- ADR 046: Payload modules for every composite shape
- ADR 054: A metadata naming convention for every constraint and index
- ADR 055: `database_ops` as the sole persistence surface

## Tasks

### T1 — Every pointer in code in the comment rules' form

**Status**

- [ ]

**Goal**

The guard docstrings end with their records and their messages name none, no test or describe name carries a record number, and the ESLint pointer sits after its reason.

**Dependencies**

None.

**Files**

- `tests/api_tests/test_schema_guard.py`
- `tests/api_tests/test_layering_guard.py`
- `tests/api_tests/test_models_layout_guard.py`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/pages/practicePrefilterChain.test.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/components/shell/AppShell.test.tsx`
- `frontend/src/components/shell/useConnectionStatus.test.tsx`
- `frontend/src/test/client.test.ts`
- `frontend/eslint.config.js`

**Details**

Every comment this task writes follows `docs/rules/comment-rules.md`, whose implementation-comment rule governs a test's docstring, an assertion message and a lint rule's message, and admits a record number only after the reason, as `(ADR NNN)` or `(PDR NNN)` and nothing more. The name of a test or of a group of tests is not a comment and carries no record number.

In the three guard files, each of the nine tests' docstrings must state the rule and its reason in its own words and end with the record the guard enforces, in that form: `(ADR 045)` for `test_no_create_all_or_drop_all_under_app`; `(ADR 054)` for `test_alembic_env_imports_app_database_before_reading_metadata` and for the naming-convention test; `(ADR 055)` for the four tests of `test_layering_guard.py`; `(ADR 046)` for the two tests of `test_models_layout_guard.py`. The nine assertion messages must give their reason alone and name no record: drop each "(ADR NNN)" and the words "the ADR 054 templates" become "the five templates". Rename `test_metadata_naming_convention_is_the_adr_054_templates` to `test_metadata_naming_convention_matches_the_templates`. Change nothing a guard checks; the docstrings already state each rule and reason, so a pointer is appended and nothing else moves.

In the eight frontend test files, the seventeen `it` and `describe` names that end in a record number must lose the number and its parentheses: twelve "(ADR 061)" across `PracticeCreatePage.test.tsx`, `practicePrefilterChain.test.tsx` and `DeckConfigurationEditor.test.tsx`, two "(ADR 062)" in `AppShell.test.tsx` and `useConnectionStatus.test.tsx`, "(ADR 032)" in `DeckEditor.test.tsx`, "(ADR 028, MD-3)" in `PracticeRunPage.test.tsx`, and "(ADR 065)" in `client.test.ts`. An "MD-n" tag sharing the parentheses stays: "(MD-6, ADR 061)" becomes "(MD-6)" and "(ADR 028, MD-3)" becomes "(MD-3)". Nothing else in a name changes.

In `frontend/eslint.config.js`, the comment above `'no-restricted-syntax'` must open with its reason and end with `(ADR 019)` after the last sentence, in place of opening "ADR 019:"; its two `message:` strings must drop their leading "ADR 019: " and otherwise stay as they are.

**Out of scope**

- The guard that keeps cited records Active: T2.
- AGENTS.md's citations: never in a cycle.
- The comment in `app/services/practice_run.py` citing ADR 037: never; it is already in the form.
- The "MD-n" tags in test names: never in this cycle; no decision reaches them.
- The old names quoted in merged cycle files: never; a merged cycle file is not edited.
- Any change to what a guard or a lint rule checks: never.

**Done when**

- `uv run pytest tests/api_tests/test_schema_guard.py tests/api_tests/test_layering_guard.py tests/api_tests/test_models_layout_guard.py -q` reports 9 passed, and `uv run pytest --collect-only -q tests/api_tests/test_schema_guard.py` lists `test_metadata_naming_convention_matches_the_templates` and no name containing `adr`.
- `grep -n "ADR" tests/api_tests/test_schema_guard.py tests/api_tests/test_layering_guard.py tests/api_tests/test_models_layout_guard.py` prints exactly nine lines, each the last line of a docstring, ending in `(ADR 045)`, `(ADR 054)`, `(ADR 055)` or `(ADR 046)` followed by the closing quotes.
- In `frontend/`, `grep -rn "ADR" src/pages/PracticeCreatePage.test.tsx src/pages/practicePrefilterChain.test.tsx src/pages/PracticeRunPage.test.tsx src/components/library/DeckConfigurationEditor.test.tsx src/components/library/DeckEditor.test.tsx src/components/shell/AppShell.test.tsx src/components/shell/useConnectionStatus.test.tsx src/test/client.test.ts` prints nothing.
- `grep -n "ADR" frontend/eslint.config.js` prints exactly one line, a comment line ending in `(ADR 019)`.
- In `frontend/`, `npx eslint src/lib/datetime.test.ts` runs clean, and a scratch file containing `new Date().toLocaleDateString()` passed to `npx eslint --stdin --stdin-filename src/x.ts` reports the first rule's message without "ADR 019:" at its start; the scratch input is not committed.

**Debrief**

None.

### T2 — A guard that every cited record is Active

**Status**

- [ ]

**Goal**

A pytest guard scans the six roots and fails, listing each citing line with the record's status, when any cited record is not Active.

**Dependencies**

- T1: no interface; the guard passes only once T1's sites are in the form it checks.

**Files**

- `tests/api_tests/test_record_citation_guard.py` (new)

**Details**

The guard must scan every file under `app/`, `tests/`, `alembic/` and `frontend/src/`, plus `frontend/eslint.config.js` and `AGENTS.md`, all relative to the repository root, and nothing under `docs/`: a record cites superseded records as forces, and a merged cycle file is never edited. A citation is a match of `\b(ADR|PDR) (\d{3})\b` on a line. Each cited number must name a file `docs/adrs/NNN-*.md` or `docs/pdrs/NNN-*.md` whose Status, the first non-blank line after its `## Status` heading, is exactly `Active`; a number with no record file fails the same way. On failure the assertion message must list every offending line as `<path>:<line>: <kind> <NNN> — <status>`, with "no record" as the status of a missing file, so the developer repoints or strips each one from the list alone.

The guard's docstring states the rule and its reason in its own words and cites no record: the rule is the record rules', which no record holds. Read each file as UTF-8 and skip one that does not decode; skip `__pycache__`. Keep the regex out of any string the pattern itself would match. Write a second test in the same file that exercises the status parser and the offender listing against record files and a citing file written to `tmp_path`, one Active, one superseded, one missing, so the failure path is tested without touching a real record.

AGENTS.md is a scan root and never a builder's file. Its citations are repointed before this task is built; if the guard lists an AGENTS.md line, mark this task blocked with the listed lines in the Debrief and change nothing.

**Out of scope**

- Editing AGENTS.md or any record: never.
- Scanning `docs/`, a new top-level directory, or `frontend/` outside `src/` and the ESLint config: never; the roots are the six named.
- Matching other forms, `ADR-045`, `adr_054`, or a bare number: never; T1 leaves none and the comment rules admit one form.
- Repointing a citation the guard lists: T1 for the known sites; otherwise the task that owns the file.

**Done when**

- `uv run pytest tests/api_tests/test_record_citation_guard.py -q` reports 2 passed.
- With the line `Active` under `## Status` in `docs/adrs/045-alembic-as-the-only-schema-path.md` changed to `Superseded by ADR 999` in the working tree, the same command fails and its message lists `tests/api_tests/test_schema_guard.py` with its line number, `ADR 045` and `Superseded by ADR 999`; then `git checkout -- docs/adrs/045-alembic-as-the-only-schema-path.md` restores the record, and the command passes again.
- `grep -rnE "\b(ADR|PDR) [0-9]{3}\b" app tests alembic frontend/src frontend/eslint.config.js` prints only lines containing `(ADR ` or `(PDR ` with the number closed by `)`, and none from a test or describe name.
- `uv run pytest tests/api_tests/test_record_citation_guard.py -q --durations=1` shows the guard under one second.

**Debrief**

None.
