# 054 — A guest's reads

## Goal

Outcome: A request with no session reads one example library through every read the app has, and can change nothing.

Scope: The cycle covers the `app_user` row with no Clerk identity and the index that holds it to one; the read of that row; the script that takes an account's Clerk identity off and gives one back; `get_viewer` and `ViewerDep` on every `GET` route under `/api` but health, answering a request with no `Authorization` header as the example user, in a transaction made read only, with its zone never synced; the tests over the route table and over a guest's requests; FastAPI's own pages turned off; an example library made in the dev database; the auth line of `AGENTS.md`; and the vocabulary's row for the example library. It leaves out everything the frontend does for a guest, which later cycles build; the route that serves the frontend's files; and production's example library, which the owner makes by hand.

Judgement: The engineer judges on a local API started with the bypass off, `DEV_AUTH_USER_ID= uv run uvicorn app.main:app --port 8001`, by requests that carry no `Authorization` header: `GET /api/home` answers 200 with `steps` null, three `active_runs` led by the run of "Common words + Capitals", and one `recent_runs`, of "French from English"; `GET /api/decks` lists "Common words" and "Capitals"; `POST /api/decks` answers 401; and `/docs` answers 404. On the usual dev server, with the bypass on, the engineer's own library reads as it did.

## Records

- PDR 053: An example library for guests to look through
- ADR 007: Clerk as the authentication provider
- ADR 019: Server-stamped UTC instants, user-facing dates rendered in the stored user timezone
- ADR 034: Backend layering — routers, services, database_ops
- ADR 045: Alembic as the only schema path
- ADR 054: A metadata naming convention for every constraint and index
- ADR 055: `database_ops` as the sole persistence surface
- ADR 114: A run's day worked out on read in the user's zone, with no stored name
- ADR 129: The example library as one user's database rows
- ADR 130: A health endpoint resolving no user, for probes
- ADR 131: Guest reads answered as the example user, read-only

## Tasks

### T1 — The example user's row

**Status**

- [x]

**Goal**

The schema holds at most one `app_user` row with no Clerk identity, one function reads it, and the auth line of `AGENTS.md` cites only records that hold.

**Dependencies**

None.

**Files**

- `alembic/versions/<revision>_app_user_without_clerk_identity.py` (new, its revision id from `alembic revision`)
- `app/models/app_user.py`
- `app/database_ops/app_user.py`
- `tests/api_tests/test_example_user.py` (new)
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `AGENTS.md`

**Details**

ADR 129:

- `app_user.clerk_user_id` must be nullable, in `AppUser` and in the migration. Its unique constraint stays.
- A partial unique index named `uq_app_user_example` must hold at most one row whose `clerk_user_id` is null. It must be declared in `AppUser.__table_args__` and created by the migration, so the test database, built from the metadata, holds it too.
- The migration's `down_revision` must be `2691a674095a`. Its downgrade drops the index and sets the column not null.
- `app/database_ops/app_user.py` gains:

```python
def db_read_example_app_user(db: Session) -> AppUser | None:
    """The example user, the one row with no Clerk identity, or None when the database has none."""
```

- Nothing in this task may create, or lets a request create, a row with no `clerk_user_id`: `db_create_app_user` keeps taking a `str`.
- The module docstring of `app/database_ops/app_user.py` must stay true of a table that can hold a row with no Clerk identity; T2 and T3 keep it true as they add to the module.

Guidance: the index as `Index("uq_app_user_example", text("(clerk_user_id IS NULL)"), unique=True, postgresql_where=text("clerk_user_id IS NULL"))`, as `Run` in `app/models/run.py` declares its partial index.

The live site, under ADR 130: the Project line of `AGENTS.md` that begins "Auth is Clerk, verified by CurrentUserDep" cites ADR 072, which is superseded. Its `Reason` must read `ADR 007, ADR 130`, and its sentence and its `Guard` stay as they are. T3 rewrites the sentence when the code changes under it.

**Out of scope**

- `get_viewer`, `ViewerDep` and any change to a route: T3.
- The script that takes an identity off a row: T2.
- A column, a flag or a setting that names the example user: never; ADR 129 rejects each.

**Done when**

- `test_a_second_row_without_a_clerk_id_is_refused` in `tests/api_tests/test_example_user.py` passes: a second `app_user` with a null `clerk_user_id` raises `IntegrityError`.
- `test_rows_with_a_clerk_id_stand_beside_the_one_without` passes.
- `test_db_read_example_app_user_returns_the_row_or_none` passes.
- On a `pg_dump` copy of the dev database, then on the dev database, `uv run alembic upgrade head` applies the migration, and `uv run alembic check` prints `No new upgrade operations detected.`
- `uv run pytest tests/api_tests/test_record_citation_guard.py -q` prints `2 passed`.

