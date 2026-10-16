# Comment vocabulary and rules: the 2026-10-03 plan session

**Date:** 2026-10-03.

**Prompted by:** the documentation reform on `refactor/doc-lifecycle`, which starts with code comments. The user's note "Oct 2nd - Agentic Coding Reform" (outside the repo) defines three comment kinds and four rules after Ousterhout's _A Philosophy of Software Design_. An earlier plan-mode session turned the note into seven proposed decisions in a plan file outside the repo (`~/.claude/plans/the-attached-is-a-zesty-perlis.md`) and filed no report. This /code-plan session went over each proposal with the user and treated none of them as confirmed.

**Outcome:** diagnosis only, no code changes. Twelve decisions (D1 to D12) are confirmed on what a comment is, when it is written, and what it contains. They are pending /code-decompose and /code-justify. Where the rules live, how existing comments are brought in line with them, and how they are enforced were not decided.

The D-numbers below are this session's. They replace the plan file's D1 to D7, which were never confirmed; the last section maps one set to the other.

Every code cite is against `5fc5a02`. The working tree carried one unrelated uncommitted edit to `AGENTS.md`, which does not move any line cited here.

## The confirmed wording

This is the text the user confirmed, in the order it was built. D7 amended two lines of D1 and D10 added the TypeScript line; both are folded in.

```text
## Vocabulary

Each kind is defined by where the comment sits and what it is for.

- Interface comment: sits at the declaration of a module, class, named function, method, component, hook, or type, wherever it is declared, including inside another function or component (the docstring in Python, the block directly above in TypeScript). It says how to use the code.
- Implementation comment: sits on the statements inside a function or component body (JSX included), on local variables, on module-level constants, and on inline functions: functions with no name of their own, written inside the expression that uses them. It says what the code there does and why.
- Member comment: sits next to the declaration of one field of a class or type: a model column, a class attribute, an enum member, or a member of a props or other type. It says what that value is.

In TypeScript, a module's interface comment sits at the top of the file, above the imports. A comment directly above a declaration belongs to that declaration.

## Scope

The rules apply to every hand-written comment in every file of the repository.

## Rule 1: when a comment is written

A comment is written when, and only when, the reader needs it: without it they would have to guess, or read code they should not have to read.

The reader knows the language, the libraries, and AGENTS.md. The reader has not read any ADR or cycle file.

- A reader needs an interface comment if and only if the declaration (name, parameters, types) cannot answer "how do I use this correctly" without ambiguity.
- A reader needs an implementation comment if and only if the statements cannot answer "what is this for, and why is it here" on a first read, without ambiguity.
- A reader needs a member comment if and only if the value's name and type cannot answer "what is this" without ambiguity.

A comment that is needed says only what the reader needs; what the reader already has is left out.

## Rule 2: interface comments

An interface comment answers "how do I use this correctly" for the code that uses the declaration, which never has to read the body. It states whichever of these the declaration does not already answer:

1. What it does or represents, as its user sees it.
2. What an argument or the return value means, including what null or empty means.
3. What it raises or throws.
4. Its side effects.
5. Its preconditions: what must be true before it is used.

It is written as prose, never as fixed sections to fill in.

It never says how the body works. The test: a sentence that could become false through a change to the body, without any user having to react, does not belong.

## Rule 3: implementation comments

An implementation comment never says how the code works. The test: a sentence that is the code translated into English does not belong.

## Rule 4: references

A comment gives its reason in its own words and is complete without any reference.

An ADR number may be added only to an implementation comment, and only when a reader about to change that code must read the ADR first, because the full reasoning is longer than a comment can hold. The number follows the reason, in parentheses.

An interface comment or a member comment never carries an ADR number.

## Rule 5: present state

A comment describes the code as it is now. It never says what the code used to be, what it replaced, when it was added, or what will be done later.

The test: a sentence that only makes sense to a reader who saw an earlier version does not belong.

A `TODO(defer:<tag>)` marker is the one exception: it says what is deferred.

## Rule 6: member comments

A member comment answers "what is this" for the code that reads or writes the field. It states whichever of these the name and type do not already answer:

1. What the value represents.
2. Its units or range.
3. What null or empty means.
4. What is always true of it, which every writer must keep.

It says what the value is, never what code does with it. The test: a sentence that could become false through a change to the code that reads or writes the field, without the field's meaning changing, does not belong.

A fact about one member is stated at that member, not repeated in the comment of the class or type around it.
```

