# 026 — One vocabulary file, and every screen speaking it

## Goal

Outcome: `docs/vocabulary.md` holds every word and sentence the app shows beside the code's names, and every screen shows only what it gives, the sentences a failed save answers with included, each chosen by its refusal code.

Scope: The file in its two-table shape; the words for starting, making and saving a thing on every button, heading, picker row and shortcut; each list's toolbar label and count, with the lines under the subject and deck headings gone; New practice's address order; the browser tab's title on every page; the two code names and the one misspelling still on screens; refusal codes on every refusal a user can reach, the health endpoint's message in developer terms, and one frontend function that turns a failed request into the sentence the user reads, with every call site rendering through it; and the tests that assert the old words. Not covered: the structure of the breadcrumb row and the mechanics of the icon picker, whose words the file only lists; the ESLint rule and the guard tests; any refusal no screen reaches; and the mapping of a database outage to 503 on endpoints other than health, which stays deferred.

Judgement: On a live server, walk every screen and read each heading, button, tab, label, empty state, picker row and browser tab against the file; make a subject with a taken name, save a configuration with a taken name, and rate a card from a second tab after the first has moved on, and read the three sentences; then read `docs/vocabulary.md` for its preamble and two tables, and grep the frontend for a rendered `.message` and find none.

## Records

- PDR 001: One vocabulary for every screen
- PDR 002: Failures met in place, with one banner for the connection
- PDR 003: Header actions for the thing and one add button inside each list
- PDR 006: A deck's first field as the name of its cards
- PDR 007: A card's mastery as one number over every field of its deck
- PDR 008: A tap-to-move board for a configuration's fields
- PDR 009: A card practiced as a prompt zone and a list of rated answers
- PDR 010: One summary of what a practice did to mastery
- ADR 069: One vocabulary file for the user's words and the code's names
- ADR 070: A frontend map from refusal code to sentence
- ADR 072: The health endpoint as the one unauthenticated route
- ADR 073: Active and completed as a run's only statuses
- ADR 076: A run's own frozen snapshots as the source of its rerun

## Tasks

### T1 — The vocabulary file

**Status**

- [x]

**Goal**

`docs/vocabulary.md` exists in its two-table shape, holding every word and sentence the app shows, with each sentence's code, and every concept's code names.

**Dependencies**

None.

**Files**

- `docs/vocabulary.md` (new)
- `AGENTS.md`

**Details**

The file is a title line, `# Vocabulary`, a three-sentence preamble, then two flat tables and nothing else: no section heading, no bullet, no record number, and no mention of any docket (ADR 069). An Area column carries the grouping. The preamble reads:

> This file gives the word for every concept Flashy shows and every act on it, the sentence for every situation, and the code's name for each, side by side. A word a user reads changes here first, then on every screen; a code name changes in the code and is recorded here, and neither renames the other. Only words and sentences this file gives appear on a screen, and a sentence a refusal carries is chosen by the code beside it.

The Words table has the columns Area, Concept, User reads, Where, Code, in that order: one row per concept or act, user-facing text in double quotes, code names in backticks, several values in one cell joined by "; ", an empty cell reading "—", rows ordered by area and widest concept first, a thing's address and the breadcrumb row as rows. The Sentences table has the columns Area, Situation, Code, User reads: one row per sentence, Code the error code that carries it or "—" when the frontend decides alone, both joined by "; " when a sentence is reached both ways, placeholders as `<thing>`. The Area values, in order, are App, Places, Library, Subject, Deck, Field, Card, Configuration, Practice, Run, Summary, Failure. The Concept column is written in the user-facing vocabulary and uses the verbs as the table assigns them: never "create" for a button that reads "Add", never "add" for one that reads "New".

The Code column names the code's side of each concept without tying it to the word: the table and model from `app/models/`, the route from `app/routers/api/`, the frontend identifier where it differs, as `practice_run`, `PracticeRunSummary`, `/api/practice_runs`, `session` and `practiceSessionId` for one practice. Read those directories and `frontend/src/api/*.ts` for the names; the slot names in `frontend/src/lib/deckConfigurationBoard.ts`, the statuses in `app/models/practice_run.py` and `app/models/practice_card.py`, and the buckets in `app/services/practice_run.py` are code names too.

The words are these. The app is "Flashy", and the browser tab reads the page's own name, then "Flashy", as "Verbs · Flashy". The main places are "Home", "Your library", "Practice" and "Notifications"; a place not built yet says "Coming soon." The menu is spoken as "Main menu" and its button as "Open menu" or "Close menu". The top bar's shortcut for starting a thing is spoken as "New" and offers the rows "New subject", "New deck", "New card" and "New practice", with "Create a deck first" under "New card" when there is no deck. A button that puts a new thing into the collection in view reads "Add subject", "Add deck", "Add card", "Add configuration" or "Add practice", the last on the Practice page's header. The page where a thing is made is headed "New subject", "New deck", "New card", "New configuration" or "New practice", and the page where one is changed "Edit subject", "Edit deck", "Edit card" or "Edit configuration". A picker's last row reads "New subject…" or "New deck…", and the button in New practice's configuration list that leaves to make a configuration reads "New configuration…". A form making a new thing ends with "Create" and a form changing one with "Save"; "Saved ✓" is the feedback after a save; "Cancel" backs out; "Done" leaves when nothing is unsaved; "Undo" reverses a staged change; "Continue" accepts a warning. Signing in and out are "Log in", "Log out" and "Account"; the search box says "Search". A lost connection says "You're offline. Flashy will reconnect automatically.", "Can't reach Flashy. Check your connection; retrying automatically." or "Flashy is having trouble right now. Retrying automatically." A request that fails says "Couldn't reach Flashy. Check your connection and try again.", "Flashy is having trouble right now. Try again in a moment." or "Flashy is temporarily unavailable.", and for any other reason "Something went wrong." A thing that is gone says "<Thing> not found."; one that will not load says "Could not load this <thing>." or "Could not load <things>." The user's whole collection is "Your library", the library. A "subject" has a description and an icon and is counted in decks and cards; the tab is "Subjects" and the filter "All subjects". A "deck" has a "Deck name" and is counted in cards and fields; the tab is "Decks" and the filter "All decks". A list's toolbar label counts the list: "N subjects" and "N decks" on the library's tabs, "N decks · N cards" on a subject's page, "N cards · N fields" on a deck's Cards tab, "N configurations" on its Configurations tab, and the bare word, "Subjects", "Decks", "Cards" or "Configurations", while the list loads. A "card" is listed under "Cards"; an empty deck says "No cards in this deck yet."; a blank value reads "empty"; a card whose first field is blank is "Untitled card". A "field" is listed under "Fields" and added with "Add field"; its inputs are "Field name" and "Field type", of which only "Text" exists; it is moved with "Move up" and "Move down", spoken as "Reorder …", and taken away with "Remove …"; a deck short of fields says "A deck needs at least two fields." The field that identifies a card is "Primary", explained as "The first field identifies this card in lists and summaries." A new deck starts with the fields "Term" and "Definition". A subject's picture is its "Icon"; the Icon control is spoken as "Icon: " then the picture's name, the sheet of pictures as "Icon", and each picture by its name: "Atom", "Open book", "Brain", "Calculator", "Camera", "Code", "Coins", "DNA", "Dumbbell", "Flask", "Gavel", "Globe", "Heart", "Headset", "Landmark", "Languages", "Leaf", "Microscope", "Music", "Palette", "Pen", "Rocket", "Scale", "Theater", "Trophy", "Utensils", spoken only and never shown as text. A name already taken says "A <thing> with this name already exists." for a subject, deck, field or configuration alike. A name still missing says "Name is required." on the subject form and in the deck editor, "Give this practice a name to create it." on New practice, "Give this configuration a name to create it." on New configuration and "Give this configuration a name to save it." on Edit configuration. A duplicate field name says "Duplicate name". Leaving unsaved work asks "Discard this deck?", "Discard changes?" or "Discard this card?", each explained as "You have unsaved changes. Leaving now will discard them.", with the button "Discard". A deletion's confirm says "This also deletes N decks, N cards, N fields, N deck configurations and N practices. This can't be undone.", each count present only when it is above zero; a save that removes fields asks "Save changes?" and says "This removes N fields from N cards, deletes N cards, deletes N deck configurations and deletes N active practices. This can't be undone.", with the button "Save"; deleting a card alone says "This can't be undone." Switching a card's deck mid-form asks "Change deck?", explained as "Switching decks will clear the card you were filling in.", or "Create a new deck?", explained as "This will clear the card you were filling in." One run of practice is a "practice", and the verb is "practice", "practiced"; the list of practices is "Practice"; a practice is created on "New practice", where its name is pre-filled with the moment the page opened, such as "Aug 24, 2026, 9:00 AM", the chosen configurations are listed under "Selected", and groups and selected rows read "Subject · Deck". A practice's own page carries no label: its name heads it, its date and time beneath. A practice's state is spoken as "Practice status", with the tabs "All", "Active" and "Completed"; a practice that can still be continued is "active", badge and tab "Active"; one that has finished is "completed", badge and tab "Completed". A deck's prompt/answer layout is a "deck configuration", a "configuration" in deck context; the tab is "Configurations"; a gone one says "Deck configuration not found."; deleting one says "Practices that already used it are unaffected."; a configuration's row describes it as "N prompt fields · N answer fields · random draw"; its suggested name is its prompt fields then its answer fields, as "Word, Example +1 → Meaning". The copy a practice takes at start is never named; its configuration's name appears as "Deck · Configuration" on a practice's row and "Subject · Deck · Configuration" on its page. The row above a page's heading, naming the places the page belongs to, widest first, is spoken as "Breadcrumb" and reads "Your library" on a subject's page, "Your library › <Subject>" on a deck's page, "Practice" on a practice's own page and "Practice › <Practice>" on the run page. Choosing configurations says "Select at least one configuration to practice.", "A selected configuration no longer exists.", "This configuration no longer produces any prompts — edit it.", "Choose one configuration per deck." and "This practice would have no cards. Either the selected decks have no cards, or every card is blank in every field its configuration shows on one side." A re-run that nothing survives says "This practice can't be re-run. A field it practiced has since been removed from each of its decks." Narrowing a list uses "All subjects", "All decks" and "Clear filters", and an empty result says "No <things> match these filters." or "No <things> yet." The two halves of a card are the "Prompt side" and "Answer side" on the board, "Prompt" and "Answer" as the run page's zones, and a "prompt field" or "answer field" in counts. Fields on every card are "Always shown", "Prompt · always shown" in the move sheet; fields drawn at random are "Random draw", "Prompt · random draw" in the move sheet, with the legend "How many random prompt fields each card shows"; the allowed draw sizes read "Each card shows [1] [2] … of these"; a field left out is "Not used"; an empty "Not used" area says "Every field is assigned."; any other empty area says "None yet."; moving a field opens 'Move "…" to…'. The board's rules say "The prompt side needs at least one field — always shown or random draw.", "Check how many random prompt fields each card shows.", "Choose a deck first." and "Fields belong to their own deck, so switching clears everything assigned here." A field deleted after a practice used it is a "Removed field". An answer not yet shown is "Hidden", revealed with "Show answer"; the practice moves on with "Next card" and ends with "Done". An answer is rated with "Rate", then "Again", "Hard", "Good" or "Easy"; a missing rating is "Unrated". A card rated Again on a field at its last attempt is "failed", badge "Failed"; a card rated above Again on every field is "passed", "Passed"; one go at a card is an "attempt", headed "Attempt N of M · Passed"; a card that comes back after Again carries "Retry", counts as "retrying", and its outcome badges are "First try", "One retry" and "2+ retries". The practice's progress is a wordless bar, spoken as "N passed, N failed, N retrying, N unseen", and "Its progress will be gone." when deleting. The summary at the end is never named: "Practice complete" heads it on the run page, it says "N cards practiced", and it sorts by "Gains first", "Drops first" or "Mastery". How well a card or field is known is its "Mastery", a whole number, its change "+N", "−N" or "±0", and "—" when never reviewed. Running a practice again is "Re-run", explained as "A new practice with the same decks is created. This practice and its reviews stay on record." Deleting a practice asks "Delete this practice?", explained as "Its progress will be gone. The decks it practiced are not affected." A refused rating says "This card has already been rated." or "This is not the current card."