**Debrief**

- `uv run pytest tests/api_tests/test_example_user.py -q` printed `3 passed`, covering `test_a_second_row_without_a_clerk_id_is_refused`, `test_rows_with_a_clerk_id_stand_beside_the_one_without` and `test_db_read_example_app_user_returns_the_row_or_none`.
- On a `pg_dump` copy of the dev database, `uv run alembic upgrade head` ran `2691a674095a -> 64c8eb861c12, app_user_without_clerk_identity`, and `uv run alembic check` printed `No new upgrade operations detected.`; on the copy, `downgrade -1` then `upgrade head` both ran too, and the copy was dropped. On the dev database, `upgrade head` ran the same revision, `alembic check` printed `No new upgrade operations detected.`, and `\d app_user` shows `"uq_app_user_example" UNIQUE, btree ((clerk_user_id IS NULL)) WHERE clerk_user_id IS NULL`. Its five rows all keep their `clerk_user_id`.
- `uv run pytest tests/api_tests/test_record_citation_guard.py -q` printed `2 passed`.
- The full `pytest` printed `387 passed`, and `npm run gen:api` left `frontend/src/api/openapi.json` and `frontend/src/api/types.ts` unchanged, since no response carries `AppUser`. There are no frontend changes, so the frontend checks did not run.
- No departure from guidance: the index is declared as the guidance gives it. The migration's revision id came from `alembic revision --autogenerate`, and its operations were rewritten in the style of the migrations before it.
- Read the new member comment on `AppUser.clerk_user_id` in `app/models/app_user.py`, and the rewritten module docstring of `app/database_ops/app_user.py`, which now separates a user's row, made on first sight of a Clerk id, from the example user's row, which nothing in the module creates.

### T2 — The example user's script

**Status**

- [x]

**Goal**

One script takes the Clerk identity off an account's `app_user` row, which makes it the example user, and gives an identity back to the example user.

**Dependencies**

- T1: `db_read_example_app_user`, the nullable `clerk_user_id` and `uq_app_user_example`.

**Files**

- `app/scripts/example_user.py` (new)
- `app/database_ops/app_user.py`
- `tests/api_tests/test_example_user.py`

**Details**

ADR 129. The script runs against the database `DATABASE_URL` names, as `uv run python -m app.scripts.example_user <command> <clerk_user_id>`:

- `detach <clerk_user_id>` sets to null the `clerk_user_id` of the row that holds it.
- `attach <clerk_user_id>` sets the example user's `clerk_user_id` to it.

Each prints the row's `id` on success and exits 0. Each is refused, with one line on stderr, exit status 1 and nothing written: `detach` when no row holds the id or an example user already exists; `attach` when the database has no example user or another row holds the id. Its lines are a developer's and never a user's.

```python
class ExampleUserError(Exception):
    """A refused detach or attach; its message is the line the script prints."""

def detach(db: Session, clerk_user_id: str) -> AppUser: ...
def attach(db: Session, clerk_user_id: str) -> AppUser: ...
def main(argv: list[str] | None = None) -> int: ...
```

`app/database_ops/app_user.py` gains the one statement the script writes with, which commits:

```python
def db_update_app_user_clerk_id(db: Session, user: AppUser, clerk_user_id: str | None) -> AppUser: ...
```

- The script must change nothing but `clerk_user_id`: the row's `timezone`, its `created_at` and every row it owns stay as they were, since the row's stored zone is the one its runs were made in (ADR 131).
- Every statement and session call but `commit` and `rollback` must be a `db_*` function (ADR 055); `tests/api_tests/test_layering_guard.py` scans `app/scripts/` too.
- The repository must hold no copy of any library: the script reads no file and writes no deck, card, practice or run (ADR 129).

Guidance: `main` opens `Session(engine)` from `app/database.py`, and the tests call `detach` and `attach` with the test session. The test of `main` replaces the `engine` the script imported with the test engine of `tests/conftest.py`, so it never reaches the dev database.

**Out of scope**

- Building or copying a library from the script: never; ADR 129 rejects it.
- Running the script against the dev database: T5.
- A check in `attach` that the id is a real Clerk user: never; the script holds no Clerk secret.

**Done when**