## Decisions

Each entry gives what was decided, why, and what was rejected. All were confirmed by the user on 2026-10-03.

### D1: vocabulary

Three kinds, each defined by where the comment sits and what it is for. A named function's comment is an interface comment wherever the function is declared, including inside another function or component, and including inside an inline function. Local variables and inline functions take implementation comments.

- **Why:** a kind needs both a place and a purpose. The reader of an interface comment is whatever code uses the declaration, the enclosing body included, so nesting does not change the kind. An inline function has no name and is never called from elsewhere, so it is part of the statement that uses it.
- **Rejected:** the note's purely positional definitions; the plan's "classified by what it describes, never by where it sits"; this session's "set by the code it is attached to, never by what it says"; treating nested named functions as implementation comments; keeping "never how the code works" in the vocabulary, because it is a rule; a file-level line and a marker line in the vocabulary, because neither is vocabulary.

### D2: rule 1, when a comment is written

A comment is written exactly when the reader needs it, tested by one question per kind, for a reader who knows the language, the libraries, and AGENTS.md and has read no ADR or cycle file. An implementation comment is also required when the statements are unambiguous only after line-by-line work; "on a first read" carries that.

- **Why:** a rule that only forbids is satisfied by writing nothing, and the note names the reader guessing as the harm. "Obvious" needed a test and a named reader. AGENTS.md is loaded in every agent session, so repeating its conventions in comments restates what the reader has.
- **Rejected:** a forbid-only rule, as in the note's first draft; "obvious" with no test; Ousterhout's comment on every class, method, and variable; ambiguity alone as the implementation test; a reader who has not read AGENTS.md.

### D3: rule 2, interface comments

An interface comment states only those of the five items the declaration leaves unanswered, in prose, and never describes the body.

- **Why:** D2 forbids restating what the declaration already says, so the list is things to check and not slots to fill. Ousterhout's list for a method has five items and the note had four; exceptions were the missing one. "Implementation details" needed a test.
- **Consequence the user confirmed, with no added wording:** the user of a route handler or of a request or response model is the HTTP client.
- **Rejected:** describing every argument and the return value regardless of need; fixed sections such as `Args:` or `@param`; "implementation details" with no test; a separate line for route handlers, because it follows from "the code that uses the declaration"; writing a handler's docstring for backend maintainers.
- **Also rejected, later in the session:** a trimmed version that removed the sentences repeating D1 and D2. The user's reason: the trim was barely shorter, and the repetition reinforces the important points.

### D4: rule 3, implementation comments

Two sentences: an implementation comment never says how the code works, and the test is whether a sentence is the code translated into English.

- **Why:** every other line proposed for this rule restated D2. "Never how" had no other home once it left the vocabulary, and it closes a reading of D2's headline in which tricky code "needs" a how because the reader "would have to guess".
- **Rejected:** a three-item list of what the comment contains, as a duplicate of D2; "when code is hard to follow even with its purpose stated, the code is changed", as a rule about code; dropping rule 3 entirely.

### D5: rule 4, references

A comment states its own reason. An ADR number is a pointer for a reader about to change the code: allowed only in an implementation comment, only when the reasoning is too long for the comment, and placed after the reason in parentheses.

- **Why:** D2's reader has not read any ADR, so a number cannot stand in for a reason.
- **Rejected:** an ADR number in an interface or member comment; a number in place of the reason; "further reading is needed" with no test.
- **Left open by the user:** a line forbidding references to cycle files and to MD, T, D, phase, or section numbers. The user dropped it because they plan to change what a cycle file is used for. Rule 4 is silent on those references until then.

### D6: rule 5, present state

