# ADR 110: A partial unique index for one active run per practice

## Status

Active

## Context

PDR 038 lets a practice have at most one active run. Starting the practice continues its active run when it has one, and starts a new run only when none is active.

PDR 040 lets the user start a next run of the practice from a completed run's page, over every card of the practice or over the cards chosen on its summary, and starts neither while the practice has an active run, telling the user so.

Every run belongs to exactly one practice (ADR 105).

A run still active with no pending card is marked completed when its current card is read, so an active run can have nothing left to ask.

A staged insert that reports a constraint failure by returning `None` is named `db_try_stage_<verb>_<noun>`, and owns its savepoint (ADR 055).

Every refusal a user reaches carries a code, and the frontend chooses the sentence by that code (ADR 070). `run_active` names a refusal about a run that is itself still active, and no screen reaches it.

Two requests can start the same practice at once, from two tabs or two devices.

## Decision

We will hold at most one active run per practice with a partial unique index, `uq_run_practice_id_active`, on `run (practice_id) WHERE status = 'active'`.

We will have starting a practice, in one transaction, read the practice's active run, complete it when it has no pending card, and return it if it is still active. Otherwise the start creates a run through `db_try_stage_create_run`, which returns `None` when the index refuses, and on `None` reads and returns the run a concurrent start created.

We will have a rerun and a run of chosen cards refuse, before anything is cut, while the practice has an active run, with the code `practice_has_active_run`. `run_active` keeps its one meaning: the run asked about is itself still active.

## Alternatives considered

### A service check under a row lock alone

Rejected because a path that forgets the lock makes two active runs silently.

### A `practice.active_run_id` pointer

Rejected because it stores one fact twice, kept in step by every path that ends or deletes a run.

### The index alone, inserting first

Rejected because every continue would go through a constraint failure, and a run with nothing left would block new ones.

### `run_active` for both refusals

Rejected because one code would carry two meanings.

## Consequences

**Positive**

- The developer gets a second active run refused by the database, whatever path writes it.
- The user who starts a practice lands on the one run there is to go on with, and a run with nothing left no longer stands in the way.
- The developer reads each refusal code as naming one situation.

**Negative**

- The developer handles a staged insert that can return `None`, followed by a read of the concurrent start's run.
- The server reads the practice's active run before every start.

**Neutral**

- The user who starts one practice from two devices at once lands on one run in both.