The Sentences table's Code column carries these codes: `subject_name_taken`, `deck_name_taken`, `field_name_taken` and `configuration_name_taken` for "A <thing> with this name already exists."; `too_few_fields` for "A deck needs at least two fields."; `card_already_rated` and `not_current_card` for the two refused ratings; `no_cards`, `config_not_found`, `stale_config` and `duplicate_deck` for the four configuration-choosing sentences they carry, "A selected configuration no longer exists." also "—" since the page says it alone; `nothing_to_rerun` for the re-run sentence; `database_unavailable` for "Flashy is temporarily unavailable."; "—" for "Couldn't reach Flashy. Check your connection and try again." when no response came, for "Flashy is having trouble right now. Try again in a moment." on a 5xx, for "<Thing> not found." on a 404, for "Something went wrong." for any other failure, and for every banner, confirm and form sentence. `run_active` has no sentence and no row.

**Out of scope**

- Any change to a screen: T4 to T7.
- A line in AGENTS.md pointing at the file: never in a cycle.
- Renaming anything in the code to match a word, or a word to match the code: never.
- A lint rule, guard test or allowlist over the file: never.

**Done when**

- `head -1 docs/vocabulary.md` prints `# Vocabulary`; `grep -c '^#' docs/vocabulary.md` prints `1`; `grep -c '^- ' docs/vocabulary.md` prints `0`; `grep -c 'ADR \|PDR \|docket' docs/vocabulary.md` prints `0`.
- `grep -n '^| Area |' docs/vocabulary.md` prints exactly two lines, the first `| Area | Concept | User reads | Where | Code |` and the second `| Area | Situation | Code | User reads |`.
- Each of these greps prints exactly one line: `grep -n '"Add practice"' docs/vocabulary.md`; `grep -n '"New configuration…"' docs/vocabulary.md`; `grep -n '"Breadcrumb"' docs/vocabulary.md`; `grep -n '"Open book"' docs/vocabulary.md`; `grep -n '"N configurations"' docs/vocabulary.md`; `grep -n 'to create it."' docs/vocabulary.md | grep -c configuration` prints `1`; `grep -n "can't be re-run" docs/vocabulary.md`.
- Each of the thirteen codes above, grepped in backticks, prints at least one line from the Sentences table, and `grep -c 'run_active' docs/vocabulary.md` prints `0`.
- `grep -c '^| ' docs/vocabulary.md` prints a number between 150 and 220, the two header rows and two separator rows included.

**Debrief**

Evidence, in the order of Done when:

- `head -1` prints `# Vocabulary`. `grep -c '^#'` prints `1`, `grep -c '^- '` prints `0`, and `grep -c 'ADR \|PDR \|docket'` prints `0`.
- `grep -n '^| Area |'` prints `5:| Area | Concept | User reads | Where | Code |` and `131:| Area | Situation | Code | User reads |`.
- Each of `"Add practice"`, `"New configuration…"`, `"Breadcrumb"`, `"Open book"`, `"N configurations"` and `can't be re-run` matches exactly one line. `grep -n 'to create it."' | grep -c configuration` prints `1`.
- Each of the thirteen codes in backticks matches exactly one line after line 131, the Sentences table's header. `grep -c 'run_active'` prints `0`.
- `grep -c '^| '` prints `191`: the Words table has 123 rows of 5 cells, the Sentences table 64 rows of 4 cells, plus two header and two separator rows. `grep -c practis` prints `0`.

Departures:

- Name taken: the Sentences table has four rows, one sentence per code, from "A subject with this name already exists." to "A configuration with this name already exists.", in place of one "A <thing> with this name already exists." row carrying four codes. Each code then sits beside the literal sentence it carries, so T3's `grep -F` of each literal in `failureSentence.ts` finds a line.
- Not found: "<Thing> not found." stays one placeholder row under Failure. Details names "Deck configuration not found." among the configuration's sentences, so that one also has its own row under Configuration.
- Words and sentences outside Details' list: Details does not name every word a screen shows today. For each word the screens show that the cycle does not change, the file has a row in that word's area:
  - App: "Flashy home"; "Account menu for <name>"; "Showing N of N · type to narrow"; "Name"; "Delete <name>"; "Edit <name>".
  - Library: "Library", spoken.
  - Subject: "Description"; "Subject" as the picker's label; "Delete subject" and "Delete subject?".
  - Deck: "Deck" as the picker's label; "Deck contents"; "Delete deck" and "Delete deck?".
  - Field: "Unsupported field type".
  - Card: "Cards in <deck>"; "Delete card" and "Delete card?".
  - Configuration: "Loading fields…"; "Delete this configuration?"; the answer-side twins of two of the board's rules, "The answer side needs at least one field — always shown or random draw." and "Check how many random answer fields each card shows.".
  - Practice: "Start practice"; "Re-run this practice?"; "Could not load your selected configurations.".
  - Summary: "Sort".
- Two Failure rows in the Words table, "The connection's state" and "A failed request", read "—" under User reads. Their sentences are rows of the Sentences table; the Words rows hold the code names: `ConnectionStatus` and its four values, `ApiError`, `ApiDetailError`, `unwrap` and `isNotFound`.
- The Words table holds the words this cycle puts on screens, not today's: "Add subject", the "New" shortcut, "Practice status", "practiced", "Subject · Deck" and the rest. Until T4 to T7 land, the screens differ from the file where those tasks change them.

- AGENTS.md: on the engineer's explicit order, which overrides this task's Out of scope line "A line in AGENTS.md pointing at the file: never in a cycle" for this one act, AGENTS.md is added to Files and two Hard rules follow the vocabulary line. "Name a concept in code by the name docs/vocabulary.md's Code column gives it, and change a code name there first, then in every file." cites ADR 069. "Write no sentence a user reads in the backend; give every refusal a screen reaches a code, and choose its sentence from docs/vocabulary.md by that code, never by the error's message." cites ADR 070. The Out of scope line stays as written. AGENTS.md now holds 44 bullets, and `uv run pytest tests/api_tests/test_record_citation_guard.py -q` printed `2 passed in 0.03s` after the edit. The preamble's "a code name changes in the code and is recorded here" stays as Details gives it, although the first new line puts the file first.