A comment describes the code as it is now, never its past or its future. The test is whether a sentence only makes sense to a reader who saw an earlier version. A `TODO(defer:<tag>)` marker is the one exception.

- **Why:** a writer in the middle of a change tends to describe the change. D2 alone does not obviously stop a history sentence that poses as an answer to "why is it here". The note names this failure.
- **Rejected:** leaving it to D2; a rule with no exception for the marker `AGENTS.md:55` requires.

### D7: a module-level constant takes an implementation comment

Amends the implementation and member lines of D1. A member comment is for one field of a class or type.

- **Why:** a constant is a member of nothing in Python or TypeScript. The user wants the reason for a constant's value documented, and wants member comments to stay "what" only. The implementation question, "what is this for, and why is it here", already holds the why.
- **Rejected:** a "why" item inside the member rule; never commenting the reason for a constant's value.
- **Follows from confirmed rules:** D2 applies its implementation test to constants, and D5 allows an ADR number on a constant's comment under its usual test.

### D8: rule 6, member comments

A member comment states only those of the four items the name and type leave unanswered, describes the value and never its use, and is the one place a fact about that member is stated.

- **Why:** the note defined the kind and gave it no rule. The four items are Ousterhout's list for variables.
- **Rejected:** no member rule; a "why" item; the plan's one-sentence version, which had no test.

### D9: scope

The rules apply to every hand-written comment in every file of the repository.

- **Why:** the user's statement that the rules apply to any comment, anywhere.
- **Readings confirmed with it:** a generated comment follows the rules through its source, and nobody edits it directly; in a file with no declarations (YAML, CSS, config) a comment is an implementation comment; strings such as test names, assertion messages, and lint messages are not comments.
- **Rejected:** carve-outs for tests, migrations, or config files.

### D10: where a TypeScript module comment sits

At the top of the file, above the imports. A comment directly above a declaration belongs to that declaration.

- **Why:** D1 lists "module" and gives the TypeScript place as "the block directly above", and a file has no declaration of itself to sit above. The top of the file is the only place that cannot be mistaken for a declaration's own comment.
- **Rejected:** above the first declaration.

### D11: markers and pragmas

A marker or pragma token is an instruction to a tool, not a comment. The words written after it are a comment and follow every rule. `TODO(defer:<tag>)` keeps its one exception from rule 5.

- **Why:** follows from D9 and D6. Confirmed as a reading, with no new wording.

### D12: "why is it here" covers why the code is written this way

In rule 1, the implementation question covers the reason for a choice of approach as well as the reason the code exists, so a comment may name an approach in order to give its reason.

- **Why:** that comment stops a later reader from rewriting the code into a simpler version that is wrong. Rule 3's test still separates it from a how, because a reason cannot be produced by translating code.
- **Rejected:** limiting "why" to why the code exists.

## What the code does now

This is the evidence the session gathered. Counts come from two throwaway scripts: Python's `ast` and `tokenize` over `app/`, and the TypeScript compiler API over `frontend/src/` excluding tests and `api/types.ts`. Consecutive comment lines were grouped into one comment. Treat the counts as approximate. Quoted examples were read directly.

### Where comments sit

Backend, `app/`, about 245 comments:

| Place                             | Count |
| --------------------------------- | ----- |
| Function or method docstring      | 130   |
| Class docstring                   | 36    |
| Module docstring                  | 5     |
| Above a class attribute or column | 18    |
| Above a module-level constant     | 7     |
| Inside a function body            | 39    |
| Pragma (`noqa`, `type: ignore`)   | 6     |
| `TODO(defer:)` marker             | 2     |
| Other                             | 2     |

Frontend, non-test `frontend/src/`, about 247 comments:

| Place                                             | Count |
| ------------------------------------------------- | ----- |
| Above a module-level function, component, or hook | 71    |
| Above a module-level type                         | 7     |
| Above a class                                     | 2     |
| On a member of a type                             | 30    |
| Above a module-level constant                     | 16    |
| Inside a body, on a local `const`                 | 38    |
| Inside a body, above a named nested function      | 9     |
| Inside a body, on other statements                | 48    |
| Inside a body, in JSX                             | 14    |
| On an entry of an object literal                  | 3     |
| `TODO(defer:)` marker                             | 7     |
| Other                                             | 2     |

