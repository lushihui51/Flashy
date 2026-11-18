# Flashy

Flashcards for knowledge that doesn't fit on two sides of a card.

## Why

- **One card, many fields.** A word's spelling, meaning, gender and example all sit on one card.
- **A new question every time.** You choose which fields a card shows and asks, and fields drawn at random ask the same card a new way each time.
- **Mastery for every field.** You see exactly what you know, and the fields you know least come up most.

## How it works

1. Make a deck, name its fields, and fill it with cards.
2. Make a practice from your decks, and choose for each deck which fields are the prompt, which are the answer, and which are drawn at random.
3. Run the practice. Each card shows its prompt; you reveal the answers and rate how well you recalled each one. A missed card comes back later in the run, asked a new way.
4. When the run ends, see how far each card's mastery moved, then run the practice again, whole or only the cards you pick.

## How it is built

- **Stack.** FastAPI, SQLModel, PostgreSQL and Alembic on the backend; React, TypeScript, Vite, Tailwind CSS and TanStack Query on the frontend; Clerk for sign-in. The frontend's API types are generated from the backend's schema.
- **Three layers.** Routers handle requests, services compose flows, and `app/database_ops/` holds every database statement. Each layer calls only the one below, and every query is scoped to the requesting user.
- **Two ledgers.** Every rating is appended to a review log that is never rewritten. Mastery is a second ledger rebuilt from it by the same code that writes it live, so changing how mastery is scored is a rebuild, not a migration. All mastery arithmetic lives in `app/mastery/`.
- **One deletion closure.** One service plans and carries out every deletion of a deck, field or card, so a confirm's counts and what is deleted always agree.

## Running it locally

You need [uv](https://docs.astral.sh/uv/), Node.js (LTS), PostgreSQL 16 and a [Clerk](https://clerk.com) development instance.

1. Create the app's and the tests' databases: `createdb flashy` and `createdb flashy_test`.
2. Create `.env` in the root. The three Clerk values are on your development instance's API keys page in the Clerk dashboard.

   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/flashy
   TEST_DATABASE_URL=postgresql://user:password@localhost:5432/flashy_test
   PERMITTED_ORIGINS=["http://localhost:5173"]
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_FAPI_URL=https://your-instance.clerk.accounts.dev
   CLERK_SECRET_KEY=sk_test_...
   ```

3. Create `frontend/.env` with `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...`.
4. Backend: `uv sync`, `uv run alembic upgrade head`, `uv run fastapi dev`.
5. Frontend, in `frontend/`: `npm ci`, `npm run dev`, then open http://localhost:5173.

Visitors who are not logged in see an example library. To make one, log in, build the library, then run `uv run python -m app.scripts.example_user detach <Clerk user id>` with that account's id.

Tests: `uv run pytest` in the root, and `npx vitest run` in `frontend/`.

## How it is deployed

Each commit to `main` that passes CI deploys to Railway as one service, built from the `Dockerfile`, serving both the frontend and the API. The database is migrated before the new version goes live. Production's settings are the Railway service's variables, with a Clerk production instance of its own.

## License

[MIT](LICENSE).