- Preamble: on the engineer's explicit order, which overrides the Details line giving a three-sentence preamble, the preamble keeps only its first sentence, "This file gives the word for every concept Flashy shows and every act on it, the sentence for every situation, and the code's name for each, side by side." The two dropped sentences' rules live in AGENTS.md. The Details line stays as written. The Done-when checks were rerun after the edit and print what is listed above.

To judge this task, read `docs/vocabulary.md` and the two new lines in AGENTS.md. No code changed.

### T2 — Refusal codes on the backend

**Status**

- [x]

**Goal**

Every refusal a user can reach answers a `{code, message}` detail with the message in the code's terms, the health endpoint's 503 included.

**Dependencies**

None.

**Files**

- `app/refusals.py` (new)
- `app/database_ops/subject.py`
- `app/database_ops/field_def.py`
- `app/database_ops/deck_practice_config.py`
- `app/services/deck_create.py`
- `app/services/deck_batch_edit.py`
- `app/services/field_def_create.py`
- `app/services/practice_run.py`
- `app/routers/api/subject.py`
- `app/routers/api/deck.py`
- `app/routers/api/field_def.py`
- `app/routers/api/deck_practice_config.py`
- `app/routers/api/practice_run.py`
- `app/routers/api/health.py`
- `tests/api_tests/test_subjects.py`
- `tests/api_tests/test_decks.py`
- `tests/api_tests/test_deck_batch_edit.py`
- `tests/api_tests/test_field_defs.py`
- `tests/api_tests/test_deck_practice_config.py`
- `tests/api_tests/test_practice_run.py`
- `tests/api_tests/test_health.py`
- `frontend/src/api/types.ts` (generated)
- `frontend/src/api/openapi.json` (generated)

**Details**

The backend writes no sentence the user reads: every refusal this task touches carries a detail with a code that names the refusal and a message in the code's own terms, for a developer; the frontend chooses the sentence by the code (ADR 070). A refusal no screen can reach may stay a plain string. HTTP statuses stay as they are today; only the detail's shape changes.

The one exception type, importable from every layer since it lives beside `app/database.py` and imports nothing from sqlalchemy or sqlmodel:

```python
# app/refusals.py
class Refusal(ValueError):
    """A refusal the API answers with a `{code, message}` detail. `code` names the
    refusal for the frontend, which chooses the sentence the user reads from it;
    `message` describes the refusal in the code's own terms, for a developer."""

    code: str
    message: str

    def __init__(self, code: str, message: str) -> None: ...

    @property
    def detail(self) -> dict[str, str]:
        """`{"code": code, "message": message}`, the HTTPException detail."""
```

It subclasses `ValueError` so every `except ValueError` that catches these refusals today keeps catching them. Each router's handler answers `detail=e.detail` for a `Refusal` and `detail=str(e)` for any other `ValueError`, at today's status.

The codes and their sites:

- `subject_name_taken`: the two `IntegrityError` branches in `app/database_ops/subject.py`.
- `deck_name_taken`: the `IntegrityError` branch of `create_deck` in `app/services/deck_create.py`, and in `apply_deck_batch_edit` in `app/services/deck_batch_edit.py` when the `IntegrityError`'s `orig.diag.constraint_name` is `uq_deck_subject_id`.
- `field_name_taken`: `app/services/field_def_create.py`, the rename branch in `app/database_ops/field_def.py`, and the batch edit when the constraint is `uq_field_def_deck_id_name_active`; any other constraint keeps today's `DeckBatchEditValidationError`.
- `configuration_name_taken`: the two `IntegrityError` branches in `app/database_ops/deck_practice_config.py`.
- `too_few_fields`: the "at least two fields" checks in `deck_create.py` and `deck_batch_edit.py`, and the 422 raised directly in `delete_field_def` in `app/routers/api/field_def.py`, which answers `Refusal("too_few_fields", …).detail`.
- `card_already_rated` and `not_current_card`: the two `ValueError`s in `submit_rating` in `app/services/practice_run.py`; the third, on ratings not covering the answer fields, stays a string, since the run page always sends them all.

`app/routers/api/deck.py` catches `Refusal` beside `DeckCreateValidationError` and `DeckBatchEditValidationError` and answers 422 with `e.detail`. In `app/routers/api/health.py`, the 503's message becomes "SELECT 1 raised SQLAlchemyError; the database did not answer"; its code stays `database_unavailable`.

Every test that asserted one of these string details asserts the detail object's `code` instead, and the message is asserted nowhere. Add the four cases the Done when names, so each code is reached once by a test. The `Refusal` docstring follows `docs/rules/comment-rules.md`'s interface-comment rule. After the router changes, run `npm run gen:api` in `frontend/` and commit whatever it regenerates.

**Out of scope**

- The frontend's rendering of any code: T3 to T6.
- A code for a refusal no screen reaches: the validation errors of a configuration's arrays, a card with no values, the deck-copy and deletion-impact refusals: never.
- Any HTTP status change: never.
- Mapping a database outage to 503 on an endpoint other than health: a later cycle.

**Done when**

- `uv run pytest tests/api_tests/test_subjects.py tests/api_tests/test_decks.py tests/api_tests/test_deck_batch_edit.py tests/api_tests/test_field_defs.py tests/api_tests/test_deck_practice_config.py tests/api_tests/test_practice_run.py tests/api_tests/test_health.py -q` passes, with `test_duplicate_name_for_same_user_rejected` asserting `response.json()["detail"]["code"] == "subject_name_taken"`, the existing current-card test asserting `not_current_card`, the "at least two fields" and "already exists" tests asserting `too_few_fields`, `deck_name_taken` and `field_name_taken`, `test_health_reports_database_unavailable` asserting the new message, and four new cases: `test_batch_edit_deck_name_clash_answers_deck_name_taken`, `test_batch_edit_field_name_clash_answers_field_name_taken`, `test_duplicate_configuration_name_answers_configuration_name_taken` and `test_rating_a_rated_card_answers_card_already_rated`.
- `uv run pytest tests/api_tests/test_layering_guard.py tests/api_tests/test_models_layout_guard.py -q` passes with the new module in place.
- `grep -rn "already exists\|at least two fields\|already been rated\|not the current card" tests/api_tests/ --include=test_subjects.py --include=test_decks.py --include=test_deck_batch_edit.py --include=test_field_defs.py --include=test_deck_practice_config.py --include=test_practice_run.py` prints nothing.
- With `fastapi dev` running under the development bypass, `curl -s -X POST localhost:8000/api/subjects -H 'Content-Type: application/json' -d '{"name":"Twice"}'` twice prints, the second time, a body whose `detail` is an object with `"code": "subject_name_taken"` and a `message`, and the status is 400.
- In `frontend/`, `npm run gen:api` leaves `git status --short src/api/` empty, or its two regenerated files are in the task's commit.

**Debrief**

Evidence, in the order of Done when:

- The seven files print `212 passed`. Run by name with `-v`, these pass: `test_duplicate_name_for_same_user_rejected` (`subject_name_taken`), `test_rate_non_current_pending_card_rejected` (`not_current_card`), `test_batch_edit_deck_name_clash_answers_deck_name_taken`, `test_batch_edit_field_name_clash_answers_field_name_taken`, `test_duplicate_configuration_name_answers_configuration_name_taken`, `test_rating_a_rated_card_answers_card_already_rated` and `test_health_reports_database_unavailable`, which asserts the message "SELECT 1 raised SQLAlchemyError; the database did not answer". The three "at least two fields" tests in `test_deck_batch_edit.py`, the two in `test_decks.py` and the one in `test_field_defs.py` now assert `too_few_fields`. `test_duplicate_deck_name_in_subject_rejected_and_rolled_back` asserts `deck_name_taken`, and `test_duplicate_active_name_leaves_no_rows` asserts `field_name_taken`.
- The two guards print `6 passed`.
- The grep prints nothing (exit 1).
- Against the running `fastapi dev`, the first POST of `{"name":"Twice"}` answered 201. The second answered `{"detail":{"code":"subject_name_taken","message":"subject (user_id, name) already exists"}}` with status 400. The subject "Twice" stays in the dev database.
- `npm run gen:api` changes both files, so both are in this commit. The only change drops the `GET /` "Read Root" operation: 90c3761 removed that route without regenerating. Every refusal detail here comes from an `HTTPException`, which the schema does not describe, so this task changes no type.
- The full backend suite, run with no other connection to the test database, printed `351 passed`. In `frontend/`, `npx vitest run` printed `526 passed`, and `npm run lint` and `npm run build` exited 0.

Departures:

- Batch edit: today a deck or field rename that clashes never reaches the commit's `except IntegrityError`. An autoflush ahead of a read, or the field phase's own flush, raises it first, and the request answered 500; a probe test showed both cases. So `apply_deck_batch_edit` now wraps a private `_stage_deck_batch_edit`, which holds the old body without its commit, together with the commit, in one `except IntegrityError`. That handler maps the two constraints to their `Refusal`s and any other constraint to today's `DeckBatchEditValidationError`.
- Two of the four new cases were already tests that asserted only the status: `test_rate_already_rated_card_rejected` and `test_duplicate_name_rejected`. Each is renamed to its Done-when name and gains the code assertion, so no case is duplicated. The configuration case also renames a second configuration to the taken name, which reaches the PATCH branch in `db_update_deck_practice_config`.
- On the engineer's order, two cases beyond the Done when cover the two rename sites no test reached: `test_rename_to_taken_name_answers_subject_name_taken` in `test_subjects.py`, for `db_update_subject`, and `test_rename_to_taken_name_answers_field_name_taken` in `test_field_defs.py`, for `db_rename_field_def`. Each asserts the code and that the name is unchanged, and both pass. Every `Refusal` site is now reached by a test. The routers' `except ValueError` branches after `except Refusal` in `subject.py` and in `field_def.py`'s create and rename handlers can no longer be reached. They stay because Details gives every handler both branches.
- Every name-taken message says "already exists", for example "deck_practice_config (deck_id, name) already exists". Until T5, `DeckConfigurationEditor.tsx` sends a name clash to the name field by matching `/already exists/` in the message, so this wording keeps that working. Until T4 to T6 land, a form shows these developer messages where it showed the old sentences.

Read `apply_deck_batch_edit` in `app/services/deck_batch_edit.py`: it is the one change in structure. Every other site changes only the exception it raises.

### T3 — The sentence function

**Status**

- [x]

**Goal**

One function turns a failed request into the sentence the user reads, by code and status and never by message text.

**Dependencies**

- T2: the codes it maps.

**Files**

- `frontend/src/lib/failureSentence.ts` (new)
- `frontend/src/lib/failureSentence.test.ts` (new)
- `frontend/src/api/unwrap.ts`
- `frontend/src/test/unwrap.test.ts`

**Details**

One frontend function turns a failed request into the sentence the user reads, chosen by the error's code and status and never by its message, from the sentences `docs/vocabulary.md` gives beside their codes; the connectivity banner is the one sentence source outside it (ADR 070). The component that owns a query or mutation renders that sentence itself; there is no error boundary for display, no cache handler and no toast, and the app never resubmits a mutation on its own.

The interface:

```ts
// frontend/src/lib/failureSentence.ts
/** The sentence the user reads for a failed request. `notFound` is the caller's own
 * "<Thing> not found." sentence, rendered when the response is a 404 that carries no
 * known code. Never reads the error's message. */
export function failureSentence(error: unknown, notFound: string): string;
```

The choice, in this order: an `ApiDetailError` whose `detail.code` the map knows renders that code's sentence, whatever the status; an `ApiError` with status 404 renders `notFound`; an `ApiError` with status 500 or above renders `SERVER_TROUBLE_MESSAGE` from `src/api/unwrap.ts`; anything that is not an `ApiError` is a request that got no response and renders `CONNECTION_FAILED_MESSAGE` from the same module; every other `ApiError`, a plain-string detail, a validation array or an unknown code, renders "Something went wrong.".

The map's rows are the vocabulary's: `subject_name_taken` "A subject with this name already exists."; `deck_name_taken` "A deck with this name already exists."; `field_name_taken` "A field with this name already exists."; `configuration_name_taken` "A configuration with this name already exists."; `too_few_fields` "A deck needs at least two fields."; `card_already_rated` "This card has already been rated."; `not_current_card` "This is not the current card."; `stale_config` "This configuration no longer produces any prompts — edit it."; `duplicate_deck` "Choose one configuration per deck."; `nothing_to_rerun` "This practice can't be re-run. A field it practiced has since been removed from each of its decks."; `database_unavailable` "Flashy is temporarily unavailable."; `no_cards` and `config_not_found` take `NO_CARDS_MESSAGE` and `MISSING_CONFIGURATION_MESSAGE` from `src/lib/practiceCopy.ts`, so each sentence has one definition. `run_active` has no row and falls to "Something went wrong.". Check every literal against `docs/vocabulary.md` before committing.

In `src/api/unwrap.ts`, change no thrown value; rewrite the interface comments on `ApiError` and `ApiDetailError` so they no longer say that callers read the message, since after this cycle no screen does, and leave `unwrap.test.ts` as it is unless a comment it quotes changes.

**Out of scope**

- Any call site rendering through the function: T4 to T6.
- Removing or renaming `UNKNOWN_ERROR_MESSAGE` or any thrown message in `unwrap.ts`: never in this cycle; nothing renders them once T4 to T6 land.
- A sentence for `run_active`: never; no screen reaches it.
- The banner's sentences: never; `ConnectionBanner.tsx` keeps them.

**Done when**

- In `frontend/`, `npx vitest run src/lib/failureSentence.test.ts` passes with these cases: "renders each known code's sentence, whatever the status", covering all thirteen codes; "a known code wins over a 404", with `config_not_found` at 404; "a 404 without a known code renders the caller's not-found sentence"; "a 5xx without a known code renders the server-trouble sentence, and database_unavailable its own"; "an error that is not an ApiError renders the connection sentence"; "a string detail, a validation array and an unknown code render Something went wrong", with `run_active` as the unknown code; "never reads the message", with a known code and a message of "xyz".
- For every sentence literal in `src/lib/failureSentence.ts`, `grep -F -- '<sentence>' docs/vocabulary.md` prints a line; the Debrief lists the sentences checked.
- `grep -rln "failureSentence" frontend/src --include=*.tsx` prints nothing.

**Debrief**

Evidence, in the order of Done when:

- `npx vitest run src/lib/failureSentence.test.ts` printed `7 passed`, one per named case: "renders each known code's sentence, whatever the status", over all thirteen codes at 400, 404, 409, 422, 500 and 503; "a known code wins over a 404", with `config_not_found` at 404; "a 404 without a known code renders the caller's not-found sentence"; "a 5xx without a known code renders the server-trouble sentence, and database_unavailable its own"; "an error that is not an ApiError renders the connection sentence"; "a string detail, a validation array and an unknown code render Something went wrong", the first two thrown by `unwrap` and `run_active` as the unknown code; "never reads the message", with `subject_name_taken` and the message "xyz".
- `grep -F` found each of these in `docs/vocabulary.md`, each code's on the Sentences row that carries that code: "A subject with this name already exists.", "A deck with this name already exists.", "A field with this name already exists.", "A configuration with this name already exists.", "A deck needs at least two fields.", "This card has already been rated.", "This is not the current card.", "This configuration no longer produces any prompts — edit it.", "Choose one configuration per deck.", "This practice can't be re-run. A field it practiced has since been removed from each of its decks.", "Flashy is temporarily unavailable." and "Something went wrong.". The four sentences the function imports were checked the same way: `NO_CARDS_MESSAGE` and `MISSING_CONFIGURATION_MESSAGE`, on the `no_cards` and `config_not_found` rows, and `CONNECTION_FAILED_MESSAGE` and `SERVER_TROUBLE_MESSAGE`, on their "—" rows.
- `grep -rln "failureSentence" frontend/src --include=*.tsx` printed nothing (exit 1).
- Over the whole frontend, `npx vitest run` printed `533 passed`, and `npm run lint` and `npm run build` exited 0.

Departures: none. The map is a `ReadonlyMap`, since `npm run build` refuses an indexed read of a `Record` as `string | undefined`, and a `Map` also never answers for a key such as `constructor`. `unwrap.ts` changes only the interface comments on `ApiError` and `ApiDetailError`; no comment `unwrap.test.ts` quotes changed, so it is untouched.

Nothing in the code needs reading beyond `failureSentence` itself.

### T4 — The library's pages

**Status**

- [x]

**Goal**

The library, a subject's page and a deck's page read the file's words: "Add …" buttons, each toolbar's count with the heading lines gone, the empty and could-not-load sentences, and the deck page's delete failure through `failureSentence`.

**Dependencies**

- T1: `docs/vocabulary.md`, the reference every sentence is checked against.
- T3: `failureSentence`.

**Files**

- `frontend/src/pages/LibraryPage.tsx`
- `frontend/src/pages/LibraryPage.test.tsx`
- `frontend/src/pages/SubjectDetailPage.tsx`
- `frontend/src/pages/SubjectDetailPage.test.tsx`
- `frontend/src/pages/DeckDetailPage.tsx`
- `frontend/src/pages/DeckDetailPage.test.tsx`

**Details**

Every word and sentence on these three pages must be a row of `docs/vocabulary.md`; the builder checks each one the task adds or changes against the file, and no lint rule, guard test or allowlist does it. A button that puts a new thing into the collection the user is looking at says "Add …", and a list's toolbar row, its button and its label, stays whether the list is empty, still loading or failed to load (PDR 003).

