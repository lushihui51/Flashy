# 012 — Payload modules: entity models hold only their own row shapes

The models-layout cleanup from the 2026-09-14 /plan session: composite request/response shapes leave the entity modules for `<router>_payloads.py` modules, and a guard test keeps it that way. Branch: `refactor/model-payload-modules`, after 010 T3's commit `5a28d39` is on the checkout (`FieldMasteryDelta` moves with the breakdown shapes). Parallel-safe with 010 T4, which is frontend-only.

## ADRs

Decisions this file implements; full context and rejected alternatives live in the ADRs.

- **ADR 046 — Entity modules hold only a table's own row shapes; composite payloads live in payload modules**: `app/models/<table>.py` holds the table, its `Base`, and single-row `Create`/`Read`/`Update`/`Summary` shapes (a Summary may add scalars about that row, never a nested model); anything that nests another model or is not one row of its table lives in `app/models/<router>_payloads.py`. A source-scan guard test enforces the checkable half: a module containing `table=True` may import from a sibling only names that resolve to objects with `__table__` (table classes, for relationships), never a shape.

## Minor decisions

- **MD-1**: `app/models/__init__.py` keeps its `__all__` exactly as is; only the import paths of the ten moved deck payload names are repointed to `deck_payloads.py`. Nothing in `app/` or `tests/` imports from the package level today; this keeps the diff mechanical.

## Contracts

### Module inventories after this cycle (ADR 046)

Every class is moved by cut-and-paste: class bodies, docstrings, `Field(...)` declarations, and base classes are unchanged; the only edits anywhere are import lines and the new modules' docstrings. Class order in a new module is the source-file order given here.

`app/models/practice_run_payloads.py` (new) — exactly, in this order: `PracticeRunDeckSummary`, `PracticeRunSummary` (from `practice_run.py`); then `ResolvedFieldValue`, `RunProgress`, `CurrentRunCard`, `PracticeRunState`, `BreakdownBucket`, `RatedFieldValue`, `BreakdownAttempt`, `FieldMasteryDelta`, `BreakdownCard`, `PracticeRunBreakdown`, `RatingSubmission`, `RatingSubmissionResult` (from `practice_card.py`, in their current order there). Imports `RunStatus` and `PracticeRunRead` from `practice_run`, `PracticeCardStatus` and `PracticeCardRead` from `practice_card`, `FieldType` from `field_def`.

`app/models/deck_payloads.py` (new) — exactly, in this order: the `DeckFieldOrderKey = str` alias with its docstring, `FieldDefBatchCreate`, `FieldDefBatchUpdate`, `FieldDefBatchOps`, `CardBatchCreate`, `CardBatchUpdate`, `CardBatchOps`, `DeckBatchEdit`, `DeckCreate`, `DeckFieldDefRead`, `DeckDetail`. Imports `CardRead` from `card`, `FieldDefCreate` and `FieldType` from `field_def`.

Entity modules afterward, exactly: `practice_card.py` = `PracticeCardStatus`, `PracticeCard`, `PracticeCardRead`. `practice_run.py` = `RunStatus`, `PracticeRun`, `PracticeRunCreate`, `PracticeRunRerun`, `PracticeRunRead`. `deck.py` = `DeckBase`, `Deck`, `DeckRead`, `DeckSummary`. All three import only from `app.models.base` (plus stdlib/sqlalchemy/sqlmodel). `card.py`, `subject.py`, `field_def.py`, `deck_practice_config.py`, and the five table-only modules are untouched.

Each new module opens with a docstring whose first sentence is: "Composite request/response shapes for the `<router>` router — models that nest another entity's shape or describe a flow or page rather than one row of a table (ADR 046); entity modules under `app/models/` hold only a table and its own single-row shapes."

### Guard test (ADR 046)

`tests/api_tests/test_models_layout_guard.py`, one test. For every `app/models/*.py` whose source text contains `table=True`: parse it with `ast`, collect every `from app.models.<x> import <names>` where `<x>` is not `base`, resolve each name with `importlib.import_module("app.models.<x>")` + `getattr`, and assert `hasattr(obj, "__table__")`. Failure message names the module, the imported name, and the sibling it came from, and says non-table shapes belong in a `<router>_payloads.py` module (ADR 046). Modules without `table=True` (`base.py`, `__init__.py`, the payload modules) are not scanned.

### API surface (unchanged)

OpenAPI schema names are class names, so `frontend/src/api/openapi.json` and `types.ts` are byte-identical before and after. Every task's Done-when proves it with `npm run gen:api` followed by `git diff --exit-code` on those two files.

## Tasks

### T1 — `practice_run_payloads.py` (ADR 046)

