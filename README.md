# Flashy

Flashcards for knowledge that doesn't fit on two sides of a card.

Flashy is a web app for learning with flashcards, built around one disagreement with how flashcards usually work: a piece of knowledge is a bundle of information, not a question and an answer. A card in Flashy is a record of named fields, the learner decides at practice time which fields are shown and which are quizzed, and mastery is tracked for each field rather than for the card as a whole.

## Why

Take a vocabulary card. The word has a spelling, a pronunciation, a meaning, a gender, an example sentence. A conventional flashcard picks two of those, calls one the front and the other the back, and quizzes you the same way forever. Flashy starts from three ideas instead.

**Knowledge is a bundle of fields, and you choose at practice time what to be asked.** Every deck defines its own fields, and every card fills them. A saved _deck configuration_ assigns each field to the prompt side or the answer side, and a deck can have as many configurations as there are directions worth practicing. Anki's note types also hold multiple fields, and a note type can define several card templates, but which fields are the prompt and which the answer is fixed when the template is authored. It is not a choice the learner makes at practice time, and it never varies from one review to the next.

**The combination changes every time the card appears.** A configuration can mark fields as _Random draw_ instead of _Always shown_. Each time the card comes up, Flashy draws a fresh subset of those fields, so the same card is tested in new ways. Weaknesses that a fixed prompt-and-answer layout can never surface show up on their own.

**Mastery belongs to the field, not the card.** Every field of every card carries its own mastery, so you can see exactly what you are less familiar with instead of a single number for the whole card. The random draw consults those numbers: fields with low mastery, and fields you have never been asked, are drawn more often.

## How it works

A deck stands on its own, with nothing above it, and its name is unique among your decks. A deck defines its fields, and every card in the deck fills every field. A deck's first field is its _primary field_, the one that identifies a card in lists.

A _deck configuration_ is a saved layout for practicing that deck. Each field goes on the prompt side, the answer side, or is left out. On either side a field is either _Always shown_ or part of the _Random draw_, and for the random draw you choose the allowed sizes: "each card shows 1 or 2 of these".

A _practice_ takes one or more decks, each with a configuration, and generates a queue of cards. A card shows its prompt fields; one tap reveals every answer field at once, and you rate each answer field separately: Again, Hard, Good, or Easy. An Again on any answer field fails the card. A failed card comes back later in the same practice with a freshly drawn combination, the fields you failed guaranteed to be on it, and no earlier than three other cards from now.

When the practice completes, a breakdown lists every card ranked by how much its mastery moved, with a badge for how it went (first try, one retry, several retries, failed). Opening a card shows every attempt and every field's mastery and change.

## Design notes

The reasoning behind the parts that make the three ideas above possible.

**Fields are the unit of everything.** A field is a row with a stable id, and every other table references it by that id, never by name, so renaming a field is a metadata change that leaves history intact. A card's values are dense: one row per active field of the deck, with an empty string for a field the user left blank, so "empty" and "never written" are never confused. Deleting a field deletes everything it influenced: its values, its review history, the configurations and in-progress practices that name it, and the deck's mastery is recomputed from the reviews that remain, so a deleted field leaves no trace in what its neighbors score.

**The practice-time choice is a saved object, and a running practice can't be changed from under you.** Deck configurations are named, reusable templates. A practice copies each configuration's field assignments at the moment it starts, and every card it generates for the rest of its life, retries included, reads that frozen copy. Editing or deleting the configuration never touches a practice built from it; a practice in progress is deleted, after a warning, only when a deck or field it needs is deleted. A link back to the source configuration exists for attribution only; nothing reads it to generate cards, and a material edit to the configuration severs it.

**The random draw favors weak fields.** For each side of each card, Flashy picks one of the configuration's allowed sizes at random, then samples that many fields without replacement, weighted by how far the field is from ready. A field that has never been reviewed gets the maximum weight. The draw is weighted rather than "lowest mastery first" on purpose: a retry should not reliably repeat the exact combination that just failed. The code is [`app/services/practice_generation.py`](app/services/practice_generation.py).

**Mastery is a ledger, not a number.** Every rating is appended to a review log; a rating is never rewritten, and a row leaves only when the card or field it is about is deleted. Mastery itself is a second append-only ledger: one row per state change of a field on a card, ordered by the moment of review and stamped so that two appearances of one card never tie, the latest row being the current state. That ledger is a projection of the review log and can be rebuilt from it at any time, in whole or for one deck, through the very same code the live path uses, so changing the scoring rule is a rebuild, not a migration. The scoring rule lives in one strategy module and nowhere else, never in SQL. The current strategy is an exponential moving average toward the rating's score (Again 0, Hard 33, Good 67, Easy 100) from a prior of 0. Each field carries two masteries, one for being answered and one for being the prompt; when a field is shown as a prompt, its prompt-side mastery moves toward the combined result of the answers it prompted, with the step size growing with how many answers were asked. What the app shows is never that stored value but readiness, from 0 to 1, how likely you are to recall the field now: a side's stored value over Good's score, capped at 1, averaged over the sides that have been reviewed. A card's readiness averages every field of its deck, a field never reviewed counting 0, so a card that is perfect on one field of five does not read as ready, and a deck averages its cards, each card once.

**The loop is honest about failure.** Harshest wins: one Again fails the card, and the prompt fields it was shown with take the failing score as their target rather than an average that would hide it. Every answer field rated Again is forced back into the retry ahead of the random draw, since an explicit failure is a stronger signal than any mastery weight. A retry may not surface until at least three other pending cards have had their turn, or goes last when fewer remain, so a small deck cannot collapse into a two-card loop. The completion breakdown ranks cards by mastery delta and lists every field of each card, untouched ones at zero change, rather than only the ones the practice sampled. A field whose value you clear while a practice is using it drops out of the retry rather than being shown empty, and a card left with nothing to ask ends the practice as failed.

**Deletion leaves nothing behind.** Persistent things never depend on ephemeral ones: a deck, field, or card that is deleted takes every record about it, review history and past-practice snapshots included, and a practice in progress goes only when it can no longer function. One service plans that closure and executes it, and the confirmation shows the same plan as counts before anything is removed, so the warning and the deletion cannot disagree.

## Architecture

**Backend.** FastAPI with SQLModel on PostgreSQL, Alembic for migrations, and Clerk for authentication. Every API endpoint except the health check verifies the Clerk session token and scopes ownership inside the query, never in Python after the fetch. The code is three layers: routers parse and respond, services compose flows that span several operations, and a database-operations layer owns every SQL statement. Alembic is the only path by which a database's schema changes; the app never creates tables on startup. Every timestamp is a server-stamped UTC instant, and the user's timezone is a rendering input sent with every request.

**Frontend.** React 19 with TypeScript, Vite, Tailwind CSS 4, Radix primitives for dialogs and popovers, and TanStack Query for all server state. The API client is generated from the backend's OpenAPI schema, so a change to a response shape is a compile error on the frontend rather than a runtime surprise. A polled health check drives one banner for being offline, unable to reach the server, or hitting server trouble, and refetches what failed once the connection returns; every other error renders where it happened.

**Continuous integration.** GitHub Actions runs the backend tests against a real PostgreSQL, applies the full migration chain from an empty database, and runs the frontend lint, tests, and build on every pull request and every push to `main`.

The entity diagram is at [`docs/Flashy-ERD.drawio`](docs/Flashy-ERD.drawio).

## How this is built

Flashy is developed with [Claude Code](https://claude.com/claude-code). A human raises every product and architecture decision and has the final say on each; Claude works out the alternatives, records what was decided, and builds against it, and nothing is written or merged without the human's approval.

## Status

Flashy is not deployed yet; it runs locally. Decks, fields, cards, deck configurations, practices, rating and retries, and the completion breakdown are built and tested. The app reports when it is offline or cannot reach its server and recovers on its own when the connection returns. The home page, notifications, and search are placeholders, and so are the logo and color palette. Only text fields can be created in the interface today; image and audio field types exist in the schema and are waiting on their widgets. Deck copying is implemented and tested but not exposed, because sharing needs an authorization layer that decides who may copy what. Hosting and a deployment pipeline are planned as their own cycle.

## Running it locally

You need [uv](https://docs.astral.sh/uv/), Node.js (LTS), a PostgreSQL 16 server, and a [Clerk](https://clerk.com) application with a development instance.

1. Create two databases, one for the app and one for the test suite: `createdb flashy` and `createdb flashy_test`.
2. Create `.env` in the repository root:

   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/flashy
   TEST_DATABASE_URL=postgresql://user:password@localhost:5432/flashy_test
   PERMITTED_ORIGINS=["http://localhost:5173"]
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_FAPI_URL=https://your-instance.clerk.accounts.dev
   ```

   The publishable key and the Frontend API URL both come from the Clerk dashboard. `PERMITTED_ORIGINS` must contain the frontend's origin exactly; it is also checked against the session token's `azp` claim.

3. Create `frontend/.env` with the same key: `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...`
4. Backend: `uv sync`, then `uv run alembic upgrade head`, then `uv run fastapi dev`. The API is at http://localhost:8000 with interactive docs at `/docs`.
5. Frontend, in `frontend/`: `npm ci`, then `npm run dev`. The app is at http://localhost:5173 and proxies `/api` to the backend.

Tests: `uv run pytest` from the root (it builds and drops its schema in the test database on every test), and `npx vitest run` in `frontend/`.

## License

[MIT](LICENSE).