A number sits once, beside what it counts. A list's toolbar label is the list's one-line summary beside its add button: "N subjects" and "N decks" on the library's tabs, as today; "N decks · N cards" on a subject's page, "Decks" while the decks load; "N cards · N fields" on a deck's Cards tab; "N configurations" on its Configurations tab, "Configurations" while they load. The line under a subject's heading, "N decks · N cards", and the line under a deck's heading, "N cards · N fields", go. The heading keeps the subject's icon, name and description, and the deck's name.

In `LibraryPage.tsx`, replace the page-local `CreateButton` with `AddButton` from `src/components/ui/AddButton` and the labels "New subject" and "New deck" with "Add subject" and "Add deck"; the toolbar's `h2` and its counts stay. In `SubjectDetailPage.tsx`, the toolbar label becomes the count above, the empty sentence becomes "No decks yet.", and a deck row with no cards reads "0 cards", since "No cards" has no row and a deck is counted in cards. In `DeckDetailPage.tsx`, give each tab's toolbar its label at the left of its button, rename "New configuration" to "Add configuration", shorten the empty sentence to "No configurations yet.", make the failed load read "Could not load configurations.", and render the configuration delete's failure with `failureSentence(error, 'Deck configuration not found.')`; nothing reads `error.message`.

The three test files assert the old labels by role and text; change those assertions to the new words and keep every case. "Decks" as the toolbar's text with an empty, loaded list becomes "0 decks · 0 cards".

**Out of scope**

- The breadcrumb rows on these pages: never here; they are another cycle's.
- The browser tab's title: T7.
- Any word on a form these pages open: T5.
- The Practice page and its button: T6.
- A change to what either header's actions do: never.

**Done when**

- In `frontend/`, `npx vitest run src/pages/LibraryPage.test.tsx src/pages/SubjectDetailPage.test.tsx src/pages/DeckDetailPage.test.tsx` passes, with the library's four button assertions reading "Add subject" and "Add deck", the subject page's empty case finding "No decks yet." and "0 decks · 0 cards", its zero-card row finding "0 cards", and the deck page's three "New configuration" assertions reading "Add configuration".
- `grep -n "New subject\|New deck\|New configuration\|No decks in this subject\|One says which\|this deck's configurations\|error.message\|CreateButton" frontend/src/pages/LibraryPage.tsx frontend/src/pages/SubjectDetailPage.tsx frontend/src/pages/DeckDetailPage.tsx` prints nothing.
- At `localhost:5173` with the backend running: the library's Subjects tab shows "N subjects" and "Add subject" in one row and its Decks tab "N decks" and "Add deck"; a subject's page shows no line under its heading and a row reading "N decks · N cards" beside "Add deck"; a deck's page shows no line under its heading, its Cards tab a row reading "N cards · N fields" beside "Add card", and its Configurations tab a row reading "N configurations" beside "Add configuration".
- At `localhost:5173`: a deck with no cards shows "0 cards · N fields" above "No cards in this deck yet.", and a deck with no configurations "0 configurations" above "No configurations yet.".
- At `localhost:5173`, with a deck's Configurations tab open in two browser tabs: deleting a configuration in the first and then in the second shows "Deck configuration not found." in the second.

**Debrief**

Evidence, in the order of Done when:

- The three files print `59 passed`. The library's three "New subject" and one "New deck" button assertions read "Add subject" and "Add deck". The subject page's empty case finds "No decks yet." and "0 decks · 0 cards", and its zero-card row case finds "0 cards". The deck page's three "New configuration" assertions read "Add configuration".
- The grep prints nothing (exit 1).
- Headless Chromium at 390×844 against `localhost:5173`, with the toolbar row read as the add button's parent's text: the library's Subjects tab shows "9 subjects Add subject" and its Decks tab "3 decks Add deck". On CompTIA A+, the element after the heading block is the Practice row, and the toolbar shows "2 decks · 75 cards Add deck". On Ports, the element after the `h1` is the Practice row, the Cards tab shows "21 cards · 4 fields Add card", and the Configurations tab "3 configurations Add configuration".
- On Reformer Repertoire, the Cards tab shows "0 cards · 5 fields Add card" above "No cards in this deck yet.", and the Configurations tab "0 configurations Add configuration" above "No configurations yet.".
- A configuration "T4 delete check 360759" was created on Ports through the API, and the deck's Configurations tab was opened in two tabs. Deleting it in the first closed the dialog. Deleting it in the second showed "Deck configuration not found." inside the dialog. The check deleted the configuration, so the dev database holds what it held before.
- Over the whole frontend, `npx vitest run` printed `534 passed`, and `npm run lint` and `npm run build` exited 0.

Departures:

- The configuration delete's failure now renders inside the confirm dialog, as the practice page's delete does, and a new attempt clears the old sentence. It used to render below the list. There the open dialog's scrim covered it, and Cancel cleared it before the user could read it.
- The Library's "Add subject" and "Add deck" now show `AddButton`'s plus icon, as every other add button does.
- `DeckDetailPage.test.tsx` gains one case, "a delete of a configuration already gone says Deck configuration not found.", which answers a 404 and finds the sentence in the dialog. The empty-configurations case now finds "No configurations yet." exactly and "0 configurations", and is renamed to match. Three test and group names that said "meta line" or "No cards" now name the toolbar label and "0 cards".
- In `SubjectDetailPage.tsx`, `formatFieldNames`'s interface comment said the deck's field count was on "the deck detail page's own meta line". It now says the deck page's Cards tab toolbar.

After a "Deck configuration not found." in the second tab, the gone row stays in that tab's list until the query refetches, for example on window focus. This task does not change that.

Nothing in the code needs reading beyond the three pages' diffs.

### T5 — The forms and the shortcut

**Status**

- [x]

**Goal**

Every form ends with "Create" or "Save", its heading, hints, picker rows, board labels and sentences read the file's words, the top bar's shortcut is spoken as "New" with "New …" rows, and every form's failure renders through `failureSentence`.

**Dependencies**

- T1: `docs/vocabulary.md`, the reference every sentence is checked against.
- T3: `failureSentence`.

**Files**

- `frontend/src/components/library/SubjectForm.tsx` and `SubjectForm.test.tsx`
- `frontend/src/components/library/DeckEditor.tsx` and `DeckEditor.test.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx` and `CardStandaloneForm.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx` and `DeckConfigurationEditor.test.tsx`
- `frontend/src/components/library/FieldAssignmentBoard.tsx`
- `frontend/src/lib/deckConfigurationBoard.ts` and `deckConfigurationBoard.test.ts`
- `frontend/src/components/shell/TopBar.tsx` and `TopBar.test.tsx`
- `frontend/src/components/shell/CreateSheet.tsx` and `CreateSheet.test.tsx`
- `frontend/src/pages/practicePrefilterChain.test.tsx`

**Details**

Every word and sentence in these files must be a row of `docs/vocabulary.md`; the builder checks each one the task adds or changes against the file, and no lint rule, guard test or allowlist does it.

A form that makes a new thing ends with the button "Create"; a form that changes an existing thing ends with "Save". Both stand bare, since the heading above names the thing. "Create subject", "Save changes" and the final button "Add card" go; the deck form's "Saved ✓" flash after an edit-mode save stays, and the confirm "Save changes?" keeps its title with its button reading "Save". Wherever a thing is started with no collection in view, the word is "New …": every form's heading, as today, and the top bar's shortcut, spoken as "New", with the rows "New subject", "New deck", "New card" and "New practice" and "Create a deck first" under "New card" when there is no deck. A picker's last row keeps "New subject…" in the deck form and "New deck…" in the card form and the configuration form.

On New configuration the missing-name sentence reads "Give this configuration a name to create it." and on Edit configuration "Give this configuration a name to save it."; "config" appears on no screen. The suggested name stays as built: the prompt side's field names, then "→", then the answer side's, always-shown before random-draw, at most two per side and "+N" for the rest, empty while either side has no field, following the board until the user types and theirs afterwards on New configuration, the stored name and no suggestion on Edit configuration; a duplicate name is refused for the user to fix in place and nothing is numbered. That rule stays in `defaultConfigurationName` in `src/lib/deckConfigurationBoard.ts`, computed in the browser, and the server composes no name.

The board's words: the two halves are the "Prompt side" and "Answer side", each holding an "Always shown" and a "Random draw" area; a field left out sits under "Not used"; an empty "Not used" area says "Every field is assigned." and any other empty area "None yet."; the draw-count legend is "How many random prompt fields each card shows" or its answer-side twin and the sizes read "Each card shows [1] [2] … of these"; tapping a field opens 'Move "…" to…' with the rows "Prompt · always shown", "Prompt · random draw", "Answer · always shown", "Answer · random draw" and "Not used". The four areas' spoken names, `SLOT_LABELS` in `deckConfigurationBoard.ts` today, must become those same four row words, so one join names an area wherever it is named; the board's rules keep their four sentences. The deck editor's primary-field marker, "Primary" explained as "The first field identifies this card in lists and summaries.", stays, and the primary field stays the active field at position 0, derived from the order and never stored. A deck's field-name error reads "Name is required." with its period.