### Places the vocabulary had to decide

- **Named function inside a component.** `frontend/src/components/library/DeckEditor.tsx:534-539` is a comment above `handleDeleteClick`, declared inside the component body. Under D1 it is an interface comment.
- **Named function inside an inline function.** `frontend/src/components/library/CardTable.tsx:23-34` passes an inline function to `useEffect`, and `check` is declared inside it at `:26`. Under D1 a comment on `check` is an interface comment, and a comment on the inline function is an implementation comment.
- **Module-level constants.** `app/mastery/ema.py:13-19` declares `MASTERY_PRIOR`, `EMA_ALPHA`, and `EMA_BETA`; only `EMA_BETA` has a comment (`:15-18`). `AGENTS.md:61` points readers at that comment. Under D7 it is an implementation comment.
- **TypeScript module comments.** No frontend file has a comment above its imports, apart from the `TODO(defer:)` markers at `frontend/src/pages/HomePage.tsx:1` and `frontend/src/pages/NotificationsPage.tsx:1`. Eight files open with a comment directly on their first declaration; `frontend/src/lib/returnTo.ts:1-8` is one. Under D10 those belong to the declaration.
- **Comments with no listed place.** `frontend/src/api/client.ts:6-15` sits above a `declare global` block, and `app/models/practice_card.py:19-22` sits on one constraint inside `__table_args__`. `app/database_ops/mastery_log.py:14-16` is a module-wide note placed above the first function and outside the module docstring.

### Facts that bear on the rules

- **Docstrings under `app/routers/` and `app/models/` are published.** FastAPI puts a handler's or model's docstring in the OpenAPI schema, and `npm run gen:api` copies it into `frontend/src/api/types.ts`. That file has 35 lines citing an ADR, a cycle, or a phase; `frontend/src/api/types.ts:258` is one. Its schemas section carries 97 `@description` entries. Any edit to such a docstring changes the generated file.
- **AGENTS.md already answers some questions a comment might.** `AGENTS.md:37` says a `db_stage_*` function does not commit. `app/database_ops/` has 25 such functions, and 18 of their docstrings mention committing.
- **The build workflow gives a writer D2's footing.** The /code-build skill tells an agent to read the cycle file, the ADRs it lists, and AGENTS.md.
- **No comment uses fixed sections.** `app/` has no `Args:`, `Returns:`, `Raises:`, or `:param` docstring section, and non-generated `frontend/src/` has no `@param`, `@returns`, or `@throws`.
- **Markers and pragmas carry prose.** All 10 `TODO(defer:)` lines in `app/` and `frontend/src/` have words after the tag; `app/main.py:25` is a full sentence ending "(cycle 020 MD-1)". `app/routers/api/deletion_impact.py:23` is `# noqa: B006 — FastAPI query params, not shared state`.
- **Signature that cannot answer its own question.** `app/services/timezone.py:22-28`: the signature `normalize_timezone(value: str | None) -> str | None` cannot say that `None` means "nothing usable" as opposed to a fallback to UTC.
- **Reason for a choice of approach.** `frontend/src/api/client.ts:33-38` explains why the timezone header is sent on every request and not once at sign-in. `app/database_ops/practice_card.py:27-45` runs an insert inside a savepoint; the docstring at `:28-38` holds both what a caller depends on and how the body achieves it.
- **ADR numbers in comments.** A grep over `app/` and non-test, non-generated `frontend/src/` finds 139 comment lines citing an ADR: 127 with one number, 10 with two, 2 with three or more.
- **No ADR governs comments.** ADRs 015, 022, 045, and 056 contain the word once each, in passing.

## Open questions

None of these is decided. Nothing here should become a default downstream.

