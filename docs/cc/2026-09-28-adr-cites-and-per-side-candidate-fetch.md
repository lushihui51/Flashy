# Stale line cites in ADRs, and the per-side candidate fetch at generation

**Date:** 2026-09-28. **Prompted by:** two "noticed in passing" lines from the same day's sampler investigation (`docs/cc/2026-09-28-sampler-cumulative-draw-rounding.md`), put to a /plan session with the question "do these two need fixing?": (1) ADR 013 cites `app/services/practice_session.py:114-126` and `:184-195`, a file renamed to `practice_run.py` by ADR 038; (2) `generate_practice_card_fields` runs the candidate query twice per card, once per side. **Outcome:** diagnosis only, no code changes. Neither is fixed. Two decisions were confirmed in the session and are recorded below as scratch labels D1 and D2 for /justify to resolve; D1 needs a one-line AGENTS.md edit, D2 needs nothing.

Every code cite is against `main` at `66d297d`; the working tree carried only the sampler report above, untracked.

## 1. ADR 013's citations

### What is there (verified by reading)

- ADR 013 (`docs/adr/013-snapshot-practice-config-at-session-start.md:17,19`) cites `app/services/practice_session.py:114-126`, `:184-195`, and `:83-95`. The file is `app/services/practice_run.py` since ADR 038; the initial batch is now at `app/services/practice_run.py:193-206`, the requeue at `:817-833`. ADR 013's Status has been amended twice (ADR 040, ADR 060) without touching the cites.
- ADR 013 is not alone. ADRs 008, 012, 015, 028, 029 and 031 also cite `practice_session.py`. Line-number cites of any file appear in 8 of the 60 ADRs, all early (009, 010, 011, 012, 013, 014, 019, 032); no ADR since 032 cites a line.
- ADR 038's Consequences already decide the file-name half: "ADRs and task files 001–008 keep the old term as history; readers map session → run. AGENTS.md is reconciled by /distill, not retroactive edits."
- The /sync command's own rule is "never rewriting an accepted one" (an ADR is superseded or amended in Status, not edited).
- Line cites elsewhere: task file 015's Contracts section carries them pinned to a commit hash (added by the 2026-09-24 sync, `docs/cc/2026-09-24-sync-mid-task-015.md`, item 5); `docs/cc/` reports are required by AGENTS.md to cite `path:LINE-LINE` and every report states the commit it cites against in its header. The /justify and /decompose commands say nothing about citations.

### Reasoning

A line number without a commit is a snapshot that rots with every edit above it. A line number with a commit is the most precise reference there is and never rots (`git show <hash>:<path>`). The durable unpinned reference is the file plus the symbol name, which survives line shifts and stays findable after a rename with `git log -S`. ADRs are permanent and unpinned, so they should cite symbols; docs/cc reports are dated diagnostics that already pin a commit, so their line cites stay. The eight historical ADRs are left alone, consistent with ADR 038.

### D1 (confirmed 2026-09-28)

AGENTS.md gains a hard rule, one sentence, in the form the file uses:

> Code references in ADRs and task files name the file and the symbol, never a line number; only `docs/cc/` reports cite lines, against the commit named in their header.

Existing ADRs keep their cites as history. Rejected: rewriting ADR 013 alone (inconsistent with the other six) or all seven (reverses ADR 038's decision). Deferred: a doc-scan guard test in `tests/api_tests/` for `path:NNN` in `docs/adr/`. The user wants to see first whether the AGENTS.md rule alone holds; the guard would need an allowlist for the eight historical ADRs. Revisit the guard if a new ADR or task file lands with a line cite despite the rule. The AGENTS.md edit itself is not made here (/plan writes no tracked files); it lands through /distill or the cycle that /justify records D1 in.

## 2. The per-side candidate fetch

### What it does now (verified by reading and by timing)

- `generate_practice_card_fields` (`app/services/practice_generation.py:88-121`) calls `resolve_prompts_or_answers` (`:54-85`) twice per card: once with the prompt arrays, once with the answer arrays plus the forced ids. Each call runs `db_fetch_generation_candidates` (`app/database_ops/practice_generation.py:11-52`) once, with that side's `fixed + pool` ids (`app/services/practice_generation.py:72`).
- The two id lists are disjoint: `validate_deck_practice_config` (`app/services/deck_practice_config.py:34-42`) requires the four arrays to be pairwise disjoint, and it runs at save and again at run start (`app/services/practice_run.py:270-279`). So the second statement does not refetch the first statement's rows; the cost is one extra statement and round trip per card, not duplicated data.
- The per-card loop sits after one bulk mastery fetch. `_snapshot_and_generate_deck` (`app/services/practice_run.py:186`) calls `card_mastery` over every card of the deck and the config's field ids, purely to sort unseen-first-then-ascending-mastery (`:187-190`); those rows are then dropped and the loop refetches each card's mastery per side.
- Timing on the dev database's largest deck ("Commands", 54 cards, 12 active fields), warm, per `db_fetch_generation_candidates` call:

  | shape | per run start | per call |
  |---|---|---|
  | today, 2 calls per card | 74 ms | 0.69 ms |
  | merged, 1 call per card | 35 ms | 0.65 ms |

  Linear in card count. A merge would save about 40 ms on this deck's run start and under 1 ms per requeue.
- The only direct caller outside the service is `tests/api_tests/test_practice_run.py:869` (one call in `TestBlankValueGenerationFilter`); a merge changes `resolve_prompts_or_answers`'s signature and that test.

### Not recorded anywhere

Task 001 (`docs/tasks/001-schema-rewrite.md:261`) specifies pool resolution per card ("drive from the pool array via unnest, join field_def, join card_field_value, LEFT JOIN mastery") and is silent on per side. The two-statement shape is a builder choice from `011f6ef`, not a decision. It contradicts no ADR.

### D2 (confirmed 2026-09-28)

No action. The per-side fetch stays as it is. Reasoning: the saving is not perceptible at current deck sizes, the change touches a signature and a test, and ADR 036's forced-ids behaviour would have to be re-verified through the refactor for no user-visible gain. Rejected: merging the two statements now. Revisit only if run-start latency becomes a user-visible problem, and then the lever is a per-deck bulk candidate fetch (one statement for all cards, which `card_mastery` at `app/services/practice_run.py:186` already half-does), not the 2-to-1 merge; doing the merge first would be rework in that path.

## Not settled

- Whether the run page relies on the order of the `prompts`/`answers` arrays (fixed, then forced, then sampled, as `app/services/practice_generation.py:85` produces them) was not checked; it is inferred from the producer only.
- The timing is one warm local measurement on one deck, not a benchmark.