Every failure renders through `failureSentence`, and nothing reads `error.message`: `SubjectForm.tsx` passes "Subject not found.", `DeckEditor.tsx` "Deck not found.", `CardStandaloneForm.tsx` "Card not found.", `DeckConfigurationEditor.tsx` "Deck configuration not found."; in the last, a failure whose `detail.code` is `configuration_name_taken` goes to the name field's error and every other failure to the form's, in place of today's test on the message's text.

The ten test files assert the old words by role and text; change those assertions and keep every case. In `DeckEditor.test.tsx`, `DeckConfigurationEditor.test.tsx` and `practicePrefilterChain.test.tsx`, a "Save" clicked in a create flow becomes "Create" and one clicked in an edit flow stays.

**Out of scope**

- The subject form's Icon control and its sheet: never here; they are another cycle's.
- The library's and practice's pages: T4 and T6.
- The browser tab's title: T7.
- Any change to the board's mechanics or the suggested name's rule: never.
- The error sites in pages: T4 and T6.

**Done when**

- In `frontend/`, `npx vitest run src/components/library src/components/shell/TopBar.test.tsx src/components/shell/CreateSheet.test.tsx src/lib/deckConfigurationBoard.test.ts src/pages/practicePrefilterChain.test.tsx` passes, with the subject form's five submit assertions reading "Create" and "Save", the card form's two "Add card" reading "Create", the deck editor's create-flow "Save" assertions and the overlay's "Create subject" reading "Create" and its "Save changes" reading "Save", the configuration editor's two hint assertions reading the two new sentences, its create-flow "Save" reading "Create" and its four region queries reading the sheet's row words, the top bar's three "Create" reading "New", and the sheet's dialog named "New" with rows "New subject", "New deck", "New card", "New practice".
- `grep -rn "Create subject\|confirmLabel=\"Save changes\"\|'Add card'\|Give this config \|aria-label=\"Create\"\|ariaLabel=\"Create\"\|Prompt side · \|Answer side · \|error.message\|err.message\|already exists/i" frontend/src/components/library frontend/src/components/shell frontend/src/lib/deckConfigurationBoard.ts` prints nothing.
- At `localhost:5173` with the backend running: New subject, New deck, New card and New configuration each end with "Create", and Edit subject, Edit deck, Edit card and Edit configuration with "Save"; saving an edited deck flashes "Saved ✓"; New configuration with a blank name shows "Give this configuration a name to create it." and Edit configuration "Give this configuration a name to save it."; the top bar's plus opens a sheet listing "New subject", "New deck", "New card", "New practice".
- At `localhost:5173`: creating a subject with a taken name shows "A subject with this name already exists." in the form, and saving a configuration with a taken name shows "A configuration with this name already exists." on its name field.

**Debrief**

Evidence, in the order of Done when:

- The named run prints `12 passed` files and `162 passed` tests. The subject form has seven submit assertions, not five: four read "Create" and three read "Save". The card form's two "Add card" assertions read "Create". The deck editor's three create-flow "Save" assertions and the overlay's "Create subject" read "Create". Its "Save changes" assertion reads "Save", scoped to the dialog, since the header's Save also matches. The configuration editor's two hint assertions are both in create flows, so both read "Give this configuration a name to create it.". A new edit case, "a cleared name keeps Save disabled with the reason shown", reads "Give this configuration a name to save it.". Its four create-flow "Save" assertions read "Create". Its region queries are five, not four, and read "Prompt · always shown", "Answer · always shown" and "Prompt · random draw". The top bar's three "Create" assertions read "New". The sheet's dialog is named "New", and its rows are "New subject", "New deck", "New card" and "New practice". The chain test's two create-flow "Save" clicks read "Create", and its edit-flow click stays "Save".
- The grep prints nothing (exit 1).
- In headless Chromium against `localhost:5173`, these were the buttons each form showed: New subject `Cancel, Create`; Edit subject `Cancel, Save, Delete subject`; New deck `Cancel, Create, Add field`; Edit deck `Done, Undo, Save, Add field, Delete deck`; New card `Cancel, Create`; Edit card `Cancel, Save, Delete card`; New configuration `Cancel, Create`; Edit configuration `Cancel, Save`. Renaming the deck Commands to "Commands T5" and saving flashed "Saved ✓". A second save renamed it back to "Commands", so the dev database holds the name it held before. On New configuration, after assigning two fields, the regions read "Not used", "Prompt · always shown", "Prompt · random draw", "Answer · always shown" and "Answer · random draw". The suggested name read "Command → Command purpose". With the name cleared, the page showed "Give this configuration a name to create it." and Create was disabled. Edit configuration with the name cleared showed "Give this configuration a name to save it.". On Home, the top bar's "New" button opened a dialog named "New" with the rows "New subject", "New deck", "New card" and "New practice".
- New subject with the name "Twice" showed "A subject with this name already exists." in the form's alert. On Edit configuration for "Command to Purpose", renaming it to "Purpose to Command" and saving showed "A configuration with this name already exists." in the name field's alert, with `aria-invalid="true"`. Neither check wrote a row.
- Over the whole frontend, `npx vitest run` printed `537 passed`, and `npm run lint` and `npm run build` exited 0. These runs included the peer's uncommitted T4 pages.

Departures:

- "Change deck" has no row in `docs/vocabulary.md`. It was the confirm button of "Change deck?" in `CardStandaloneForm.tsx` and of the board's deck switch in `DeckConfigurationEditor.tsx`. Both now read "Continue", the file's word for accepting a warning. The file's Continue row lists only New card and Edit card under Where, not New configuration. The other fix is a "Change deck" row in the file, and that choice is yours. Three test assertions changed with it.
- `FieldAssignmentBoard.tsx`'s `DESTINATIONS` is now a list of slots, and each row's text comes from `SLOT_LABELS`. A sheet row and an area's spoken name now come from one table.
- New cases besides the edit-hint case: "a blank field name shows an inline error" in `DeckEditor.test.tsx` reads "Name is required.". "names each slot by the move sheet's row words" in `deckConfigurationBoard.test.ts` asserts `SLOT_LABELS`.
- Tests that read a backend message now read the sentence. The duplicate-name mocks answer a `{code, message}` detail. A 404 from deletion-impact reads "Subject not found." or "Deck not found.", and a 422 with a string detail reads "Something went wrong.".
- Some comments named the create-mode button "Save" or the top bar's button "Create". Those in `DeckEditor.tsx`, `DeckConfigurationEditor.tsx`, `deckConfigurationBoard.ts` and `TopBar.tsx` now name the button it is. `SLOT_LABELS`'s comment states where the labels are used. `CreateSheet.tsx`'s interface comment said "practise", which now reads "practice". Test names that said "Save" for a create-mode button say "Create".
- Prettier was run on the three files this task reformatted. `DeckConfigurationEditor.tsx` also has the line `const name =`, which was already unformatted at HEAD. Prettier would reflow it, and it is left as it was.

Read the `onError` of `saveMutation` in `DeckConfigurationEditor.tsx`: it sends a failure to the name field by `detail.code` alone. In the other three forms each failure site only swaps its expression for a `failureSentence` call. That means a 404 on a create also reads that form's not-found sentence. Creating a card in a deck deleted meanwhile, for example, reads "Card not found.".

### T6 — The practice pages

**Status**

- [x]

**Goal**

The list of practices, New practice, a practice's own page, the run page and the summary read the file's words, with "Add practice", "New configuration…", "Subject · Deck", "Practice status" and "practiced", every failure through `failureSentence`.

**Dependencies**

- T1: `docs/vocabulary.md`, the reference every sentence is checked against.
- T3: `failureSentence`.
- T5: the chain test it shares, and the configuration form's words New practice opens.

**Files**

- `frontend/src/pages/PracticeOverviewPage.tsx` and `PracticeOverviewPage.test.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx` and `PracticeCreatePage.test.tsx`
- `frontend/src/pages/PracticeDetailsPage.tsx` and `PracticeDetailsPage.test.tsx`
- `frontend/src/pages/PracticeRunPage.tsx` and `PracticeRunPage.test.tsx`
- `frontend/src/pages/practicePrefilterChain.test.tsx`
- `frontend/src/components/practice/ConfigurationPickList.tsx`
- `frontend/src/components/practice/SelectedConfigurationList.tsx`
- `frontend/src/components/practice/RunBreakdown.tsx` and `RunBreakdown.test.tsx`
- `frontend/src/components/practice/FieldValue.tsx`
- `frontend/src/lib/practiceCopy.ts`

**Details**

Every word and sentence in these files must be a row of `docs/vocabulary.md`; the builder checks each one the task adds or changes against the file, and no lint rule, guard test or allowlist does it.

The Practice page is itself the list of practices and its header is that list's toolbar, so its button reads "Add practice", in the header where it stands today. Its tabs are spoken as "Practice status". On New practice, the button in the configuration list's toolbar that leaves to make a configuration reads "New configuration…", and the empty list says "No configurations yet.", as the page's other sentences say "configuration". A thing's address reads from the widest place inward on every screen: New practice's group headings and its "Selected" rows read "Subject · Deck", the order its list is sorted in, in place of today's "Deck · Subject"; `ConfigurationPickList.tsx` and `SelectedConfigurationList.tsx` carry both. The verb is "practiced": the delete confirm on the Practice page and on a practice's own page says "The decks it practiced are not affected."