- [x] **Goal:** `practice_card.py` and `practice_run.py` hold only their own row shapes; the run-page and rating payloads live in `practice_run_payloads.py`.
- **Files:** `app/models/practice_run_payloads.py` (new), `app/models/practice_card.py`, `app/models/practice_run.py`, `app/routers/api/practice_run.py`, `app/services/practice_run.py`, `app/database_ops/practice_run.py`.
- **Details:** Per the module-inventory contract. Move the 14 classes by cut-and-paste. Repoint three import blocks: the router's `from app.models.practice_card import (PracticeRunState, PracticeRunBreakdown, RatingSubmission, RatingSubmissionResult)` and its `PracticeRunSummary` line, the service's block of the same names plus `BreakdownAttempt`/`BreakdownBucket`/`BreakdownCard`/`CurrentRunCard`/`FieldMasteryDelta`/`RatedFieldValue`/`ResolvedFieldValue`/`RunProgress`, and `database_ops/practice_run.py`'s `PracticeRunDeckSummary`/`PracticeRunSummary`. After the move `practice_card.py` imports nothing from `field_def` or `practice_run` — delete those two lines. `app/models/__init__.py` is not touched: it re-exports none of these. `tests/api_tests/test_practice_run.py` mentions `PracticeRunSummary` only in a docstring; no test file changes.
- **Out of scope:** renaming any class; reordering fields; touching `deck.py` (T2); the guard test (T3); any change to `card.py`.
- **Done when:** `grep -E "^class |^[A-Za-z]+ = " app/models/practice_run_payloads.py app/models/practice_card.py app/models/practice_run.py` lists exactly the contract's inventories in the contract's order; `grep -n "^from app.models" app/models/practice_card.py app/models/practice_run.py` shows only `app.models.base`; `python -c "import app.main"` succeeds; full `pytest` passes with no test file modified; in `frontend/`, `npm run gen:api && git diff --exit-code -- src/api/openapi.json src/api/types.ts` exits 0 — if it doesn't, stop: something other than a move happened.
- Notes: The contract's inventory sentence for `practice_run_payloads.py` gives an explicit comma-separated order ending `..., PracticeRunBreakdown, RatingSubmission, RatingSubmissionResult`, then a trailing parenthetical `(from practice_card.py, in their current order there)` — but `RatingSubmission`/`RatingSubmissionResult` are defined _first_ in `practice_card.py` today (right after `PracticeCardRead`), not last, so the two clauses disagree on where they land. Read the explicit list as authoritative (the parenthetical as loose wording confirming provenance and content, not a second ordering instruction) and placed them last, matching the file as written. Zero behavioral stakes either way — flagging in case the other order was intended. All four `Done when` checks pass, including the `gen:api` byte-identical diff (exit 0, no changes to `openapi.json`/`types.ts`), confirming this was a pure move.

### T2 — `deck_payloads.py` (ADR 046, MD-1) — independent of T1

- [x] **Goal:** `deck.py` holds only the deck's own row shapes; the create, detail, and batch-edit payloads live in `deck_payloads.py`.
- **Files:** `app/models/deck_payloads.py` (new), `app/models/deck.py`, `app/routers/api/deck.py`, `app/services/deck_batch_edit.py`, `app/models/__init__.py`.
- **Details:** Per the module-inventory contract. Move the alias and 10 classes by cut-and-paste. Repoint the router's `from app.models.deck import (Deck, DeckBatchEdit, DeckCreate, DeckDetail, DeckFieldDefRead, DeckSummary)` — `Deck` and `DeckSummary` stay on `deck`, the other four come from `deck_payloads` — and `deck_batch_edit.py`'s `DeckBatchEdit`. Per MD-1, `__init__.py`'s `from app.models.deck import (...)` splits into the four names that stay and a new `from app.models.deck_payloads import (...)` for the ten that moved; `__all__` is byte-identical. After the move `deck.py` imports nothing from `card` or `field_def` — delete those two lines. `services/deck_create.py` imports `FieldDefCreate` from `field_def` directly and is unaffected.
- **Out of scope:** renaming any class; changing `__all__` membership; touching `practice_*` modules (T1); the guard test (T3); `card.py` and `CardMasteryRead`, which stay by ADR 046's derived-scalars clause.
- **Done when:** `grep -E "^class |^[A-Za-z]+ = " app/models/deck_payloads.py app/models/deck.py` lists exactly the contract's inventories in order; `grep -n "^from app.models" app/models/deck.py` shows only `app.models.base`; `git diff app/models/__init__.py` changes only import lines, never a line inside `__all__`; `python -c "import app.main"` succeeds; full `pytest` passes with no test file modified; in `frontend/`, `npm run gen:api && git diff --exit-code -- src/api/openapi.json src/api/types.ts` exits 0.
- Notes: Implemented exactly per contract — no ambiguity here (unlike T1's inventory sentence, this one's explicit order and the "from deck.py" provenance agree, since it matches deck.py's actual source order already). `__init__.py`'s `from app.models.deck import (...)` block was alphabetized before the split (not source-file order), so the two post-split blocks (`deck`: `Deck, DeckRead, DeckSummary`; `deck_payloads`: the other ten) are each alphabetized too, matching that file's existing convention; `__all__` is untouched (byte-identical, confirmed by `git diff`). All `Done when` checks pass, including the `gen:api` byte-identical diff (exit 0). Full `pytest`: 280 passed, no test file modified.

### T3 — The layout guard (ADR 046) — after T1 and T2

- [ ] **Goal:** a test fails whenever a table module imports a non-table shape from a sibling, so ADR 046 outlives this cycle.
- **Files:** `tests/api_tests/test_models_layout_guard.py` (new).
- **Details:** Per the guard-test contract. Follows `tests/api_tests/test_schema_guard.py`'s source-scan shape, with `ast` for the import lines and `importlib` for resolution. `card.py`'s `CardFieldValue` import must pass (it has `__table__`); that is the case ADR 046's table-class exception exists for, so assert it explicitly in a second, positive test that imports `app.models.card` and checks the guard's own predicate returns true for `CardFieldValue` and false for `CardRead`.
- **Out of scope:** checking payload-module naming (ADR 046's `<router>_payloads.py` is convention, not enforced); scanning `app/models/__init__.py`; any change to source under `app/`.
- **Done when:** the guard passes on the tree as left by T1 and T2; it fails when `from app.models.field_def import FieldType` is temporarily pasted into `app/models/practice_card.py` (try it, confirm the message names `practice_card`, `FieldType`, and `field_def`, then revert); it still passes with `from app.models.card_field_value import CardFieldValue` present in `card.py`; full `pytest` passes.
- Notes:
