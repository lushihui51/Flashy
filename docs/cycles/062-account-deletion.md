# 062 — Account deletion

Waits for: 061, which shares `docs/vocabulary.md` with it.

Canvas: https://claude.ai/artifact/L8rYgdCnGHaKFyXa1Tivis

## Goal

Outcome: A user deletes their own account and everything in it from the account sheet.

Scope: The cycle covers `DELETE /api/account`, which stages the deletion of every row of the user through the deletion closure, deletes the user at Clerk and commits only once Clerk confirms; the backend's Clerk secret key in `Settings`; "Delete account" in the account sheet with its confirm, which logs the user out once the deletion succeeds and shows its failure inside itself; the docstring of `attach`; and the vocabulary's rows for deleting an account and for an action Flashy had trouble with. It takes as done by the owner, before it is built: the secret key of Clerk's development instance set as `CLERK_SECRET_KEY` in the repository root's `.env`; and, before the cycle's branch reaches `main`, the production instance's secret key set as `CLERK_SECRET_KEY` among the Railway service's variables. It leaves out the privacy page, which cycle 063 builds, and README.md, which cycle 064 rewrites.

Judgement: On the dev servers with the local bypass off, the engineer logs in to Clerk's development instance with an account made for the test, makes a deck, a practice and a run and rates a card, opens the account sheet, finds "Delete account" below "Log out" as drawing 10 draws it, presses "Delete account", reads "Delete your account?" and what it takes, presses "Delete", and lands on Home in the example library, logged out; then finds no `app_user` row for that Clerk id in the dev database and no such user in the development instance's dashboard. With `CLERK_SECRET_KEY` set to a wrong key, the same press leaves the confirm open with "Flashy is having trouble right now. Try again in a moment." and the account's rows in place.

## Records

- PDR 061: An account deleted by its user, with everything
- ADR 141: Account deletion committed once Clerk deletes the user

## Tasks

### T1 — Account deletion in the API

**Status**

- [ ]

**Goal**

`DELETE /api/account` deletes every row of the requesting user and the user at Clerk in one transaction, committed only once Clerk confirms, and answers 502 with the code `clerk_unavailable`, deleting nothing, when Clerk does not.

**Dependencies**

None.

**Files**

- `app/config.py`
- `app/clerk_users.py` (new)
- `app/database_ops/app_user.py`
- `app/database_ops/deck.py`
- `app/services/account.py` (new)
- `app/routers/api/account.py` (new)
- `app/main.py`
- `app/scripts/example_user.py`
- `tests/api_tests/test_account.py` (new)
- `tests/api_tests/test_config.py`
- `.github/workflows/ci.yml`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `docs/vocabulary.md`

**Details**

- `Settings` in `app/config.py` must gain `clerk_secret_key: str`, required, as ADR 141 gives it. The `env:` block of the backend job in `.github/workflows/ci.yml` must gain `CLERK_SECRET_KEY: sk_test_ci_placeholder`, and `test_settings_start_without_a_test_database_url` in `tests/api_tests/test_config.py` must set `CLERK_SECRET_KEY` and say "five variables" where it says "four".
- `app/clerk_users.py` must hold the one call to Clerk, through `httpx`, so a test replaces that one function:

```python
CLERK_API_URL = "https://api.clerk.com/v1"
CLERK_TIMEOUT_SECONDS = 10.0


class ClerkUnavailable(Exception):
    """Clerk answered a request with anything but success, or did not answer in time."""


def delete_clerk_user(clerk_user_id: str) -> None:
    """Deletes the user `clerk_user_id` at Clerk, by `DELETE {CLERK_API_URL}/users/{clerk_user_id}`
    with `settings.clerk_secret_key` as a Bearer token and a timeout of CLERK_TIMEOUT_SECONDS.
    Raises ClerkUnavailable on any answer but a 2xx, its message naming the status, and on
    any `httpx.HTTPError`, its message naming the error."""
```

- `app/database_ops/deck.py` and `app/database_ops/app_user.py` must gain these, and the module docstring of `app/database_ops/app_user.py` must name deleting a row among the table's operations:

```python
def db_read_deck_ids(db: Session, user_id: uuid.UUID) -> list[uuid.UUID]:
    """The ids of every deck of the user."""


def db_stage_delete_app_user(db: Session, user_id: uuid.UUID) -> None:
    """Deletes the user's row by id, whose cascades take the user's practices with their
    configurations and runs. No commit."""
```

- `app/services/account.py` must own the transaction (ADR 055) and stage the deletion as ADR 141 decides: every deck of the user through `compute_deletion_impact` then `apply_deletion` in `app/services/deletion.py` (ADR 118), then `db_stage_delete_app_user`, then `db.flush()`, then `delete_clerk_user`, then `db.commit()`. On `ClerkUnavailable` it must roll back and raise it again, so nothing is deleted on either side. It must import `delete_clerk_user` by name, so a test replaces `app.services.account.delete_clerk_user`. No migration is written, and `review_log.user_id` keeps no `ON DELETE` rule (ADR 141).

```python
def delete_account(
    db: Session, strategy: MasteryStrategy, user_id: uuid.UUID, clerk_user_id: str
) -> None:
    """Deletes every row of the user and the user at Clerk, committing only once Clerk
    confirms. Raises ClerkUnavailable, having rolled back, when Clerk does not."""
```

- `app/routers/api/account.py` must hold `router = APIRouter(prefix="/account", tags=["Account"])` and `delete_account`, registered as `@router.delete("", status_code=204)` behind `CurrentUserDep`, calling the service with `get_mastery_strategy()` and the user's `id` and `clerk_user_id`, after an `assert` that `clerk_user_id` is not None, since `CurrentUserDep` answers only as a user it found by a Clerk id; it imports the service under another name, as `app/routers/api/deck.py` does for `delete_deck`. On `ClerkUnavailable` it must raise `HTTPException(status_code=502, detail={"code": "clerk_unavailable", "message": <a sentence for a developer>})` (ADR 070). `app/main.py` must include the router under `/api`.
- `tests/api_tests/test_account.py` must cover, with `app.services.account.delete_clerk_user` replaced by a stand-in: a deletion answering 204 that leaves, for the user, no row in `app_user`, `deck`, `field_def`, `card`, `card_field_value`, `practice`, `practice_configuration`, `run`, `run_card`, `run_configuration`, `run_counted_card`, `review_log` or `mastery_log`, from a user with a deck, a practice, a run and a rated card, while another user's deck and its cards stay, and the stand-in is called once with the user's Clerk id; and a stand-in raising `ClerkUnavailable` answering 502 with `detail["code"] == "clerk_unavailable"` and every row of the user in place. It must cover `delete_clerk_user` itself with `httpx.delete` replaced: the address and the Bearer header it sends on success, and `ClerkUnavailable` on a 404, a 500, an `httpx.TimeoutException` and an `httpx.ConnectError`.
- The docstring of `attach` in `app/scripts/example_user.py` must say that "Delete account" on the attached account deletes the example library. No guard for the example user is added.
- `frontend/src/api/openapi.json` and `frontend/src/api/types.ts` must be regenerated with `npm run gen:api` (ADR 006).
- `docs/vocabulary.md` must gain, directly below the row "Signing out" and above "The signed-in user", the row: Area "App"; Concept "Deleting an account"; User reads `"Delete account"`; Where `Account sheet, below "Log out"`; Code `` `DELETE /api/account`; `delete_account` ``. The Failure row "An action Flashy had trouble with" must read, in its Code column, `` `ApiError`; `unwrap`; `failureSentence`; `SERVER_TROUBLE_MESSAGE`; `clerk_unavailable` ``.

**Out of scope**

- "Delete account" and its confirm in the account sheet, and `deleteAccount` in the frontend: T2.
- A sentence of its own for `clerk_unavailable` in `failureSentence`: never.
- A guard or a column marking the example user: never.
- A webhook from Clerk or a call to Clerk from the browser: never, as ADR 141 rejects both.
- The README's list of variables: cycle 064.

**Done when**

- `uv run pytest tests/api_tests/test_account.py tests/api_tests/test_route_table.py tests/api_tests/test_auth_scoping.py tests/api_tests/test_config.py tests/api_tests/test_layering_guard.py -q` passes with no failure.
- `uv run python -c "from app.clerk_users import delete_clerk_user; delete_clerk_user('user_0000000000000000000000000')"`, run with the owner's development key in `.env`, ends in `ClerkUnavailable` whose message names the status Clerk answered, and that status is neither 401 nor 403; the Debrief gives the status.
- `grep -c "/api/account" frontend/src/api/types.ts` prints a number above `0`.

**Debrief**

None.

### T2 — Delete account in the account sheet

**Status**

- [ ]

**Goal**

"Delete account", below "Log out" in the account sheet, deletes the user's account after its confirm and leaves them where logging out leaves them, and a failure stays inside the confirm.

**Dependencies**

- T1: `DELETE /api/account`, its type in `frontend/src/api/types.ts`, and its 502 carrying `clerk_unavailable`.

**Files**

- `frontend/src/api/account.ts` (new)
- `frontend/src/components/shell/AccountSheet.tsx`
- `frontend/src/components/shell/AccountSheet.test.tsx`
- `docs/vocabulary.md`

**Details**

- Drawing 10 is a constraint: "Delete account" is a block below "Log out", drawn as "Log out" is.
- `frontend/src/api/account.ts`:

```ts
/** Deletes the signed-in user's account, at Clerk and in Flashy, with everything in it. */
export const deleteAccount = async (): Promise<void> =>
  unwrapVoid(await client.DELETE('/api/account'));
```

- "Delete account" must open a `ConfirmDialog` titled "Delete your account?", described "Your decks, cards, practices and runs will be gone, with your mastery. This can't be undone.", with "Cancel" and "Delete".
- "Delete" must run one TanStack Query mutation of `deleteAccount`. On success it must await `clerk.signOut()` inside the mutation's `onSuccess`, so the mutation stays pending until the log-out ends, and do nothing else, `onClose` included, since the sheet and the confirm close with the reload that follows the log-out: no navigation, no `loadHomeAfresh()`, no cache write, since ADR 132's one function in `AppShell` loads Home afresh once `useViewer()` turns to `guest`. A rejected `clerk.signOut()` is not caught, as `handleLogOut` does not catch it, so the confirm then shows the sentence `failureSentence` gives that rejection. On failure the confirm must stay open with `failureSentence`'s sentence inside it, as a `<p role="alert">` passed as the confirm's children, drawn as the alerts in `frontend/src/pages/PracticeDetailsPage.tsx` are. A press of "Delete" while the mutation is pending sends nothing more. The guidance for "Cancel" and Escape is that they leave the confirm open while the mutation is pending, and otherwise close it and call the mutation's `reset()`, so it opens again with no sentence. The guidance for `failureSentence`'s `notFound` argument is `SERVER_TROUBLE_MESSAGE`, since the route never answers 404.
- `AccountSheet.test.tsx` must cover: the sheet's two actions, "Log out" then "Delete account"; the confirm's title, sentence and buttons; "Delete" calling `deleteAccount` once and then `signOut`, with the address unchanged; and a rejected `deleteAccount` with a 502 leaving the confirm open with "Flashy is having trouble right now. Try again in a moment." and `signOut` not called.
- `docs/vocabulary.md` must gain, below the row "Deleting an account", two App rows: Concept "Confirming an account's deletion"; User reads `"Delete your account?"`; Where `Account sheet's delete confirm`; Code `—`. And Concept "What deleting an account takes"; User reads `"Your decks, cards, practices and runs will be gone, with your mastery. This can't be undone."`; Where `Account sheet's delete confirm`; Code `—`.

**Out of scope**

- The privacy page that names "Delete account": cycle 063.
- Typing a word to confirm: never.
- The sheet's padding, gap between rows and top corners as drawing 10 draws them, which differ from `BottomSheet` in `frontend/src/components/ui/BottomSheet.tsx`: never here, as drawing 10 shows only where "Delete account" stands.
- A guard that dims the screen for a guest: never, as a guest never sees the account sheet.

**Done when**

- The cases of `frontend/src/components/shell/AccountSheet.test.tsx` named for the two actions, the confirm's words, the success path and the 502 path pass.
- `grep -c "Delete your account?" docs/vocabulary.md frontend/src/components/shell/AccountSheet.tsx` prints `1` for each file.

**Debrief**

None.
