# 059 — The deployed service

Waits for: 054, its `get_viewer` answering a request with no `Authorization` header as the example user, its app with no route outside `/api`, dev's example library, and `app/main.py` and `tests/api_tests/test_route_table.py`, which it shares; 057, its guest's pages drawn from the example library under the guest's banner.

## Goal

Outcome: The repository builds into the one service Railway deploys from `main`, whose process serves the frontend and the API at one origin.

Scope: The cycle covers the API's process serving the built frontend's files, and the frontend's `index.html` at any address outside `/api` that names no file; the route-table test's one exemption for that route; `test_database_url` made optional; and the `Dockerfile` that builds the frontend and the API into one image, with its `.dockerignore`. It takes as done by the owner, before it is built: a Railway project on the Hobby plan holding the service and Railway's PostgreSQL template as shipped, with Serverless off; the service linked to the repository's `main`, with Wait for CI on, `alembic upgrade head` as its pre-deploy command and `/api/health` as its healthcheck path; the service's variables, `DATABASE_URL` as a reference to the PostgreSQL service's own variable, `PERMITTED_ORIGINS` holding the app's one address, `CLERK_FAPI_URL` and `VITE_CLERK_PUBLISHABLE_KEY`, with no `ENV`, `DEV_AUTH_USER_ID` or `TEST_DATABASE_URL`; the owner's domain attached to the service; a Clerk production instance cloned from the development one, on that domain, its DNS records added; and a hard usage limit of $20 a billing cycle with a usage alert below it. It leaves out the first deploy, which starts only when a commit reaches `main` and is the owner's to watch; production's example library, which the owner makes by hand after it; and the README.

Judgement: The engineer judges on the image, built and run on their own machine against the dev database with the four variables and a `PORT` set and no others. At the container's address, signed out, Home shows the example library under the guest's banner; a page's address opened directly, `/library`, shows that page; `/api/health` answers 200; an unknown address under `/api` answers 404 and not a page; and `alembic upgrade head`, run in the image against an empty database, brings it to the chain's head. On the usual dev servers, with `frontend/dist` moved away, the app runs as it did.

## Records

- PDR 053: An example library for guests to look through
- ADR 041: GitHub Actions for CI
- ADR 045: Alembic as the only schema path
- ADR 128: One service serving the frontend and the API
- ADR 130: A health endpoint resolving no user, for probes
- ADR 131: Guest reads answered as the example user, read-only
- ADR 137: Railway's Hobby plan for hosting, with no backups
- ADR 138: A deploy from `main`, migrated before going live
- ADR 139: A Clerk production instance on the owner's domain
- ADR 140: Railway's usage limit instead of a rate limiter

## Tasks

### T1 — The frontend served by the API

**Status**

- [ ]

**Goal**

Where a built frontend exists, the API's process serves its files and answers any other address outside `/api` with its `index.html`; where none exists, it serves `/api` alone.

**Dependencies**

None.

**Files**

- `app/frontend.py` (new)
- `app/main.py`
- `tests/api_tests/test_frontend.py` (new)
- `tests/api_tests/test_route_table.py`
- `AGENTS.md`

**Details**

ADR 128. `app/frontend.py`:

```python
# The name the one route outside /api is registered under, by which the route-table test knows it.
FRONTEND_ROUTE_NAME = "frontend"

def add_frontend(app: FastAPI, dist: Path) -> None:
    """Registers the one route outside /api, GET /{path:path}, named FRONTEND_ROUTE_NAME: a file of `dist` when the path names one, `dist/index.html` otherwise, and 404 for a path under /api."""
```

