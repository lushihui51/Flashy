# The weighted sampler's cumulative draw can return one field short on a rounding edge

**Date:** 2026-09-28. **Prompted by:** the question "the sampler's cumulative draw can return one field short on a rounding edge — is this true?" put to an /investigate session. **Outcome:** diagnosis only, no code changes. The claim is true and was reproduced on the real function, but the event needs four conditions at once and the last has a per-draw probability on the order of 1e-18. The user chose not to fix it now; no plan exists. The conditions under which to revisit are in "Decision" below.

Every code cite is against `main` at `66d297d`, the committed state; the working tree was clean. Reproduction scripts lived in the session scratchpad; the parts that matter are reproduced inline below.

## The claim, restated

`weighted_low_mastery_sample` (`app/services/practice_generation.py:26-51`) draws `k` ids one per iteration. Each iteration computes `total = sum(weights)` (`:42`), draws `r = rng.uniform(0, total)` (`:43`), then walks the weights with a running `upto += w` and chooses the first index where `upto >= r` (`:44-50`). If the inner loop ends without that condition ever holding, nothing is appended and nothing is popped; the outer loop continues (`:40`). There is no fallback branch. The returned list is therefore one id shorter than `k` for every iteration whose final running total ends below `r`.

## The mechanism, traced (verified by reading and by running)

The running total and `total` are computed differently. On CPython 3.12 and later, the built-in `sum()` uses Neumaier compensated summation for floats; `upto += w` is plain sequential addition. The two can disagree by a few ULPs. Verified on the venv's interpreter (Python 3.14.7): `sum([0.1]*10)` is `1.0`, the sequential loop gives `0.9999999999999999`.

`uniform(0, total)` is `a + (b - a) * self.random()` (verified from `inspect.getsource`), whose own docstring says the result is in `[a, b)` or `[a, b]` "depending on rounding". The largest value `random()` can return is `(2**53 - 1) / 2**53`, and `total * (1 - 2**-53)` rounds to `total - 1 ULP` in every non-power-of-two case (verified: no 1-ULP-gap example fell through). So the running total must end **at least 2 ULPs** below `sum()` for any generator output to fall past it.

Four conditions must therefore hold at once:

1. **Python 3.12 or newer.** The venv is 3.14.7 (`.venv/bin/python --version`). `pyproject.toml:21` says `requires-python = ">=3.11"`; there is no `.python-version` and `.github/workflows/ci.yml` pins no interpreter, so CI resolves whatever `uv sync` finds. On 3.11 `sum()` is sequential, `total` equals the running total exactly, and the gap cannot exist — **inferred** from the CPython 3.12 changelog ("sum() now uses Neumaier summation"); only 3.14 is installed here, so it was not run.
2. **Weights with full 53-bit mantissas.** The mastery columns are `REAL` (`app/models/mastery_log.py:49-50`; `alembic/versions/25cc44bc1dfe_card_field_mastery_behind_.py:29-30`). A first hypothesis was that float32 inputs shield the sums: 24-bit mantissas summed a dozen times stay exact in double, so both totals would agree. That hypothesis is **false on this path** (verified). The driver is psycopg2 (`pyproject.toml:17`) reading in text form with `extra_float_digits = 1` on PostgreSQL 18.6 (both read from the dev connection), so the server emits the shortest decimal (`34.4`) and Python parses it as the nearest double, not the float32 value `34.400001525878906`. Called through the real ORM function `db_fetch_generation_candidates` (`app/database_ops/practice_generation.py:11-52`) on a dev-database card, a candidate row came back as `prompt_mastery=80.858505` with 53 significant bits; across the 2000 most recent `mastery_log` rows, 614 of 1662 values were not float32-exact in Python. `field_score` (`app/mastery/ema.py:92-95`) averages two such values, and `:41` subtracts from `100.0`, so the weights are arbitrary doubles.
3. **A candidate list whose running total ends ≥ 2 ULPs below `sum()`.** Monte Carlo with masteries emulated through the same text round trip (float32, shortest decimal, `float()`), 200,000 lists per size:

   | candidates | running total below `sum()` | by ≥ 2 ULP |
   |---|---|---|
   | 2 | 0% | 0% |
   | 3 | 4.7% | 0% |
   | 4 | 10.5% | 0.06% |
   | 6 | 14.6% | 0.19% |
   | 8 | 20.2% | 0.87% |
   | 10 | 20.8% | 1.33% |

   Two or three candidates can never produce the gap.
4. **The generator lands in the gap.** For three example lists, exactly 1 or 2 of the 2^53 possible `random()` outputs do (binary search over `k` in `total * (k / 2**53) > running_total`): 1.1e-16 to 2.2e-16 per draw, conditional on condition 3. Combined with condition 3 the per-draw probability is of order 1e-18.

## Reproduction (verified)

Run from the repo root with `uv run python`. `MaxRandom` pins `random()` to the generator's largest legitimate output; `uniform()` is inherited, so the arithmetic that produces `r` is the real code.

