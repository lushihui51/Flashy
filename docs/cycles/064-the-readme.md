# 064 — The README

Waits for: 062, its `clerk_secret_key` in `Settings` in `app/config.py`.

## Goal

Outcome: README.md holds only what changes with a record.

Scope: The cycle covers a rewrite of README.md into Flashy's one-line description and three ideas, how a user goes from a deck to a practice, a run and what it did to mastery, the lasting choices of how Flashy is built, how to run it locally, how it is deployed, and its license. It leaves out every other file, and any section on what is or is not built.

Judgement: The engineer reads README.md from top to bottom and finds each of the six parts the Scope lists, in that order, each true of the app on the docket's branch; finds no screen's control named in how a user goes from a deck to what a run did to mastery, no tunable number, no section on what is or is not built, and no real key, production address, account id or email address; and finds every variable `Settings` requires named in how to run it locally, `CLERK_SECRET_KEY` among them.

## Records

- ADR 011: Append-only review_log as the mastery source of truth
- ADR 055: `database_ops` as the sole persistence surface
- ADR 116: Readiness as the only mastery figure leaving the mastery module, folded over a practice's cards
- ADR 118: One deletion closure for every deletion of a deck, field or card, a practice deleted by its cascades
- ADR 128: One service serving the frontend and the API
- ADR 137: Railway's Hobby plan for hosting, with no backups
- ADR 138: A deploy from `main`, migrated before going live
- ADR 139: A Clerk production instance on the owner's domain
- ADR 141: Account deletion committed once Clerk deletes the user

## Tasks

### T1 — README.md rewritten

**Status**

- [x]

**Goal**

README.md holds Flashy's one-line description and three ideas, how a user goes from a deck to what a run did to mastery, the lasting choices of how it is built, how to run it locally, how it is deployed and its license, and nothing else.

**Dependencies**

None.

**Files**

- `README.md`

**Details**

- README.md must hold, in this order and nothing else: the title `# Flashy` over the line "Flashcards for knowledge that doesn't fit on two sides of a card."; `## Why`, Flashy's three ideas, a card of many named fields, a new question every time through fields drawn at random, and mastery for every field; `## How it works`, how a user goes from a deck and its cards to a practice, its runs and what each run did to mastery, naming no screen's controls; `## How it is built`, the stack, the three backend layers, the review and mastery ledgers and the deletion closure; `## Running it locally`; `## How it is deployed`; and `## License`.
- README.md must hold no tunable value: no rating's score, no number of cards before a retry, no badge's name, no size or rate a setting fixes. A count fixed by a record, as the three ideas and the three layers, is not a tunable value.
- `## How it works` must call nothing built unbuilt or planned; it need not describe Home, the example library or the deletion of an account. It names no rating, since a rating's name is a screen's control, and writes every concept `docs/vocabulary.md` marks "never named" as a description, never a name: how a practice asks one of its decks, never "configuration", and what a run did to mastery, never "summary" or "breakdown".
- `## How it is built` must be true of the records in Records and of the code on the docket's branch; its stack is the one `pyproject.toml` and `frontend/package.json` name.
- `## Running it locally` must name every field `Settings` in `app/config.py` requires as its variable, `CLERK_SECRET_KEY` among them, with `TEST_DATABASE_URL` for the tests; say where the Clerk development instance's publishable key, Frontend API address and secret key are found; say how a database gets an example library a visitor sees, through `python -m app.scripts.example_user detach <Clerk user id>`; and name no page at `/docs`, which `FastAPI(docs_url=None, redoc_url=None, openapi_url=None)` in `app/main.py` turns off.
- `## How it is deployed` must be true of the records in Records: one service on Railway built from the `Dockerfile` when a commit reaches `main`, after CI, migrated before it goes live, with production's variables among the Railway service's variables and its own Clerk instance.
- Every variable's value in README.md must be a placeholder of the form the current README uses, as `pk_test_...` and `sk_test_...`, never a value from a `.env`; and README.md must name no production address, no Railway or Clerk account or instance id, and no email address.
- README.md must be written for a human reader, self-contained, pointing at no record, cycle file or `AGENTS.md`.

**Out of scope**

- What Flashy is to its user, as the page that says what Flashy is gives it: cycle 063.
- A section on what is or is not built, on how Flashy is developed, or on what is planned: never.

**Done when**

- `grep -n "^#" README.md` prints exactly `# Flashy`, `## Why`, `## How it works`, `## How it is built`, `## Running it locally`, `## How it is deployed` and `## License`, in that order, each with its line number.
- `uv run python -c "from app.config import Settings; t = open('README.md').read(); print([n.upper() for n, f in Settings.model_fields.items() if f.is_required() and n.upper() not in t])"` prints `[]`.
- ``grep -nE 'sk_(live|test)_[A-Za-z0-9]{6,}|pk_(live|test)_[A-Za-z0-9]{6,}|@[a-z0-9-]+\.[a-z]|up\.railway\.app|`/docs`|docs/adrs|AGENTS\.md' README.md`` prints nothing.

**Debrief**

- `grep -n "^#" README.md` printed `1:# Flashy`, `5:## Why`, `11:## How it works`, `18:## How it is built`, `25:## Running it locally`, `49:## How it is deployed`, `53:## License`, and nothing else.
- The `Settings` check printed `[]`.
- The forbidden-text grep printed nothing and exited 1.
- No departure from guidance: every sentence of Details is a constraint, and each is kept.
- `## How it works` is four numbered steps naming no rating, no board area and no button, as "Run the practice" rather than "Start run", and holds no number.
- `## Running it locally` leaves out the local sign-in bypass (`DEV_AUTH_USER_ID`, `ENV`, `VITE_DEV_AUTH`), since Details asks only for the required variables; a reader runs the app through the Clerk development instance.
- Read in README.md: "your development instance's API keys page in the Clerk dashboard", where it says the three Clerk values are, is from Clerk's dashboard as I know it and not checked against it from here.
