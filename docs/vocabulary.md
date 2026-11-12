# Vocabulary

This file gives the words for every concept Flashy shows, every act on it and every situation it speaks to, and the code's names for each, side by side.

| Area | Concept | User reads | Where | Code |
| --- | --- | --- | --- | --- |
| App | The app | "Flashy" | Top bar; browser tab | `app`; `frontend` |
| App | The app's logo, spoken | "Flashy home" | Top bar | `Logo` |
| App | The browser tab's title | "<page name> · Flashy", as "Verbs · Flashy"; "Flashy" until the page knows its name | Browser tab, every page | `document.title` |
| App | The menu, spoken | "Main menu" | Side menu | `SideDrawer`; `NAV_ITEMS` |
| App | Opening and closing the menu, spoken | "Open menu"; "Close menu" | Top bar | `TopBar` |
| App | Starting a new thing from anywhere, spoken | "New" | Top bar's plus button; the sheet it opens | `CreateSheet` |
| App | The shortcut's rows | "New deck"; "New card"; "New practice" | Top bar's New sheet | `CreateSheet` |
| App | New card while there is no deck | "Create a deck first" | Top bar's New sheet, under "New card" | `CreateSheet` |
| App | Signing in | "Log in" | Top bar, signed out | `AuthSlot` |
| App | Signing out | "Log out" | Account sheet | `AccountSheet` |
| App | The signed-in user | "Account"; "Account menu for <name>", spoken | Top bar; Account sheet | `app_user`; `AppUser`; `AccountSheet` |
| App | Searching | "Search" | Top bar | `SearchBar` |
| App | Finishing a form that makes a new thing | "Create" | New deck; New card; New practice | `mode="create"` |
| App | Finishing a form that changes a thing | "Save" | Edit deck; Edit card; Edit practice; a deck's board, opened from a practice's page while no run is active; the save confirm | `mode="edit"` |
| App | Feedback after a save | "Saved ✓" | Edit deck | `savedFlash` |
| App | Backing out | "Cancel" | Every form and confirm | `cancelLabel` |
| App | Leaving when nothing is unsaved | "Done" | Edit deck; a deck's board, while its practice has an active run or opened from a completed run's page | `showDone`; `DeckBoardPage` |
| App | Reversing a staged change | "Undo" | Edit deck | `DeckEditor` |
| App | Accepting a warning | "Continue" | New card | `confirmLabel` |
| App | Throwing away unsaved work | "Discard" | Every discard confirm | `ConfirmDialog` |
| App | Deleting a thing | "Delete"; "Delete <name>", spoken | Page headers; list rows; every delete confirm | `ConfirmDialog`; `/api/deletion-impact`; `DeletionImpactRead` |
| App | Changing a thing, spoken | "Edit deck" on a deck's pencil; "Edit <name>" on a practice's pencil, as "Edit Commands + Ports" | Deck page; a practice's page, on the pencil beside its main action | `navigate` |
| App | A thing's name | "Name" | New practice; Edit practice | `name` |
| App | Narrowing a list | "All decks", each row a deck's name alone; "Clear filters" | All practices | `DeckPicker`; `deck` |
| App | A picker holding more than it shows | "Showing N of N · type to narrow" | Every picker | `PickerCombobox`; `PICKER_MAX_ITEMS` |
| App | A list with nothing in it | "No <things> yet." | Library; deck page; All practices; New practice; a practice's page, under "Runs" | `EmptyState` |
| App | A list its filters empty | "No <things> match these filters." | All practices | — |
| App | Why leaving discards | "You have unsaved changes. Leaving now will discard them." | New deck; Edit deck; New card; Edit card | `confirmCancelOpen` |
| App | Deleting a thing that takes nothing else with it | "This can't be undone." | Edit card; Edit deck | `deletionSummaryText`; `ConfirmDialog` |
| App | Switching the deck a form is filling in | "Change deck?" | New card | `deckChange` |
| App | A name left blank | "Name is required." | New deck, under Deck name and under a field's name; Edit deck, under Deck name and under a field's name; Edit practice, under Name | `nameError`; `FieldsSection` |
| Places | The main places | "Home"; "Your library"; "All practices" | Side menu | `NAV_ITEMS`; `/`; `/library`; `/practices` |
| Places | The start page | "Home" | Side menu; its heading | `HomePage`; `/` |
| Places | The user's whole collection | "Your library"; "the library" | Side menu; its heading; the breadcrumb row | `LibraryPage`; `/library` |
| Places | The row above a page's heading naming the places it belongs to, widest first | "Back", spoken, on the "<" that goes back; "Breadcrumb", spoken; "Your library" on a deck's page; "All practices" on a practice's page; "All practices › <Practice>" on the run page and a completed run's page | Deck page; a practice's page; run page; a completed run's page | `Breadcrumb`; `places` |
| Places | Several decks named in one line | each deck's name with its mark, joined by " · ", as "Commands · Ports" | A run's row on Home; All practices' rows | `DeckLine`; `DeckNameRead`; `deck_name` |
| Home | The steps to a first practice | "Your first practice"; "N of 3"; "New deck", "New card", "New practice" as the steps | Home, until the user has made a practice | `steps`; `HomeSteps`; `first_practice_at` |
| Home | The practices the user can go on with | its name, "Active" and its decks, over its progress; "Start practice" on the most recent | Home | `active_runs`; `HomeRun` |
| Home | The decks of the most recently completed practices | "Recently practiced"; "Practice" on each deck | Home | `recent_decks` |
| Home | Going to New practice from Home | "New practice" | Home, last | `/practices/new` |
| Library | The library's toolbar label | "N decks"; "Decks" while the list loads | Library | `readDecks`; `/api/decks` |
| Library | Deleting a deck that takes other things with it, each count present only above zero | "This also deletes N cards, N fields and N runs, and takes the deck out of N practices. This can't be undone." | Edit deck | `deletionSummaryText`; `DeletionImpactRead`; `practices_affected`; `/api/deletion-impact` |
| Deck | A deck | "deck" | Library; deck page; forms; New practice; a practice's page; a deck's board; Home | `deck`; `Deck`; `DeckSummary`; `DeckDetail`; `/api/decks`; `deckId` |
| Deck | A deck's name | "Deck name" | New deck; Edit deck | `name`; `DeckCreate`; `DeckBatchEdit` |
| Deck | A deck's mark | a stack of cards, drawn as an outline in the color of the words beside it; "Deck", spoken | beside every deck's name, never beside the word "deck" | `DeckMark` |
| Deck | Adding a deck to the list in view | "Add deck" | Library | `AddButton` |
| Deck | The page where a deck is made | "New deck" | Its heading | `/decks/new`; `DeckEditor` |
| Deck | The page where a deck is changed | "Edit deck" | Its heading | `/decks/:deckId/edit`; `DeckEditor`; `PATCH /api/decks/{deck_id}` |
| Deck | Choosing a deck | "Deck"; each row a deck's mark and name; "New deck…" as the last row | New card; Edit card | `DeckPicker`; `PickerCombobox`; `renderBeneath`; `createLabel`; `deck_id` |
| Deck | A deck counted | "N cards"; "N fields" | Library rows | `card_count`; `field_names` |
| Deck | A deck's row | its name, then "N cards · N fields" beneath, as "48 cards · 12 fields" | Library; New practice's picked decks | `DeckRow` |
| Deck | The deck page's toolbar label | "N cards · N fields" | Deck page | `cards`; `field_defs` |
| Deck | Deleting a deck | "Delete deck" | Edit deck | `deleteDeck`; `/api/decks/{deck_id}` |
| Deck | A new deck's starting fields | "Term"; "Definition" | New deck | `deckEditorReducer` |
| Deck | A deck name already taken | "A deck with this name already exists." | New deck; Edit deck | `deck_name_taken` |
| Deck | A deck saved with fewer than two fields | "A deck needs at least two fields." | New deck; Edit deck; a disabled remove button's tooltip | `too_few_fields` |
| Deck | Leaving the deck form with unsaved changes | "Discard this deck?" | New deck; Edit deck | `confirmCancelOpen` |
| Deck | Confirming a save that removes fields | "Save changes?" | Edit deck | `saveConfirm` |
| Deck | What a save that removes fields takes with it | "This removes N fields from N cards, deletes N cards and deletes N active runs. This can't be undone." | Edit deck | `impactSummaryText` |
| Deck | Confirming a deck's deletion | "Delete deck?" | Edit deck | `confirmDeleteOpen` |
| Deck | A deck with no cards | "No cards in this deck yet." | Deck page | `DeckDetailPage` |
| Field | A field | "field" | New deck; Edit deck; counts | `field_def`; `FieldDef`; `DeckFieldDefRead`; `/api/decks/{deck_id}/fields`; `/api/fields/{field_id}`; `fieldDefs` |
| Field | A field's mark | its name in square brackets, as "[Definition]" | every field's name, never the word "field" | `fieldLabel` |
| Field | A deck's fields | "Fields" | New deck; Edit deck; a summary card's detail | `field_defs`; `fields` |
| Field | Adding a field to the deck | "Add field" | New deck; Edit deck | `FieldDefBatchCreate`; `FieldDefBatchOps` |
| Field | A field's inputs | "Field name"; "Field type" | New deck; Edit deck | `name`; `type` |
| Field | The one field type | "Text" | New deck; Edit deck | `FieldType`; `text` |
| Field | A field the card form cannot show | "Unsupported field type" | New card; Edit card | `image`; `audio` |
| Field | Moving a field, spoken | "Move <field> up"; "Move <field> down" | New deck; Edit deck | `order`; `position`; `/api/decks/{deck_id}/fields/reorder` |
| Field | Taking a field away | "Remove <field>", spoken | New deck; Edit deck | `FieldDefBatchOps.delete` |
| Field | The field that names a card | "Primary" | New deck; Edit deck | `primary_field` |
| Field | A field name already taken | "A field with this name already exists." | New deck; Edit deck | `field_name_taken` |
| Field | Two fields with one name in the deck form | "Duplicate name" | New deck; Edit deck | `isDuplicate` |
| Field | What the primary field is | "The first field identifies this card in lists and summaries." | New deck; Edit deck | `primaryIndex` |
| Card | A card | "card" | Deck page; forms; run page; summary | `card`; `Card`; `CardRead`; `card_field_value`; `CardFieldValue`; `/api/cards`; `cardId` |
| Card | A deck's cards | "Cards"; "Cards in <deck>", spoken | Deck page | `CardList` |
| Card | Adding a card to the list in view | "Add card" | Deck page | `AddButton` |
| Card | The page where a card is made | "New card" | Its heading | `/cards/new`; `CardStandaloneForm` |
| Card | The page where a card is changed | "Edit card" | Its heading; the run page's button beside the card's main action, with a pencil, not ready while the answers are hidden; the sheet's button under the record card | `/cards/:cardId/edit`; `CardStandaloneForm` |
| Card | A blank value | "empty" | Deck page | `CardList` |
| Card | A card named in a list | its deck's first field's value alone, as "netstat" | Summary | `primary_field`; `cardTitle` |
| Card | A card whose first field is blank | "Untitled card" | Summary | `primary_field` |
| Card | Deleting a card | "Delete card" | Edit card | `deleteCard`; `/api/cards/{card_id}` |
| Card | A card's deck left unchosen | "Choose a deck to create a card." | New card | `deckError` |
| Card | Leaving the card form with unsaved changes | "Discard this card?" | New card; Edit card | `confirmCancelOpen` |
| Card | Why switching a card's deck clears it | "Switching decks will clear the card you were filling in." | New card | `deckChange` |
| Card | Leaving a card to make a deck | "Create a new deck?" | New card | `confirmCreateDeckOpen`; `goToCreateDeck` |
| Card | Why making a deck clears the card | "This will clear the card you were filling in." | New card | `confirmCreateDeckOpen` |
| Card | Confirming a card's deletion | "Delete card?" | Edit card | `confirmDeleteOpen` |
| Configuration | How a practice asks one of its decks, never named | the deck's board | A practice's page, through each deck's line; a completed run's page, through each deck's line; a deck's board | `practice_configuration`; `PracticeConfiguration`; `PracticeConfigurationRead`; `ConfigurationArrays`; `PUT /api/practices/{id}/configurations/{deck_id}`; `savePracticeConfiguration`; `deckBoard.ts`; `BoardArrays` |
| Configuration | The form showing how a practice asks one of its decks | the deck's name with its mark, and beneath it the practice's name with its mark | Its heading | `/practices/:practiceId/decks/:deckId`; `/runs/:runId/decks/:deckId`; `DeckBoardPage` |
| Configuration | Why a deck's board cannot be changed | "A run is active."; "How this run asked it." | A deck's board, one line above the greyed board, the first opened from a practice's page and the second from a completed run's page | `DeckBoardPage`; `readOnly` |
| Configuration | The two halves of a card | "Prompt side"; "Answer side" | A deck's board | `prompt_*`; `answer_*` |
| Configuration | Fields every card shows | "Always shown"; "Prompt · always shown"; "Answer · always shown" | The board; the move sheet | `prompt_fields`; `answer_fields`; `prompt_field_ids`; `answer_field_ids`; `SLOT_LABELS` |
| Configuration | Fields drawn at random | "Random draw"; "Prompt · random draw"; "Answer · random draw" | The board; the move sheet | `prompt_pool`; `answer_pool`; `prompt_pool_ids`; `answer_pool_ids`; `SLOT_LABELS` |
| Configuration | How many random fields each card shows | "How many random prompt fields each card shows" and "How many random answer fields each card shows", spoken; "Each card shows [1] [2] … of these" | The board | `prompt_pool_counts`; `answer_pool_counts` |
| Configuration | A field left out | "Not used" | The board; the move sheet | `unassigned` |
| Configuration | Moving a field on the board | "Move "[<field>]" to…" | The board | `BottomSheet`; `BoardSlot` |
| Configuration | The deck's fields still loading | "Loading fields…" | A deck's board | `DeckBoardPage` |
| Configuration | The prompt side with no field | "The prompt side needs at least one field — always shown or random draw." | A deck's board, at the top of the side | `boardProblem` |
| Configuration | The answer side with no field | "The answer side needs at least one field — always shown or random draw." | A deck's board, at the top of the side | `boardProblem` |
| Configuration | A prompt draw count that does not fit its area | "Check how many random prompt fields each card shows." | A deck's board, at the side's "Each card shows" row | `boardProblem` |
| Configuration | An answer draw count that does not fit its area | "Check how many random answer fields each card shows." | A deck's board, at the side's "Each card shows" row | `boardProblem` |
| Configuration | An empty "Not used" area | "Every field is assigned." | The board's Not used area | `FieldAssignmentBoard`; `unassigned` |
| Configuration | Any other empty area on the board | "None yet." | The board's Always shown and Random draw areas | `FieldAssignmentBoard` |
| Practice | A named set of decks the user keeps and runs as many times as they like | "practice" | All practices; New practice; Edit practice; a practice's page; Home | — |
| Practice | One go through a practice, from its first card until it ends | "run"; "Runs" over a practice's runs | A practice's page; the run page; a completed run's page; Home | `run`; `Run`; `RunRead`; `/api/runs`; `runId` |
| Practice | The page listing every practice the user has | "All practices" | Its heading; side menu; Home's foot; the row of places | `PracticeOverviewPage`; `/practices`; `readPractices` |
| Practice | Adding a practice to the list in view | "Add practice" | All practices' header | `PracticeOverviewPage` |
| Practice | A practice's mark | a flash of lightning, drawn as an outline in the color of the words beside it; "Practice", spoken | beside every practice's name, never beside the word "practice" | `PracticeMark` |
| Practice | The page where a practice is made | "New practice" | Its heading | `/practices/new`; `PracticeCreatePage`; `PracticeCreate`; `/api/practices` |
| Practice | The page where a practice is changed | "Edit practice" | Its heading | `/practices/:practiceId/edit`; `PracticeEditPage`; `PATCH /api/practices/{practice_id}` |
| Practice | A new practice's suggested name | its decks' names in the order picked, joined by " + ", in grey inside Name, as "Commands + Ports"; a name another practice already has, with the next untaken number in parentheses, as "Ports (1)" | New practice | `suggest_practice_name`; `/api/practices/suggested-name`; `SuggestedPracticeName`; `readSuggestedPracticeName` |
| Practice | The chosen decks | "Choose decks"; "Search decks", spoken, on its search; "Decks", spoken, on the list it opens, each row a deck's name alone and "New deck…" as the last row; each picked deck beneath with its cross; "Remove <name>", spoken; "N selected", above Cancel and Create, once a deck is picked | New practice | `deck`; `deck_ids`; `DeckPicker` |
| Practice | A practice's own page | its name with its mark and its circle; each of its decks on a line; "Runs" over its runs | A practice's page | `/practices/:practiceId`; `PracticeDetailsPage`; `PracticeDetail`; `/api/practices/{practice_id}` |
| Practice | A run that can still be continued | "active"; "Active" as badge and as Home's section | A practice's page, under "Runs"; Home | `active` |
| Practice | A run that has finished | "completed"; "Completed" as badge; "Recently completed" as Home's section | A practice's page, under "Runs"; a completed run's page; Home | `completed` |
| Practice | Starting a practice's run, or continuing its active one | "Start run" while no run is active; "Continue run" while one is | A practice's page, as its main action | `startRun`; `/api/practices/{practice_id}/runs`; `active_run_id` |
| Practice | Ending a run before its last card | "End run"; "End this run?" over "The cards you have not reached stay as they are. The run shows only the cards you did." | The run page, at the right end of the progress bar's line | `POST /api/runs/{id}/end`; `end_run`; `endRun` |
| Practice | The copy of how the practice asks each deck that a run takes at start | — | — | `run_configuration`; `RunConfiguration`; `RunConfigurationRead` |
| Practice | Running a practice again | "Re-run" | A completed run's page, as its main action | `/api/runs/{run_id}/rerun`; `rerunRun`; `RerunButton` |
| Practice | A run that would have no cards | "This run would have no cards. Either the practice's decks have no cards, or every card is blank in every field one side shows." | A practice's page, after Start run; a completed run's page, after Re-run or Re-run these; Home, after a play button | `no_cards`; `NO_CARDS_MESSAGE` |
| Practice | Starting a next run while one is active | "Finish the active run first." | A completed run's page, under Re-run or Re-run these | `practice_has_active_run` |
| Practice | A practice name already taken | "A practice with this name already exists." | New practice, under Name; Edit practice, under Name | `practice_name_taken` |
| Practice | Practicing the cards the summary lists | "Re-run these" | A completed run's page, under the counts, once a count is chosen | `/api/runs/{run_id}/chosen_cards`; `RunChosenCards`; `startChosenCards`; `card_ids` |
| Practice | Deleting a practice | "Delete practice" | Edit practice | `deletePractice`; `DELETE /api/practices/{practice_id}` |
| Practice | Confirming a practice's deletion | "Delete this practice?" | Edit practice | `confirmDeleteOpen` |
| Practice | What deleting a practice takes and leaves | "Its runs will be gone. Its decks and your mastery stay as they are." | Edit practice | — |
| Run | The page a run runs on | no heading of its own; its practice named in the row of places | Run page | `/runs/:runId`; `RunPage`; `RunState`; `/api/runs/{run_id}/state`; `practice_name` |
| Run | A run's day | the day it was run, as "2026-11-03"; a later run of one day adds the next number, as "2026-11-03 (1)" | Home, in a run's block; a practice's page, under "Runs"; a completed run's page, its heading | `day`; `day_index`; `formatRunDay` |
| Run | A run's mark | a flash inside a circle, drawn as an outline in the color of the words beside it; "Run", spoken | beside a run's day on Home, under "Runs" and heading a completed run's page; never on the run page | `RunMark` |
| Run | The current card's two zones | "Prompt"; "Answer" | Run page; a card opened from the summary | `CurrentRunCard`; `prompts`; `answers`; `side` |
| Run | An answer not yet shown | "Hidden"; "Show answer" | Run page | `hidden` |
| Run | Moving to the next card | "Next card" | Run page | `current_card` |
| Run | Rating an answer | "Rate"; "Rate <field>", spoken, until the answer is rated; "<field>: <rating>", spoken, once rated, as "Command purpose: Good"; "Again"; "Hard"; "Good"; "Easy"; the page dimmed while the list is open | Run page; summary | `rating`; `RATING_TIERS`; `RatingSubmission`; `/api/run_cards/{run_card_id}/rate`; `review_log`; `RatingChip`; `Scrim` |
| Run | The user's place on the card, in the address | — | Run page | `card`; `shown`; `rating.<fieldId>` |
| Run | One go at a card | "attempt" | A card opened from the summary, as one mark per attempt | `run_card`; `RunCard`; `attempt`; `BreakdownAttempt` |
| Run | A card rated above Again on every field | "passed"; "Passed" | Run page | `passed` |
| Run | A card rated Again on a field at its last attempt | "failed"; "Failed" | Run page | `failed`; `still_failed` |
| Run | A card that comes back after Again | "Retry"; "retrying" | Run page | `retry_pending`; `pending` |
| Run | A run's progress, a wordless bar, spoken | "N passed, N failed, N retrying, N unseen" | Run page; Home | `RunProgress`; `RunProgressBar`; `passed`; `still_failed`; `retry_pending`; `unseen`; `total_cards` |
| Run | Rating a card already rated | "This card has already been rated." | Run page | `card_already_rated` |
| Run | Rating a card that is no longer current | "This is not the current card." | Run page | `not_current_card` |
| Mastery | How ready the user is to recall a card or field, from not ready to ready | a circle filled as far as the user is ready; "Mastery N%", spoken | Library; deck page; All practices; a practice's page; summary | `readiness`; `MasteryCircle`; `app/mastery/readiness.py`; `mastery_log` |
| Summary | What a run did to mastery, never named | The run's mark and its day heading it | A completed run's page | `RunBreakdownRead`; `/api/runs/{run_id}/breakdown`; `RunBreakdown`; `run_breakdown` |
| Summary | How many of its practice's cards a run reached | "N of M cards" | A completed run's page, beside the Completed badge; a practice's page, under each run; Home, in a completed run's details | `reached_cards`; `counted_cards`; `RunListing`; `total_cards`; `run_counted_card` |
| Summary | Ordering the cards | "Order by", spoken; "Order by:"; "Mastery"; "Gains"; "Drops" | A completed run's page | `OrderKey`; `order`; `mastery`; `gains`; `drops` |
| Summary | A change in mastery, one of five kinds | a badge off the circle's top-right; "up a lot", "up", "no change", "down" or "down a lot", spoken after "Mastery N%" | A completed run's page | `ChangeKind`; `change`; `delta`; `classify_change`; `ChangeBadge`; `CHANGE_WORDS` |
| Summary | How many cards had each kind of change | the number under its kind's badge, in a block when above zero; "N up a lot", "N up", "N no change", "N down" or "N down a lot", spoken | A completed run's page; Home, in a completed run's details | `kind` |
| Summary | A card opened from the summary | its name heading a sheet, its circle and badge beside it | A completed run's page | `card`; `BreakdownCard` |
| Summary | A prompt field's mark | a solid ink dot when the attempt showed it; an empty light-grey ring when it did not; "shown"; "not shown" | A card opened from the summary; the key | `PromptMark`; `shown` |
| Summary | An answer field's mark | a solid red dot for Again; a red ring with a dot for Hard; an ink ring with a dot for Good; a solid ink dot for Easy; an empty light-grey ring when the attempt did not ask it; "not asked" | A card opened from the summary; the key | `RatingMark`; `rating` |
| Summary | A field's marks, spoken | its name, then each mark in turn joined by "then", as "OS: shown, then not shown, then shown" or "Privilege needed: Easy, then not asked, then Good" | A card opened from the summary | `role="img"` |
| Summary | The key to the marks | "Key", spoken, on the "i"; "Prompt" over "shown" and "not shown"; "Answer" over "Again", "Hard", "Good", "Easy" and "not asked" | A card opened from the summary | `KeyButton`; `keyOpen` |
| Failure | The device is offline | "You're offline. Flashy will reconnect automatically." | A banner at the top of every page | `ConnectionStatus`; `offline`; `useConnectionStatus`; `ConnectionBanner` |
| Failure | Flashy cannot be reached | "Can't reach Flashy. Check your connection; retrying automatically." | A banner at the top of every page | `ConnectionStatus`; `unreachable`; `useConnectionStatus`; `/api/health`; `ConnectionBanner` |
| Failure | Flashy is having trouble | "Flashy is having trouble right now. Retrying automatically." | A banner at the top of every page | `ConnectionStatus`; `server_trouble`; `useConnectionStatus`; `/api/health`; `ConnectionBanner` |
| Failure | An action that could not reach Flashy | "Couldn't reach Flashy. Check your connection and try again." | Beside the control that failed | `failureSentence`; `CONNECTION_FAILED_MESSAGE` |
| Failure | An action Flashy had trouble with | "Flashy is having trouble right now. Try again in a moment." | Beside the control that failed | `ApiError`; `unwrap`; `failureSentence`; `SERVER_TROUBLE_MESSAGE` |
| Failure | An action while Flashy is temporarily unavailable | "Flashy is temporarily unavailable." | Not shown yet | `database_unavailable` |
| Failure | A thing that is gone | "<Thing> not found." | In place of a thing that is gone; beside the control that failed; the whole content of the page, for an address that leads to no page | `ApiError`; `unwrap`; `isNotFound`; `failureSentence`; `NotFoundPage` |
| Failure | A thing that will not load | "Could not load this <thing>."; "Could not load Home." | Edit deck; deck page; Edit card; Edit practice; a deck's board; a practice's page; run page; a completed run's page; Home; the whole content of a page that failed while it was being drawn | `isError`; `FailedPage`; `errorElement` |
| Failure | A list that will not load | "Could not load <things>." | Library; All practices; New practice | `isError` |
| Failure | Any other failed action | "Something went wrong." | Beside the control that failed | `ApiError`; `ApiDetailError`; `detail.code`; `unwrap`; `failureSentence`; `SOMETHING_WENT_WRONG` |