- `test_detach_makes_the_account_the_example_user` in `tests/api_tests/test_example_user.py` passes: after `detach`, `db_read_example_app_user` returns the row, with its `timezone` and its decks unchanged.
- `test_detach_is_refused_for_an_unknown_id_and_when_an_example_user_exists` passes.
- `test_attach_gives_the_example_user_an_identity` passes: after `attach`, `db_read_example_app_user` returns None and `db_read_app_user_by_clerk_id` returns the row.
- `test_attach_is_refused_with_no_example_user_and_for_an_id_in_use` passes.
- `test_main_exits_1_and_writes_nothing_on_a_refusal` passes.

**Debrief**

- `uv run pytest tests/api_tests/test_example_user.py -v` printed `9 passed`, among them `test_detach_makes_the_account_the_example_user` (the row's `timezone`, `created_at` and deck unchanged after `detach`), `test_detach_is_refused_for_an_unknown_id_and_when_an_example_user_exists`, `test_attach_gives_the_example_user_an_identity`, `test_attach_is_refused_with_no_example_user_and_for_an_id_in_use` and `test_main_exits_1_and_writes_nothing_on_a_refusal` (four refusals, four lines on stderr, nothing on stdout, both rows unchanged).
- The full `pytest` printed `393 passed`, `tests/api_tests/test_layering_guard.py` among them. Nothing under `app/models/`, `app/routers/` or `frontend/` changed, so neither `npm run gen:api` nor the frontend checks ran.
- No departure from guidance: `main` opens `Session(engine)`, and the tests of `main` replace the script's `engine` with `tests/conftest.py`'s through `monkeypatch`.
- Beyond the Done when, `test_main_prints_the_rows_id_and_exits_0` shows `main` printing the row's id and exiting 0 for `detach` then `attach`. A command line missing its arguments is argparse's usage error, exit status 2, not a refusal. A second process writing between the script's checks and its commit would surface as the `IntegrityError` of `db_update_app_user_clerk_id`, a traceback with nothing written, not as a one-line refusal.
- Read the module docstring of `app/scripts/example_user.py`, which is the script's usage for the owner, and the module docstring of `app/database_ops/app_user.py`, which now lists taking off and giving back the Clerk identity among the table's writes.

### T3 — A guest's reads

**Status**

- [x]

**Goal**

Every `GET` route under `/api` but health answers a request with no `Authorization` header as the example user, in a read-only transaction, and every route of another method still answers it 401.

**Dependencies**

- T1: `db_read_example_app_user`; `app/models/app_user.py` and `AGENTS.md`, which it shares.
- T2: `app/database_ops/app_user.py`, which it shares.

**Files**

- `app/dependencies.py`
- `app/models/app_user.py`
- `app/database_ops/app_user.py`
- `app/routers/api/card.py`
- `app/routers/api/deck.py`
- `app/routers/api/deletion_impact.py`
- `app/routers/api/field_def.py`
- `app/routers/api/health.py`
- `app/routers/api/home.py`
- `app/routers/api/practice.py`
- `app/routers/api/run.py`
- `tests/conftest.py`
- `tests/api_tests/test_guest_reads.py` (new)
- `tests/api_tests/test_user_timezone.py`
- `tests/api_tests/test_auth_scoping.py`
- `tests/api_tests/test_health.py`
- `tests/api_tests/test_verify_clerk_session.py`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `AGENTS.md`
- `docs/vocabulary.md`

**Details**

ADR 131. `app/dependencies.py` gains:

```python
def get_viewer(
    db: SessionDep,
    authorization: Annotated[str | None, Header()] = None,
    x_timezone: Annotated[str | None, Header()] = None,
) -> AppUser: ...

ViewerDep = Annotated[AppUser, Depends(get_viewer)]
```

- With the local bypass off and `authorization` None, `get_viewer` must return `db_read_example_app_user(db)`, and raise `HTTPException(401)` when it is None.
- In every other case it must answer as `get_current_app_user(db, authorization, x_timezone)` does, so a header that fails verification is 401 and, with the bypass on, the bypass's user answers.
- When it answers as the example user it must never call `_sync_timezone` or write the row (ADR 131), and it must make the request's transaction read only before it returns, through:

```python
def db_lock_transaction_read_only(db: Session) -> None:
    """Makes the session's open transaction read only, so a later statement that writes raises in PostgreSQL. No commit."""
```

in `app/database_ops/app_user.py`, which executes `SET TRANSACTION READ ONLY` after the example user's read. `lock` is already among `NON_WRITING_VERBS` in `tests/api_tests/test_layering_guard.py`.

- Every `GET` route under `/api` but `read_health` must take `ViewerDep` in place of `CurrentUserDep`, its parameter keeping its name. Every route of another method keeps `CurrentUserDep`. `get_current_app_user` and the bypass stay as they are.
- `read_health`'s docstring, and the docstring of `test_health_ok_without_auth` in `tests/api_tests/test_health.py`, must no longer call health the one route without `CurrentUserDep` (ADR 130). That test must remove the `get_viewer` override beside the other, so it still shows that health resolves no user.
- Every comment this task makes false must be corrected. Two of them sit in files it would not otherwise touch: the one on `AppUser.timezone` in `app/models/app_user.py`, since the example user's zone comes from no request, and the module docstring of `tests/api_tests/test_verify_clerk_session.py`, since a guest's tests run with no override.
- `tests/conftest.py`: `client` and `act_as` must override `get_viewer` beside `get_current_app_user`, so every existing test reads as its user. A test of a guest's request removes both overrides.

Tests, in `tests/api_tests/test_guest_reads.py` unless named elsewhere. The example library in them is a library a test builds as `existing_user` through the client, whose `clerk_user_id` it then sets to null.

- The read test must hold one request per `GET` route under `/api` but health, and must fail when the app's route table holds such a route it has no request for.
- The write test must take its routes from the app's route table: every route under `/api` of a method other than `GET`.
- The read-only test must show that a write in the session `get_viewer` answered a guest on raises, and that the session writes again after a rollback.
- The zone test, in `tests/api_tests/test_user_timezone.py`, sends `GET /api/practices/{id}` with no `Authorization` header and `X-Timezone: Pacific/Auckland` for an example user whose stored zone is `America/Los_Angeles`, and asserts the stored zone and the run's `day` are what they were before the request.
- `test_unauthenticated_request_is_rejected` in `tests/api_tests/test_auth_scoping.py` keeps its assertion, a 401 on `GET /api/decks/{id}` in a database with no example user, with both overrides removed. Its docstring must name `get_viewer` as the dependency the request reaches.

The live site, under ADR 130 and ADR 131: the Project line of `AGENTS.md` that T1 repointed must read:

```
- Auth is Clerk: CurrentUserDep in app/dependencies.py verifies a session on every route of a method other than GET, and ViewerDep answers a GET with no Authorization header as the example user, on every route but GET /api/health.
  - Reason: ADR 007, ADR 130, ADR 131
  - Guard: tests/api_tests/test_auth_scoping.py
```

`docs/vocabulary.md` gains one row, in the App area:

```
| App | The example library a guest is shown | — | — | `ViewerDep`; `get_viewer`; `db_read_example_app_user` |
```

Guidance: `get_viewer` keeps `get_current_app_user`'s two header parameters by name, so the generated schema changes only in `read_health`'s description.

**Out of scope**

- Removing or changing the local bypass in `app/dependencies.py`: never.
- `README.md`: never; it is not maintained.
- Changing `get_current_run_card` in `app/services/run.py` so that it writes nothing: never; ADR 131 accepts a guest's 500 there.
- A code or a sentence for a guest's 401: never; ADR 131 keeps it the 401 a request with no session had.
- The test over which dependency each route takes, and FastAPI's own pages: T4.
- `useViewer` and what the frontend sends before Clerk has loaded: a later cycle.
- An example library in the dev database: T5.

**Done when**

- `test_every_get_route_answers_a_guest_200` passes.
- `test_the_read_test_covers_every_get_route_in_the_route_table` passes.
- `test_every_writing_route_answers_a_guest_401` passes.
- `test_a_token_that_fails_verification_is_401_on_a_read` passes.
- `test_a_read_with_no_header_is_401_in_a_database_with_no_example_user` passes.
- `test_a_guests_transaction_refuses_a_write_and_the_next_one_writes` passes.
- `test_the_bypass_answers_a_read_with_no_header_as_its_user` passes.
- `test_a_guests_zone_header_changes_neither_the_stored_zone_nor_a_runs_day` in `tests/api_tests/test_user_timezone.py` passes.
- `uv run pytest tests/api_tests/test_record_citation_guard.py -q` prints `2 passed`.
- `grep -c "ViewerDep" docs/vocabulary.md` prints `1`.

**Debrief**

- `uv run pytest tests/api_tests/test_guest_reads.py -v` printed `7 passed`: `test_every_get_route_answers_a_guest_200` (its fourteen requests each 200, the decks listed are the example library's "Verbs", and home's one active run is the library's), `test_the_read_test_covers_every_get_route_in_the_route_table` (the set of paths in `READ_REQUESTS` equals the route table's `GET` paths under `/api` but health), `test_every_writing_route_answers_a_guest_401` (eighteen routes taken from the route table, each 401, with home reading the same after), `test_a_token_that_fails_verification_is_401_on_a_read`, `test_a_read_with_no_header_is_401_in_a_database_with_no_example_user`, `test_a_guests_transaction_refuses_a_write_and_the_next_one_writes` (the write raises `DBAPIError` with `pgcode` `25006`, read_only_sql_transaction, and after `rollback` the same write commits) and `test_the_bypass_answers_a_read_with_no_header_as_its_user` (the bypass's user's deck "Nouns" is listed, not the example library's).
- `test_a_guests_zone_header_changes_neither_the_stored_zone_nor_a_runs_day` in `tests/api_tests/test_user_timezone.py` passed: a run whose start is set to 20:30 UTC on 2026-11-03 reads `2026-11-03` under `America/Los_Angeles`, still reads it for a guest sending `X-Timezone: Pacific/Auckland`, where it is already the 4th, and the stored zone stays `America/Los_Angeles`. The start is set on the row by hand, as `TestRunDay` in `tests/api_tests/test_runs.py` does.
- `uv run pytest tests/api_tests/test_record_citation_guard.py -q` printed `2 passed`.
- `grep -c "ViewerDep" docs/vocabulary.md` printed `1`; the row stands after "The signed-in user" in the App area.
- The full `pytest` printed `401 passed`, with no other connection to the test database before it. `npm run gen:api` changed only `read_health`'s description in `frontend/src/api/openapi.json` and `frontend/src/api/types.ts`. `npx vitest run` printed `733 passed`, `npm run lint` printed nothing, and `npm run build` exited 0.
- No departure from guidance: `get_viewer` keeps `get_current_app_user`'s two header parameters by name. Its 401 for a guest in a database with no example user carries the same detail as the 401 of a request with no header had before.
- Read `get_viewer` in `app/dependencies.py`, the one branch a guest takes; the member comment on `AppUser.timezone` in `app/models/app_user.py`, rewritten since the example user's zone comes from no request; and `READ_REQUESTS` in `tests/api_tests/test_guest_reads.py`, which a new `GET` route must join.

### T4 — The route table's guard

**Status**

- [ ]

**Goal**

The app registers no route outside `/api`, and a test fails on a route that takes the wrong dependency for its method or stands outside `/api`.

**Dependencies**

- T3: `get_viewer` and `ViewerDep` on every `GET` route; `AGENTS.md`, which it shares.

**Files**

- `app/main.py`
- `tests/api_tests/test_route_table.py` (new)
- `AGENTS.md`

**Details**

ADR 131:

- `app` in `app/main.py` must be made with `docs_url=None`, `redoc_url=None` and `openapi_url=None`, so that `/docs`, `/docs/oauth2-redirect`, `/redoc` and `/openapi.json` are no longer routes. `app.openapi()` still answers, and `app/scripts/export_openapi.py` reads the schema through it.
- `tests/api_tests/test_route_table.py` must read every entry of `app.routes`, whatever its class, and fail on: a `GET` route under `/api` other than `/api/health` whose dependencies do not hold `get_viewer`; a route under `/api` of another method whose dependencies do not hold `get_current_app_user`; and any entry whose path does not begin with `/api/`.
- `/api/health` must depend on neither function (ADR 130).
- The Project line of `AGENTS.md` that begins "Auth is Clerk" must give its `Guard` as `tests/api_tests/test_auth_scoping.py, tests/api_tests/test_route_table.py`.

Guidance: a route's dependencies are `route.dependant.dependencies`, each with the function it calls as `.call`.

**Out of scope**

- An exemption for the route that serves the frontend's files: a later cycle, which adds that route.
- FastAPI's pages kept on in development alone: never in this cycle; ADR 131's test allows no route outside `/api`.
- `README.md`, which names `/docs`: never; it is not maintained.

**Done when**

- `test_every_get_route_under_api_but_health_takes_viewer_dep` in `tests/api_tests/test_route_table.py` passes.
- `test_every_route_of_another_method_takes_current_user_dep` passes.
- `test_health_resolves_no_user` passes.
- `test_no_route_stands_outside_api` passes.
- On the dev server, `curl -s -o /dev/null -w '%{http_code}' localhost:8000/docs` prints `404`, and the same for `/redoc` and `/openapi.json`.
- In `frontend/`, `npm run gen:api` leaves `git status --porcelain src/api` empty.

**Debrief**

None.

### T5 — Dev's example library

**Status**

- [ ]

**Goal**

The dev database holds an example library of two decks, four practices and their runs, which a request with no session reads.

**Dependencies**

- T2: `python -m app.scripts.example_user detach`.
- T3: `get_viewer` answering a request with no `Authorization` header as the example user.
- T4: the app with no route outside `/api`.

**Files**

None.

**Details**

The library is made by using the running app as an account of its own, then that account is made the example user (ADR 129). Every row must be written through the API's routes, by requests to a local API started with the bypass on as a new account: no statement is run against the database by hand, and no instant is written by hand. Nothing made here is committed to the repository: no script, no file of cards.

- Every request that makes the library must carry `X-Timezone` naming the dev machine's zone, so the account's stored zone is the zone its runs were made in and each run reads the day it was really run.
- The library must hold a deck named "Common words", of 50 everyday words, each card holding the word in five fields in this order: English, Chinese, Korean, French, Spanish. Every card has a value in every field.
- It must hold a second deck named "Capitals", of 20 well-known countries, each card holding three fields in this order: Country, Capital, Continent.
- It must hold four practices, each with at least one completed run:
  - "Common words + Capitals" holds both decks: a Common words card shows English and asks Spanish, and a Capitals card shows Country and asks Capital and Continent.
  - "Korean from Chinese and English" holds Common words: every card shows Chinese and English and asks Korean.
  - "Two at random" holds Common words: every card shows English and asks two of the other four languages, drawn at random each time the card comes up.
  - "French from English" holds Common words: every card shows English and asks French.
- Three practices must have a run left partway, and "French from English" none:
  - "Common words + Capitals", the run acted in most recently of the three, stands at a Capitals card on its first attempt, with no card failed so far.
  - "Korean from Chinese and English" stands at a card that has come back as a retry, with others still to come back.
  - "Two at random" stands at a card on its first attempt, with some cards retried earlier in the run.
- When the library is whole, `uv run python -m app.scripts.example_user detach <the account's clerk_user_id>` makes the account the example user. That id is the `DEV_AUTH_USER_ID` the account was made under.

Guidance: a second API beside the dev server, `DEV_AUTH_USER_ID=example-library ENV=development uv run uvicorn app.main:app --port 8001`, answers every request as the new account; `PUT /api/practices/{practice_id}/configurations/{deck_id}` sets how a practice asks a deck; a run is completed by rating it to its last card or by `POST /api/runs/{run_id}/end`; and ratings mixed among the four leave the decks' mastery circles neither empty nor full. Read `GET /api/runs/{run_id}/state` before each rating to steer a run to its state.

**Out of scope**

- Production's example library: never a builder's; the owner makes it by hand.
- Deleting or changing any other account's rows in the dev database: never.
- A file of the library's cards, or a script that makes them, in the repository: never; ADR 129 rejects both.
- Dates that keep pace with the visitor's today: never.

**Done when**

Each on a local API started with the bypass off, `DEV_AUTH_USER_ID= uv run uvicorn app.main:app --port 8001`, by requests with no `Authorization` header:

- `GET /api/decks` lists two decks, "Common words" with 50 cards and "Capitals" with 20, and `GET /api/decks/{deck_id}/fields` gives each deck's fields in the order above.
- `GET /api/practices` lists the four practices by the names above, and `GET /api/practices/{practice_id}` gives each at least one run whose `status` is `completed` and the configurations above.
- `GET /api/home` answers 200 with `steps` null, three `active_runs`, the first of "Common words + Capitals", and one `recent_runs`, of "French from English".
- `GET /api/runs/{run_id}/state` for the run of "Common words + Capitals" gives a `current_card` whose `prompts` hold one value, of the field Country, with `attempt` 1 and `progress.still_failed` and `progress.retry_pending` both 0.
- The same read for the run of "Korean from Chinese and English" gives a `current_card` with `attempt` above 1 and `progress.retry_pending` of at least 2.
- The same read for the run of "Two at random" gives a `current_card` with `attempt` 1 and two answers; the ratings given in that run, listed in the Debrief, show at least two cards rated Again and answered again before this card.
- `POST /api/decks` answers 401, and `/docs` answers 404.
- On the usual dev server, with the bypass on, `GET /api/decks` lists the decks it listed before this task.

**Debrief**

None.