```python
import random, uuid
from app.services.practice_generation import weighted_low_mastery_sample, MASTERY_CEILING

class MaxRandom(random.Random):
    def random(self):
        return (2**53 - 1) / 2**53

weights = [43.5220465, 90.2094725, 27.283665, 83.5831477]   # a >=2-ULP gap list found by search
upto = 0.0
for w in weights:
    upto += w
print(sum(weights), upto)                                   # 244.59833170000002 244.59833169999996
cands = [(uuid.uuid4(), MASTERY_CEILING - w) for w in weights]
print(len(weighted_low_mastery_sample(cands, 1, MaxRandom())))   # 0  (asked for 1)
```

Output on Python 3.14.7: `sum()` is `244.59833170000002`, the running total `244.59833169999996` (2 ULPs lower), `uniform(0, total)` returns `244.5983317`, which exceeds the running total, and the sampler returns **0 ids for k=1**. Two million draws with an unpinned, seeded `random.Random` on the same gap lists returned short **0** times, as the probability predicts.

## How a short draw surfaces (verified by reading)

`resolve_prompts_or_answers` (`app/services/practice_generation.py:82-85`) draws `count` from `pool_counts`, asks the sampler for `count - len(forced)`, and returns `surviving_fixed + forced + sampled_pool`. A short draw returns one pool field fewer than the drawn count. Two outcomes:

- Count 2 or more: the appearance shows one fewer pool field. Because the count itself is drawn at random from `pool_counts`, a user cannot distinguish this from a smaller draw unless `pool_counts` holds a single value.
- Count 1 with no fixed fields on that side: the side is empty, `generate_practice_card_fields` returns `None` (`:119-120`), and the caller either skips the card at run start (`app/services/practice_run.py:193-206`, `continue` at `:205`) or drops the retry (`:817-833`, `return None` at `:832`), which parks the card in the `still_failed` bucket. Both are indistinguishable from the degraded case ADR 013 sanctions for a field archived mid-practice.

## Why the tests miss it (verified by reading `tests/api_tests/test_practice_run.py`)

The only tests that pin a drawn count do so under `random.Random(1)`: `test_blank_pool_field_never_drawn` (`:867-880`, asserts both survivors are drawn) and `test_blank_fixed_answer_excluded_card_still_generates` (`:901-910`, asserts `len(answers) == 1`). A fixed seed exercises one generator path and cannot reach a 1-in-2^53 output. No test feeds the sampler a hand-built weight list.

## Where the docs and the code disagree

- **ADR 036** (`docs/adr/036-guarantee-failed-answer-fields-on-requeue.md:13`): "The answer count therefore stays consistent with the drawn pool count; only when the failed fields alone outnumber the drawn count does the total exceed it." A short draw makes the answer count one below the drawn count, which this sentence excludes.
- **Task 001** (`docs/tasks/001-schema-rewrite.md:261`): "Clamp the drawn count to what survives" is the only stated reason for returning fewer than the count. The sampler's docstring (`app/services/practice_generation.py:29`, "up to k") reads the same way. The rounding short-fall is a second, unrecorded reason.
- Nothing in any ADR, task file, or comment records that the draw depends on `sum()` and the sequential loop agreeing, that the behaviour differs between Python 3.11 and 3.12+, or that `REAL` columns reach Python as full-precision doubles rather than float32 values.

## Decisions the builder made on its own (no ADR, task, or contract records them)

- The cumulative-walk sampling with `sum()` for the total and sequential addition for the walk, with no terminal fallback (present since `011f6ef`, 2026-08-18, when `requires-python` was already `>=3.11`; unchanged by `570325d`).
- `REAL` for the mastery columns (task 001's schema sketch at `docs/tasks/001-schema-rewrite.md:99` says `real`; no reasoning is recorded), and, by omission, the text-protocol read that turns them into shortest-decimal doubles.

## Decision (2026-09-28)

Deferred by the user: "record findings, I am not fixing it now". No plan exists. Reasoning: the per-draw probability is of order 1e-18, and the worst outcome (a skipped card or a dropped retry) is already a sanctioned degraded state.

It would be worth revisiting if any of these becomes true: a caller starts relying on the returned length equalling `k` (for example a test or an invariant asserting the pool count exactly), the sampler is reworked for another reason (ADR 036 amendments or a weighting change, which task 001 anticipated by keeping the formula in one function), or the source-scan guard tests gain a rule about draw-count exactness. A fix, when planned, is a one-line concern in `weighted_low_mastery_sample` (the terminal case of the walk) and belongs in /plan, not here.

## What could not be settled

- The short draw was not produced with the real, unpinned generator; the reproduction pins `random()` to its maximum output. Producing it naturally needs one of 1–2 specific outputs out of 2^53.
- The Python 3.11 boundary was not run, only inferred from the changelog; only 3.14.7 is installed.
- Which interpreter CI resolves was not checked, only that nothing pins it.
- The test suite was not run in this session; nothing in the question depended on it, and a peer session may hold the test database.

## Noticed in passing

- ADR 013 cites `app/services/practice_session.py:114-126` and `:184-195`; that file no longer exists (renamed to `practice_run.py` per ADR 038) and the numbers no longer apply.
- Every mastery value read from `REAL` is re-parsed from its shortest decimal, so EMA blends operate on a double that differs from the stored float32 by under one float32 ULP per read–write cycle.
- `generate_practice_card_fields` (`app/services/practice_generation.py:106-118`) runs the candidate query twice per card, once per side, with the same card id.
- CI's unpinned Python means stdlib behaviour like this `sum()` change can differ between a developer's machine and CI.