1. **Where the rules live.** The session ended with this asked and unanswered. D2 assumes a reader who knows AGENTS.md and has read no ADR, so rules kept only in an ADR do not reach a writer. The options put to the user were the full text in AGENTS.md, the rules in their own file in the repo with one pointer line in AGENTS.md and an ADR for the reasoning, or an ADR only. The session recommended the second. This blocks /code-decompose, which cannot write its first cycle file without it.
2. **References to cycle files and minor decisions.** Deferred by the user until cycle files are redefined. Revisit when that part of the reform is decided.
3. **Bringing existing comments in line with the rules.** Out of scope by the user's instruction: this session set what a comment should be, and the changes come after.
4. **Enforcement.** Not discussed. AGENTS.md's convention is a source-scan guard test in `tests/api_tests/` for any rule that can drift silently.

## Related

- **AGENTS.md.** D6 keeps the `TODO(defer:<tag>)` convention at `AGENTS.md:55` by exception. D2 makes AGENTS.md part of what every comment may assume, which raises the cost of a stale line there.
- **`docs/reports/2026-09-28-adr-cites-and-per-side-candidate-fetch.md`.** Its D1 governs references from ADRs and cycle files into code: file and symbol, never a line. D5 here governs the other direction, from a comment to an ADR.
- **ADRs.** None is contradicted. No ADR records a decision about comments, so /code-justify starts from nothing.

### The plan file's proposals and what became of them

| Plan file proposal | Outcome here |
| --- | --- |
| D1 vocabulary: "classified by what it describes, never by where it sits"; constants as member comments; file-header and marker lines | D1, D7, D10, D11: place and purpose together; constants take implementation comments; the two extra lines left the vocabulary and were settled separately |
| D2 rule 1: written only when required | D2: written when and only when needed, one question per kind, named reader |
| D3 rule 2: interface comments | D3: five items, prose, a test for the body |
| D4 rule 3: implementation comments, ending "change the code" | D4: two sentences; "change the code" rejected |
| D5 rule 4: references, including no cycle or MD references | D5: ADR rule kept; the cycle-reference line left open |
| D6 rule 5: present state | D6: same rule with a test and the marker exception |
| D7 rule 6: member comments | D8, after D7 moved constants out |
| Open question: scope | D9 |

### The plan file's survey, carried over

The plan file sits outside the repo, so its survey is copied here. It was made on 2026-10-02 against `5fc5a02` by survey agents. This session did not re-verify it except where marked.

- Backend (`app/`): about 205 ADR or cycle mentions; about 174 in docstrings (120 function, 48 class, 6 module), 15 on fields, 7 on constants, 9 in function bodies. Heaviest: `app/services/practice_run.py` (47), `app/models/practice_run_payloads.py` (25), `app/models/practice_deck.py` (15).
- Frontend (`frontend/src/`, non-test): 78 ADR mentions; about 43 above declarations, 31 in bodies, 8 on constants, 5 in file headers. About 120 more use `MD-n`, `T#`, `§`, `D#`, or `Phase N`, often with no cycle number.
- Tests: about 100 ADR mentions in `tests/`, 50 in frontend tests, and about 38 frontend test titles citing an ADR, MD, or phase.
- Docstring style is prose everywhere, with no `Args:`, `Returns:`, or `@param`. Re-verified here.
- Interface-comment coverage: services 27 of 29, database_ops 65 of 96, routers 10 of 38, `src/api` functions 5 of 45, components 37 of 49.
- Two comments were found stale: `frontend/src/api/client.ts:8` says "hence `any`" and the file has no `any`; `frontend/src/components/library/CardTable.tsx:11` says "currently a placeholder" and `frontend/src/pages/DeckDetailPage.tsx:191` passes a real route. The first was read here at `:6-8`; the second half of each claim was not re-checked.
- No tooling checks comments. Two guard tests scan raw text, comments included: `tests/api_tests/test_schema_guard.py` and `tests/api_tests/test_mastery.py:863`.
- Two files share ADR number 066. Re-verified here: `docs/adrs/066-a-snapshot-carries-its-configurations-name.md` and `docs/adrs/066-one-add-control-per-collection.md`.