New practice's draft stays as built: the chosen configurations and a typed name ride the URL as a repeated `config=<id>` and a `name=` once edited, written with `replace`; the draft survives leaving to make or edit a configuration or a deck, a refresh and browser back; Cancel discards it and forwards only the overview's `subject`, `deck` and `status`; a configuration made from New practice comes back chosen and one edited comes back as it was; the configuration builder hands back `{configurationId}` from create mode only; the URL writes that react to fetched data share one effect; until the user types a name it is the moment the page opened.

Every failure renders through `failureSentence`, and nothing reads `error.message` or holds a sentence literal of its own: `PracticeOverviewPage.tsx`, `PracticeDetailsPage.tsx` and `PracticeRunPage.tsx` pass "Practice not found." for the delete, re-run, summary and rating failures; `PracticeCreatePage.tsx` passes "Deck configuration not found." and keeps its branches on `detail.code` only to place the sentence, on the offending row for `stale_config` and at the top for the others, while the sentence itself comes from the function. `practiceCopy.ts` keeps its two constants, which the function imports; the settled-list path that removes a vanished selection keeps using `MISSING_CONFIGURATION_MESSAGE` from it, since no request failed there.

The run page and the summary keep what they are: one bar above the card shows the practice's progress in four parts, spoken as "N passed, N failed, N retrying, N unseen", its whole the number of cards the practice started with and never changing, a card rated "Again" counting as retrying until its retry is rated; the cards group by card id into chains and one fold in `app/services/practice_run.py` serves both the bar and the summary. `RunBreakdown.tsx` is the one component rendering the summary at completion and on a practice's own page, never fetching, under the pages' one query key `['practice_run_breakdown', <run id>]`; a card's mastery there is the fold over all its deck's active fields with a never-reviewed field at the prior, and its change the after-fold minus the before-fold; a field deleted after the practice used it stays in every attempt that asked it as "Removed field", with no value and no rating, through `ResolvedFieldValue.removed`, and the fields list shows only the deck's current fields.

The seven test files assert the old words by role and text; change those assertions and keep every case: the group and item names read "<Subject> · <Deck>", the button "New configuration…", the Practice page's button "Add practice".

**Out of scope**

- The breadcrumb rows on these pages: never here; they are another cycle's.
- The browser tab's title: T7.
- Any change to what the draft keeps, the bar counts or the summary sorts: never.
- Whether the summary's sort order survives a refresh, and how a picture or audio value shows on a card: a later cycle.
- A sentence for `run_active`: never; no screen reaches it.

**Done when**

- In `frontend/`, `npx vitest run src/pages/PracticeOverviewPage.test.tsx src/pages/PracticeCreatePage.test.tsx src/pages/PracticeDetailsPage.test.tsx src/pages/PracticeRunPage.test.tsx src/pages/practicePrefilterChain.test.tsx src/components/practice/RunBreakdown.test.tsx` passes, with the three "New practice" button assertions reading "Add practice", the eight "New configuration" button assertions reading "New configuration…", and the six group or item names reading subject first, as "Alpha · Shared Deck Name".
- `grep -rn "practised\|Session status\|error.message\|No deck configurations yet\|label=\"New configuration\"\|no longer produces" frontend/src/pages/PracticeOverviewPage.tsx frontend/src/pages/PracticeCreatePage.tsx frontend/src/pages/PracticeDetailsPage.tsx frontend/src/pages/PracticeRunPage.tsx frontend/src/components/practice/` prints nothing.
- At `localhost:5173` with the backend running: the Practice page's header button reads "Add practice"; New practice's groups and its "Selected" rows read "<Subject> · <Deck>" and its toolbar button "New configuration…"; the delete confirm on a practice says "The decks it practiced are not affected.".
- At `localhost:5173`, with the same practice's run page open in two browser tabs: rating the current card in the first and then in the second shows "This is not the current card." or "This card has already been rated." in the second.
- At `localhost:5173`: after completing a practice whose one configuration uses a field, removing that field in the deck editor and tapping Re-run on the practice's page shows "This practice can't be re-run. A field it practiced has since been removed from each of its decks.".

**Debrief**

Evidence, in the order of Done when:

- The named run prints `6 passed` files and `106 passed` tests. The three "New practice" button assertions, one in `PracticeOverviewPage.test.tsx` and two in `practicePrefilterChain.test.tsx`, read "Add practice". The eight "New configuration" button assertions, four in each of `PracticeCreatePage.test.tsx` and the chain test, read "New configuration…". The six group or item names read subject first: "Alpha · Shared Deck Name" and "Beta · Shared Deck Name" twice each in `PracticeCreatePage.test.tsx`, and "Beta · Beta Deck" and "Alpha · Alpha Deck" in the chain test.
- The grep prints nothing (exit 1).
- In headless Chromium at 390×844 against `localhost:5173`, the Practice page's header row reads "Practice" and "Add practice", and its tablist is named "Practice status". On New practice, the groups read "CompTIA A+ · Commands", "CompTIA A+ · Ports" and "T6 check · T6 Rerun". With a Ports configuration ticked, the Selected row reads "Oct 1, 2026 at 1:18 PM" over "CompTIA A+ · Ports". The toolbar button reads "New configuration…". The delete confirm on the Practice page and on a practice's own page both read "Delete this practice?" over "Its progress will be gone. The decks it practiced are not affected.". Both were cancelled.
- A subject "T6 check" was made through the API, with a deck "T6 Rerun" holding the fields Term, Definition and Extra and two cards, a configuration "Term → Extra", a completed practice "T6 rerun check" and an active practice "T6 two-tab check". The active practice's run page was opened in two tabs. In the first, rating Extra Good and tapping Next card moved it to "term 2". The same in the second showed "This card has already been rated.".
- On Edit deck for "T6 Rerun", removing Extra and saving asked "Save changes?" with "This removes 1 field from 2 cards, deletes 1 deck configuration and deletes 1 active practice. This can't be undone.". After Save, the fields read Term and Definition. Re-run on "T6 rerun check" then showed "This practice can't be re-run. A field it practiced has since been removed from each of its decks." and stayed on that practice's page. The subject, the deck with its two cards and the completed practice stay in the dev database. The deck save deleted the configuration and the active practice, as its confirm said.
- Over the whole frontend, `npx vitest run` printed `538 passed`, and `npm run lint` and `npm run build` exited 0. `grep -rn "\.message\b" frontend/src --include=*.tsx | grep -v "\.test\."` prints nothing.

Departures:

- The Practice page's delete failure now renders inside the confirm dialog, as the practice's own page does, and a new attempt clears it. It used to render below the list, under the open dialog's scrim. A new case, "a delete of a practice already gone says Practice not found. inside the dialog", covers it.
- In `PracticeCreatePage.tsx`, `onError` takes one `failureSentence(error, 'Deck configuration not found.')` and branches on `detail.code` only to place it. `stale_config` goes to its row. `config_not_found` goes to `topError`, which the settled-list check also sets, so the sentence never shows twice. Every other failure goes to `saveError`. The `no_cards` branch is gone: it set `topError`, which renders directly above `saveError`, so the sentence still renders in the same place.
- The row error's field is renamed from `message` to `sentence` in `RowError` and in `ConfigurationPickList`'s `rowError` prop. It holds the function's sentence, and `rowError.message` was the one hit of T7's `.message` grep.
- Two sentences outside the Done-when grep now read the file's words: "Could not load deck configurations." reads "Could not load configurations.", and "Select at least one configuration to practise." reads "practice.".
- `practiceCopy.ts`'s comments said the pages render its constants so that the pages agree. They now say `failureSentence` renders them by code, and that the module keeps them so a screen with no failed request uses the same words.
- Tests that read a backend message now read the sentence. The run page's rating failure answers a `card_already_rated` detail and reads "This card has already been rated.". The practice page's 500 delete reads "Flashy is having trouble right now. Try again in a moment.", and `nothing_to_rerun` reads its sentence. New practice's "any other error" case answers the detail "boom" and reads "Something went wrong.". Test names that named a button now name it by its new words.
- Prettier was run on the two test files this task reformatted. `PracticeCreatePage.test.tsx` already had four unformatted statements at HEAD. Prettier reflowed them too, and they were put back as they were.
- `FieldValue.tsx`, `RunBreakdown.tsx` and `RunBreakdown.test.tsx` are unchanged, because every word they show is already a row of the file.
- New practice's header shows "N selected" beside Create, and `docs/vocabulary.md` has no row for it. It stays as it was. The other fix is to add that row or remove the count, and that choice is yours.

Read `onError` of `createMutation` in `PracticeCreatePage.tsx`: it is the one place where a code decides where a failure renders. Every other site only swaps `error.message` for a `failureSentence` call.

### T7 — The browser tab's title

**Status**

- [ ] [BLOCKED]

**Goal**

Every page's browser tab reads the page's own name, then "Flashy".

**Dependencies**