- The built frontend is `frontend/dist` beside `app/`, the folder `npm run build` writes. `app/main.py` must call `add_frontend` with it after every `/api` router is included, and only when that folder holds an `index.html`; with none, the app registers no route outside `/api`, as today.
- The route must be registered for `GET` alone, with `include_in_schema=False`, so the generated schema is one with a build and without. Another method on a path no `/api` route matches answers Starlette's 405, never a page. A path that names a file under `dist` answers that file; any other path answers `dist/index.html` with 200, so a page's address opens the app; `api` and any path beginning `api/` answer 404 as an unknown `/api` address does today, never a page.
- With a built frontend, the route matches every path for `GET` and none for another method, which changes three answers under `/api`, each accepted since the app's client sends none of them: a `GET` to a path that only another method serves, such as `/api/runs/{run_id}/end`, answers 404, not 405; a `GET` with a trailing slash, such as `/api/decks/`, answers 404, not a redirect; and another method on a path no `/api` route serves, such as `POST /api/nope` or `POST /api/decks/`, answers 405, not 404 or a redirect.
- A `frontend/dist` that `npm run build` leaves on a dev machine is served by the dev API like any other, and the dev API then answers under `/api` as the bullet above gives; this is accepted.
- It must never answer a file outside `dist`, whatever the path holds.
- It takes no dependency that resolves a user and opens no session (ADR 131).
- `tests/api_tests/test_route_table.py` must exempt that one route, told by its name `FRONTEND_ROUTE_NAME` and its path `/{path:path}`, from the rule that no entry stands outside `/api`, and must fail on any other. Its case `test_no_route_stands_outside_api` becomes `test_the_only_route_outside_api_serves_the_frontend`. The test must pass on a machine that holds a built `frontend/dist` and on one that holds none.
- `tests/api_tests/test_frontend.py` builds its own `FastAPI` app over a folder it writes, and never reads `frontend/dist`.
- The Auth line of `AGENTS.md` must end "and ViewerDep answers a GET with no Authorization header as the example user, on every route under /api but GET /api/health.", its Reason and Guard lines unchanged, since the route that serves the frontend takes no `ViewerDep`.

**Out of scope**

- A second route or a mount outside `/api`: never; ADR 131 allows the one.
- Cache headers for the built files, or a content network: an unsettled decision.
- The CORS middleware and `VITE_API_BASE_URL`: they stay as they are.
- The image that holds `frontend/dist`: T2.
- A setting that names the folder: never; the folder is where the build writes it.

**Done when**

- In `tests/api_tests/test_frontend.py`, `test_a_path_that_names_a_file_answers_the_file` passes.
- `test_any_other_path_answers_index_html` passes, for `/` and for `/library`.
- `test_a_path_under_api_answers_404_and_no_page` passes, for `/api` and `/api/nope`.
- `test_a_path_that_climbs_out_of_dist_answers_no_file_outside_it` passes.
- `test_another_method_answers_405_and_no_page` passes, for `POST /library`.
- In `tests/api_tests/test_route_table.py`, `test_the_only_route_outside_api_serves_the_frontend` passes, with `frontend/dist` present and with it moved away.
- With `frontend/dist` built, `curl -s localhost:8000/library` on the dev API prints the built `index.html`, and `curl -s -o /dev/null -w '%{http_code}' localhost:8000/api/nope` and `curl -s -o /dev/null -w '%{http_code}' localhost:8000/api/decks/` each print `404`.

**Debrief**

None.

### T2 — The image

**Status**

- [ ]

**Goal**

One `Dockerfile` builds the frontend and the API into an image that starts with production's four variables alone, serves the app and the API, and runs `alembic upgrade head`.

**Dependencies**

- T1: `add_frontend`, and `app/main.py` serving `frontend/dist` where it exists.

**Files**

- `Dockerfile` (new)
- `.dockerignore` (new)
- `app/config.py`
- `tests/api_tests/test_config.py` (new)

**Details**

ADR 137 and ADR 138:

- `Settings` in `app/config.py` must take `test_database_url` as `str | None = None`, so the app starts with none. `tests/conftest.py` stays as it is, and builds its engine from the setting.
- `Dockerfile`, at the repository's root, must have two stages. A Node stage runs `npm ci` and `npm run build` in `frontend/`, taking `VITE_CLERK_PUBLISHABLE_KEY` as a build argument. The Python stage installs the dependencies `uv.lock` pins, without the dev group, and holds `pyproject.toml`, `uv.lock`, `app/`, `alembic/`, `alembic.ini` and the Node stage's built files at `frontend/dist`.
- The image's command must run the API on `0.0.0.0`, at the port `PORT` names and at 8000 without it.
- `alembic upgrade head`, typed as it is, must run from the image's working directory, since it is the pre-deploy command.
- The image must hold no `.env` file, since `Settings` reads one, and none of `tests/`, `docs/`, `node_modules/` or `.git/`. `.dockerignore` keeps them out of the build's context, with `.venv/`, `frontend/.env`, `frontend/dist` and `frontend/node_modules/`, the one `node_modules` the repository holds.
- The `Dockerfile` must give no value to the app's variables `ENV` and `DEV_AUTH_USER_ID`, nor to any of the four. Its `ENV` instruction may set what is not the app's, such as `PATH`.

Guidance: `fastapi run --host 0.0.0.0 --port ${PORT:-8000}` runs `app.main:app` through `[tool.fastapi]` in `pyproject.toml`; `uv sync --frozen --no-dev` installs from the lock file; the dev machine runs Python 3.14 and Node 24. For the checks, `docker run --network host` reaches the machine's PostgreSQL, the dev instance's publishable key is in `frontend/.env` and its `CLERK_FAPI_URL` in `.env`, and an empty database is `createdb` away. The dev API holds port 8000, so the container takes `PORT=8001`, and `PERMITTED_ORIGINS` is the JSON list `["http://localhost:8001"]`.

**Out of scope**

- `railway.toml` or `railway.json`: never; ADR 138 rejects them.
- A migration run when the app starts, or a check at startup that the database is at alembic's head: never; ADR 138 rejects both.
- A rate limiter in the app: never; ADR 140.
- A workflow that builds or pushes the image, or one that deploys: never; ADR 138 rejects it.
- Anything on Railway or Clerk, the first deploy, and production's example library: never a builder's; the owner's.
- Removing the local bypass: never.
- `README.md`: never; it is not maintained.

**Done when**

- `test_settings_start_without_a_test_database_url` in `tests/api_tests/test_config.py` passes.
- `docker build --build-arg VITE_CLERK_PUBLISHABLE_KEY=<the key in frontend/.env> -t flashy .` exits 0.
- `docker run --rm flashy sh -c 'ls -a . | grep -c -x -e .env -e tests -e docs -e node_modules -e .git'` prints `0`, and `docker run --rm flashy ls frontend` prints `dist` alone.
- With the image run on the host's network with `DATABASE_URL` naming the dev database, `PERMITTED_ORIGINS`, `CLERK_FAPI_URL` and `VITE_CLERK_PUBLISHABLE_KEY` set, `PORT=8001`, and no other variable of the app's:
  - `curl -s localhost:8001/api/health` prints `{"status":"ok"}`;
  - `curl -s localhost:8001/` and `curl -s localhost:8001/library` print one body, which holds `<div id="root">`;
  - the script that body names under `/assets/` answers 200;
  - `curl -s -o /dev/null -w '%{http_code}' localhost:8001/api/nope` prints `404`;
  - `curl -s localhost:8001/api/home`, with no `Authorization` header, answers 200 with three `active_runs`;
  - `curl -s -o /dev/null -w '%{http_code}' -X POST localhost:8001/api/decks` prints `401`.
- With `DATABASE_URL` naming an empty database, `docker run --rm --network host -e DATABASE_URL=... -e PERMITTED_ORIGINS=... -e CLERK_FAPI_URL=... -e VITE_CLERK_PUBLISHABLE_KEY=... flashy alembic upgrade head` exits 0, and `alembic current` in the same image prints the chain's head.
- In headless Chromium at 390 by 844 against the container's address, signed out: Home shows the example library's runs under the guest's banner, and `/library`, opened directly, lists "Common words" and "Capitals".
- On the dev servers, with `frontend/dist` moved away, `uv run pytest tests/api_tests/test_route_table.py -q` passes and Home at `localhost:5173` reads as it did.

**Debrief**

None.