- T4, T5, T6: their files, which this task edits after them.

**Files**

- `frontend/index.html`
- `frontend/src/lib/pageTitle.ts` (new)
- `frontend/src/lib/pageTitle.test.ts` (new)
- `frontend/src/pages/HomePage.tsx`, `LibraryPage.tsx`, `NotificationsPage.tsx`, `SubjectDetailPage.tsx`, `DeckDetailPage.tsx`, `PracticeOverviewPage.tsx`, `PracticeCreatePage.tsx`, `PracticeDetailsPage.tsx`, `PracticeRunPage.tsx`
- `frontend/src/pages/placeholderPages.test.tsx`
- `frontend/src/components/library/SubjectForm.tsx`, `DeckEditor.tsx`, `CardStandaloneForm.tsx`, `DeckConfigurationEditor.tsx`

**Details**

The browser tab reads the narrowest place the page shows, then "Flashy", joined by " · ", and never more than those two: "Home · Flashy", "Your library · Flashy", "Notifications · Flashy", "Practice · Flashy", "New practice · Flashy"; a subject's or a deck's name on its page, as "Spanish · Flashy" and "Verbs · Flashy"; a practice's own name on its page and on its run page, as "Aug 24, 2026, 9:00 AM · Flashy"; and a form's heading on a form, "New subject · Flashy", "Edit deck · Flashy" and the rest. Until a page knows its name, the tab reads "Flashy" alone, which `index.html` must carry in place of "frontend".

The interface:

```ts
// frontend/src/lib/pageTitle.ts
/** Sets the browser tab to `<name> · Flashy` while the calling page is mounted and
 * `name` is known, and restores "Flashy" when it unmounts. An undefined name leaves
 * the title as it is, for a page whose name is still loading. */
export function usePageTitle(name: string | undefined): void;
```

Set `document.title` in an effect keyed on `name`; never render a `<title>` element, since the static one in `index.html` would stand before it in `<head>`. Each routed page calls the hook once with its name: the fixed word for the main places and New practice, `subject.name`, `deck.name` or `session.name` once loaded for the detail pages, `runQuery.data?.session_name` for the run page, and the heading's words for the forms. Call it in the routed component, `SubjectForm` and not `SubjectFormBody`, so the deck form's New subject overlay does not retitle the deck form. Every word must be a row of `docs/vocabulary.md`, which the builder checks against the file.

**Out of scope**

- Any other word on these pages: T4 to T6.
- A title for a state no page owns, such as a not-found body: never; the tab reads "Flashy".
- `<title>` rendered from a component: never; the reason is above.

**Done when**

- In `frontend/`, `npx vitest run src/lib/pageTitle.test.ts src/pages/placeholderPages.test.tsx` passes, with `pageTitle.test.ts` covering "sets the title to the name then Flashy", "follows a changed name", "leaves the title alone while the name is undefined" and "restores Flashy on unmount", and `placeholderPages.test.tsx` asserting `document.title` reads "Home · Flashy" and "Notifications · Flashy".
- `grep -n "<title>" frontend/index.html` prints a line containing `<title>Flashy</title>`, `grep -rln "usePageTitle" frontend/src/pages frontend/src/components/library` prints thirteen files, and `grep -rn "<title" frontend/src` prints nothing.
- At `localhost:5173` with the backend running, reading the tab's title on each route: "Home · Flashy" at `/`, "Your library · Flashy" at `/library`, "Notifications · Flashy" at `/notifications`, "Practice · Flashy" at `/practice`, "New practice · Flashy" at `/practice/new`, a subject's and a deck's name on their pages, a practice's name on its page and its run page, "New subject · Flashy", "New deck · Flashy", "New card · Flashy" and "New configuration · Flashy" on the four create forms and "Edit subject · Flashy", "Edit deck · Flashy", "Edit card · Flashy" and "Edit configuration · Flashy" on the edit forms; with the deck form's New subject overlay open, still "New deck · Flashy".
- The cycle's judgement, at `localhost:5173`: every heading, button, tab, label, empty state, picker row and browser tab on every screen is a row of `docs/vocabulary.md`, the Debrief listing each screen walked; creating a subject with a taken name shows "A subject with this name already exists.", saving a configuration with a taken name "A configuration with this name already exists.", and rating a card from a second tab after the first has moved on "This is not the current card."; `grep -rn "\.message\b" frontend/src --include=*.tsx | grep -v "\.test\."` prints nothing; and `grep -c '^| ' docs/vocabulary.md` prints a number between 150 and 220.

**Debrief**

Attempted: the whole task, as Files and Details give it. `usePageTitle` in `src/lib/pageTitle.ts` sets the title in one effect keyed on `name` and restores "Flashy" in a second effect's unmount cleanup, so a name that turns undefined leaves the title as it is. Each of the thirteen routed components calls it before any early return. An edit form passes its heading only once its record has loaded, so a not-found form reads "Flashy". `index.html` reads `<title>Flashy</title>`. The first three Done-when lines hold:

- `npx vitest run src/lib/pageTitle.test.ts src/pages/placeholderPages.test.tsx` prints `8 passed`: the four named hook cases, and the two pages' `document.title` reading "Home · Flashy" and "Notifications · Flashy".
- `grep -n "<title>" frontend/index.html` prints `7:    <title>Flashy</title>`. `grep -rln "usePageTitle" frontend/src/pages frontend/src/components/library` prints thirteen files, and `grep -rn "<title" frontend/src` prints nothing.
- In headless Chromium at 390×844, every route reads as Details gives it: "Home · Flashy", "Your library · Flashy", "Notifications · Flashy", "Practice · Flashy", "New practice · Flashy", "CompTIA A+ · Flashy", "Ports · Flashy", "Sep 29, 2026 at 8:41 AM · Flashy" on a practice's page, "T7 two-tab check · Flashy" on a run page, the four "New …" forms and the four "Edit …" forms. A subject that is not found reads "Flashy". With New deck's New subject overlay open, the tab reads "New deck · Flashy".
- Over the whole frontend, `npx vitest run` prints `544 passed`, and `npm run lint` and `npm run build` exit 0.

The fourth line, the cycle's judgement, does not hold, for two reasons.

Found, first: no screen can reach "This is not the current card." from a second tab. `submit_rating` in `app/services/practice_run.py` refuses a card that is not pending, with `card_already_rated`, before it checks that the card is current, with `not_current_card`. A tab only rates the card that was current when it loaded. Rating changes the current card only by taking that card out of pending, and a retry is always queued behind it. So a stale tab's card has always been rated, and it answers `card_already_rated`. The check was run: a practice "T7 two-tab check" was made through the API, and its run page opened in two tabs. In the first, rating Good and tapping Next card showed the next card. The same in the second showed "This card has already been rated.". T6's line allowed either sentence; this line names only the one that cannot be reached.

Found, second: the screens show four words that `docs/vocabulary.md` has no row for. Each screen's visible text, accessible names, placeholders and tab title were checked against the file's quoted words. The screens walked: Home, with the menu open and with the New sheet open; Notifications; the library's two tabs; a subject's page; a deck's Cards and Configurations tabs and its delete-configuration confirm; an empty deck's two tabs; New subject and its Icon sheet; Edit subject and its delete confirm; New deck, its subject picker and its New subject overlay; Edit deck and its delete confirm; New card and its deck picker; Edit card; New configuration and its move sheet; Edit configuration; the Practice page, its Completed tab and its delete confirm; New practice, with and without a selection; a completed practice's page and its Re-run confirm; an active practice's page; the run page, before and after Show answer; and a completed practice's run page. Every string was a row, a templated row or user data, except these:

- "N selected" in New practice's header, which T6's Debrief already raised.
- A deck row's field names on a subject's page, as "Command, Command purpose +10", from `formatFieldNames` in `SubjectDetailPage.tsx`. The "A deck counted" row gives "N cards" and "N fields", not the names.
- A card's label in the summary, "<field>: <value>", as "Command: netstat", from `RunBreakdown.tsx`. Only "Untitled card", for a blank first field, has a row.
- The rating chip's spoken name "Rate <field>", as "Rate Command purpose", from `RatingChip.tsx`. The file gives "Rate" bare. It gives the spoken "Re-run <name>" and "Remove <name>" as their own words.

The logo's "F" is a letter drawn inside its SVG, which is `aria-hidden`; the logo is spoken as "Flashy home". The rest of the line holds. "A subject with this name already exists." and "A configuration with this name already exists." read as given, the second on the name field's alert with `aria-invalid="true"`. `grep -rn "\.message\b" frontend/src --include=*.tsx | grep -v "\.test\."` prints nothing. `grep -c '^| ' docs/vocabulary.md` prints `191`.

Why the file cannot settle it: the first reason needs the line itself changed, or the order of `submit_rating`'s two checks, and `app/services/practice_run.py` is outside Files. The second needs a word for each of the four in `docs/vocabulary.md`, or each screen changed to a word the file has. Out of scope keeps every word but the tab's title out of this task, and the file is the engineer's to change. No row was written for the check, besides the practice "T7 two-tab check" and its one rating, which stay in the dev database.
