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
| App | The shortcut's rows | "New subject"; "New deck"; "New card"; "New practice" | Top bar's New sheet | `CreateSheet` |
| App | New card while there is no deck | "Create a deck first" | Top bar's New sheet, under "New card" | `CreateSheet` |
| App | Signing in | "Log in" | Top bar, signed out | `AuthSlot` |
| App | Signing out | "Log out" | Account sheet | `AccountSheet` |
| App | The signed-in user | "Account"; "Account menu for <name>", spoken | Top bar; Account sheet | `app_user`; `AppUser`; `AccountSheet` |
| App | Searching | "Search" | Top bar | `SearchBar` |
| App | Finishing a form that makes a new thing | "Create" | New subject; New deck; New card; New configuration; New practice | `mode="create"` |
| App | Finishing a form that changes a thing | "Save" | Edit subject; Edit deck; Edit card; Edit configuration; the save confirm | `mode="edit"` |
| App | Feedback after a save | "Saved ✓" | Edit deck | `savedFlash` |
| App | Backing out | "Cancel" | Every form and confirm | `cancelLabel` |
| App | Leaving when nothing is unsaved | "Done" | Edit deck | `showDone` |
| App | Reversing a staged change | "Undo" | Edit deck | `DeckEditor` |
| App | Accepting a warning | "Continue" | New card; New configuration | `confirmLabel` |
| App | Throwing away unsaved work | "Discard" | Every discard confirm | `ConfirmDialog` |
| App | Deleting a thing | "Delete"; "Delete <name>", spoken | Page headers; list rows; every delete confirm | `ConfirmDialog`; `/api/deletion-impact`; `DeletionImpactRead` |
| App | Changing a thing, spoken | "Edit subject"; "Edit deck"; "Edit <name>" | Subject page; deck page; New practice's rows | `navigate` |
| App | A thing's name | "Name" | Subject form; New configuration; Edit configuration; New practice | `name` |
| App | Narrowing a list | "All subjects"; "All decks"; "Clear filters" | Practice page; New practice | `PracticeFilterBar`; `subject`; `deck` |
| App | A picker holding more than it shows | "Showing N of N · type to narrow" | Every picker | `PickerCombobox`; `PICKER_MAX_ITEMS` |
| App | A list with nothing in it | "No <things> yet." | Library; subject page; deck page's Configurations tab; Practice page; New practice | `EmptyState` |
| App | A list its filters empty | "No <things> match these filters." | Practice page; New practice | `filtered` |
| App | Why leaving discards | "You have unsaved changes. Leaving now will discard them." | New subject; Edit subject; New deck; Edit deck; New card; Edit card | `confirmCancelOpen` |
| App | Deleting a thing that takes nothing else with it | "This can't be undone." | Edit card; Edit subject; Edit deck | `deletionSummaryText`; `ConfirmDialog` |
| App | Switching the deck a form is filling in | "Change deck?" | New card; New configuration | `deckChange`; `pendingDeck` |
| Places | The main places | "Home"; "Your library"; "Practice" | Side menu | `NAV_ITEMS`; `/`; `/library`; `/practice` |
| Places | The start page | "Home" | Side menu; its heading | `HomePage`; `/` |
| Places | The user's whole collection | "Your library"; "the library" | Side menu; its heading; the breadcrumb row | `LibraryPage`; `/library` |
| Places | The row above a page's heading naming the places it belongs to, widest first | "Breadcrumb", spoken; "Your library" on a subject's page; "Your library › <Subject>" on a deck's page; "Practice" on a practice's page; "Practice › <Practice>" on the run page | Subject page; deck page; practice's page; run page | `Breadcrumb`; `places` |
| Places | A thing's address, widest place first | "Subject · Deck"; "Deck · Configuration"; "Subject · Deck · Configuration" | New practice's groups and Selected rows; a practice's row; a practice's page | `SessionDeckChips`; `PracticeRunDeckSummary`; `subject_name`; `deck_name`; `configuration_name` |
| Places | A place not built yet | "Coming soon." | Home | `HomePage` |
| Library | The library's tabs | "Library", spoken; "Subjects"; "Decks" | Library | `TABS`; `tab` |
| Library | The Subjects tab's toolbar label | "N subjects"; "Subjects" while the list loads | Library | `readSubjects`; `/api/subjects` |
| Library | The Decks tab's toolbar label | "N decks"; "Decks" while the list loads | Library | `readDecks`; `/api/decks` |
| Library | Deleting a subject or deck that takes other things with it, each count present only above zero | "This also deletes N decks, N cards, N fields, N deck configurations and N practices. This can't be undone." | Edit subject; Edit deck | `deletionSummaryText`; `DeletionImpactRead`; `/api/deletion-impact` |
| Subject | A subject | "subject" | Library; subject page; forms | `subject`; `Subject`; `SubjectRead`; `SubjectSummary`; `/api/subjects`; `subjectId` |
| Subject | Adding a subject to the list in view | "Add subject" | Library's Subjects tab | `AddButton` |
| Subject | The page where a subject is made | "New subject" | Its heading; the deck form's overlay | `/subjects/new`; `SubjectForm` |
| Subject | The page where a subject is changed | "Edit subject" | Its heading | `/subjects/:subjectId/edit`; `SubjectForm` |
| Subject | Choosing a subject | "Subject"; "New subject…" as the last row | New deck; Edit deck | `PickerCombobox`; `createLabel`; `subject_id` |
| Subject | A subject's description | "Description" | Subject form; subject page | `description` |
| Subject | A subject's picture | "Icon"; the control spoken as "Icon: <picture>"; the sheet of pictures spoken as "Icon" | Subject form; library rows; subject page | `icon`; `SubjectIcon`; `SubjectIconPicker` |
| Subject | Each picture, spoken only and never shown as text | "Atom"; "Open book"; "Brain"; "Calculator"; "Camera"; "Code"; "Coins"; "DNA"; "Dumbbell"; "Flask"; "Gavel"; "Globe"; "Heart"; "Headset"; "Landmark"; "Languages"; "Leaf"; "Microscope"; "Music"; "Palette"; "Pen"; "Rocket"; "Scale"; "Theater"; "Trophy"; "Utensils" | Icon sheet; every subject icon | `ICONS`; `subjectIconName` |
| Subject | A subject counted | "N decks"; "N cards" | Library rows | `deck_count` |
| Subject | The subject page's toolbar label | "N decks · N cards"; "Decks" while the list loads | Subject page | `readDecks`; `card_count` |
| Subject | Practicing a subject's decks | "Practice" | Subject page's header | `/practice?subject=` |
| Subject | Deleting a subject | "Delete subject" | Edit subject | `deleteSubject`; `/api/subjects/{subject_id}` |
| Subject | A subject name already taken | "A subject with this name already exists." | New subject; Edit subject; the deck form's overlay | `subject_name_taken` |
| Subject | Confirming a subject's deletion | "Delete subject?" | Edit subject | `confirmDeleteOpen` |
| Subject | Leaving the subject form with unsaved changes | "Discard changes?" | New subject; Edit subject; the deck form's overlay | `confirmCancelOpen` |
| Subject | A subject's name left blank | "Name is required." | New subject; Edit subject; the deck form's overlay | `nameError` |
| Deck | A deck | "deck" | Library; subject page; deck page; forms | `deck`; `Deck`; `DeckSummary`; `DeckDetail`; `/api/decks`; `deckId` |
| Deck | A deck's name | "Deck name" | New deck; Edit deck | `name`; `DeckCreate`; `DeckBatchEdit` |
| Deck | Adding a deck to the list in view | "Add deck" | Library's Decks tab; subject page | `AddButton` |
| Deck | The page where a deck is made | "New deck" | Its heading | `/decks/new`; `DeckEditor` |
| Deck | The page where a deck is changed | "Edit deck" | Its heading | `/decks/:deckId/edit`; `DeckEditor`; `PATCH /api/decks/{deck_id}` |
| Deck | Choosing a deck | "Deck"; "New deck…" as the last row | New card; Edit card; New configuration | `PickerCombobox`; `createLabel`; `deck_id` |
| Deck | A deck counted | "N cards"; "N fields" | Library rows; subject page rows | `card_count`; `field_names` |
| Deck | A deck's row | its name, then "N cards · N fields" beneath; "<subject> · N cards · N fields" beneath in the library's Decks tab, as "Linux · 48 cards · 12 fields" | Library's Decks tab; subject page | `DeckRow` |
| Deck | The deck page's tabs | "Cards"; "Configurations"; "Deck contents", spoken | Deck page | `TABS`; `tab` |
| Deck | The Cards tab's toolbar label | "N cards · N fields" | Deck page | `cards`; `field_defs` |
| Deck | The Configurations tab's toolbar label | "N configurations"; "Configurations" while the list loads | Deck page | `readDeckPracticeConfigs` |
| Deck | Practicing a deck | "Practice" | Deck page's header | `/practice?subject=&deck=` |
| Deck | Deleting a deck | "Delete deck" | Edit deck | `deleteDeck`; `/api/decks/{deck_id}` |
| Deck | A new deck's starting fields | "Term"; "Definition" | New deck | `deckEditorReducer` |
| Deck | A deck name already taken | "A deck with this name already exists." | New deck; Edit deck | `deck_name_taken` |
| Deck | A deck saved with fewer than two fields | "A deck needs at least two fields." | New deck; Edit deck; a disabled remove button's tooltip | `too_few_fields` |
| Deck | Leaving the deck form with unsaved changes | "Discard this deck?" | New deck; Edit deck | `confirmCancelOpen` |
| Deck | Confirming a save that removes fields | "Save changes?" | Edit deck | `saveConfirm` |
| Deck | What a save that removes fields takes with it | "This removes N fields from N cards, deletes N cards, deletes N deck configurations and deletes N active practices. This can't be undone." | Edit deck | `impactSummaryText` |
| Deck | Confirming a deck's deletion | "Delete deck?" | Edit deck | `confirmDeleteOpen` |
| Deck | A deck with no cards | "No cards in this deck yet." | Deck page's Cards tab | `DeckDetailPage` |
| Field | A field | "field" | New deck; Edit deck; counts | `field_def`; `FieldDef`; `DeckFieldDefRead`; `/api/decks/{deck_id}/fields`; `/api/fields/{field_id}`; `fieldDefs` |
| Field | A deck's fields | "Fields" | New deck; Edit deck; a summary card's detail | `field_defs`; `fields` |
| Field | Adding a field to the deck | "Add field" | New deck; Edit deck | `FieldDefBatchCreate`; `FieldDefBatchOps` |
| Field | A field's inputs | "Field name"; "Field type" | New deck; Edit deck | `name`; `type` |
| Field | The one field type | "Text" | New deck; Edit deck | `FieldType`; `text` |
| Field | A field the card form cannot show | "Unsupported field type" | New card; Edit card | `image`; `audio` |
| Field | Moving a field | "Move up"; "Move down"; "Reorder <field>", spoken | New deck; Edit deck | `order`; `position`; `/api/decks/{deck_id}/fields/reorder` |
| Field | Taking a field away | "Remove <field>", spoken | New deck; Edit deck | `FieldDefBatchOps.delete` |
| Field | The field that names a card | "Primary" | New deck; Edit deck | `primary_field` |
| Field | A field deleted after a practice used it | "Removed field" | Run page; summary | `ResolvedFieldValue.removed` |
| Field | A field name already taken | "A field with this name already exists." | New deck; Edit deck | `field_name_taken` |
| Field | Two fields with one name in the deck form | "Duplicate name" | New deck; Edit deck | `isDuplicate` |
| Field | What the primary field is | "The first field identifies this card in lists and summaries." | New deck; Edit deck | `primaryIndex` |
| Field | A field's name left blank | "Name is required." | New deck; Edit deck | `FieldsSection` |
| Card | A card | "card" | Deck page; forms; run page; summary | `card`; `Card`; `CardRead`; `card_field_value`; `CardFieldValue`; `/api/cards`; `cardId` |
| Card | A deck's cards | "Cards"; "Cards in <deck>", spoken | Deck page | `CardList` |
| Card | Adding a card to the list in view | "Add card" | Deck page's Cards tab | `AddButton` |
| Card | The page where a card is made | "New card" | Its heading | `/cards/new`; `CardStandaloneForm` |
| Card | The page where a card is changed | "Edit card" | Its heading | `/cards/:cardId/edit`; `CardStandaloneForm` |
| Card | A blank value | "empty" | Deck page's Cards tab | `CardList` |
| Card | A card named in a list | its deck's first field's value alone, as "netstat" | Summary | `primary_field`; `cardTitle` |
| Card | A card whose first field is blank | "Untitled card" | Summary | `primary_field` |
| Card | Deleting a card | "Delete card" | Edit card | `deleteCard`; `/api/cards/{card_id}` |
| Card | Leaving the card form with unsaved changes | "Discard this card?" | New card; Edit card | `confirmCancelOpen` |
| Card | Why switching a card's deck clears it | "Switching decks will clear the card you were filling in." | New card | `deckChange` |
| Card | Leaving a card to make a deck | "Create a new deck?" | New card | `confirmCreateDeckOpen`; `goToCreateDeck` |
| Card | Why making a deck clears the card | "This will clear the card you were filling in." | New card | `confirmCreateDeckOpen` |
| Card | Confirming a card's deletion | "Delete card?" | Edit card | `confirmDeleteOpen` |
| Configuration | A deck's prompt and answer layout | "deck configuration"; "configuration" in deck context | Deck page; New practice; a practice's row and page | `deck_practice_config`; `DeckPracticeConfig`; `DeckPracticeConfigSummary`; `/api/deck_practice_configs`; `configId`; `config` |
| Configuration | Adding a configuration to the list in view | "Add configuration" | Deck page's Configurations tab | `AddButton` |
| Configuration | Leaving New practice to make a configuration | "New configuration…" | New practice's configuration list | `newConfiguration`; `returnTo`; `configurationId` |
| Configuration | The page where a configuration is made | "New configuration" | Its heading | `/deck-configurations/new`; `DeckConfigurationEditor` |
| Configuration | The page where a configuration is changed | "Edit configuration" | Its heading | `/deck-configurations/:configId/edit`; `DeckConfigurationEditor` |
| Configuration | A configuration's row | "N prompt fields · N answer fields · random draw" | Deck page's Configurations tab | `DeckConfigurationRow` |
| Configuration | A configuration's suggested name | its prompt fields then its answer fields, as "Word, Example +1 → Meaning" | New configuration | `defaultConfigurationName` |
| Configuration | The two halves of a card | "Prompt side"; "Answer side"; "prompt field" and "answer field" in counts | New configuration; Edit configuration; Deck page's Configurations tab | `prompt_*`; `answer_*` |
| Configuration | Fields every card shows | "Always shown"; "Prompt · always shown"; "Answer · always shown" | The board; the move sheet | `prompt_fields`; `answer_fields`; `prompt_field_ids`; `answer_field_ids`; `SLOT_LABELS` |
| Configuration | Fields drawn at random | "Random draw"; "Prompt · random draw"; "Answer · random draw" | The board; the move sheet | `prompt_pool`; `answer_pool`; `prompt_pool_ids`; `answer_pool_ids`; `SLOT_LABELS` |
| Configuration | How many random fields each card shows | "How many random prompt fields each card shows" and "How many random answer fields each card shows", spoken; "Each card shows [1] [2] … of these" | The board | `prompt_pool_counts`; `answer_pool_counts` |
| Configuration | A field left out | "Not used" | The board; the move sheet | `unassigned` |
| Configuration | Moving a field on the board | "Move "<field>" to…" | The board | `BottomSheet`; `BoardSlot` |
| Configuration | The deck's fields still loading | "Loading fields…" | New configuration; Edit configuration | `DeckConfigurationEditor` |
| Configuration | A configuration name already taken | "A configuration with this name already exists." | New configuration; Edit configuration | `configuration_name_taken` |
| Configuration | New configuration with a blank name | "Give this configuration a name to create it." | New configuration | `nameMissing` |
| Configuration | Edit configuration with a blank name | "Give this configuration a name to save it." | Edit configuration | `nameMissing` |
| Configuration | Switching the board's deck | "Fields belong to their own deck, so switching clears everything assigned here." | New configuration | `pendingDeck` |
| Configuration | The prompt side with no field | "The prompt side needs at least one field — always shown or random draw." | New configuration; Edit configuration | `boardValidationError` |
| Configuration | The answer side with no field | "The answer side needs at least one field — always shown or random draw." | New configuration; Edit configuration | `boardValidationError` |
| Configuration | A prompt draw count that does not fit its area | "Check how many random prompt fields each card shows." | New configuration; Edit configuration | `boardValidationError` |
| Configuration | An answer draw count that does not fit its area | "Check how many random answer fields each card shows." | New configuration; Edit configuration | `boardValidationError` |
| Configuration | An empty "Not used" area | "Every field is assigned." | The board's Not used area | `FieldAssignmentBoard`; `unassigned` |
| Configuration | Any other empty area on the board | "None yet." | The board's Always shown and Random draw areas | `FieldAssignmentBoard` |
| Configuration | Confirming a configuration's deletion | "Delete this configuration?" | Deck page's Configurations tab | `pendingDelete` |
| Configuration | What deleting a configuration leaves alone | "Practices that already used it are unaffected." | Deck page's Configurations tab | `pendingDelete` |
| Practice | One run of practice | "practice"; "practice" and "practiced" as the verb | Practice page; New practice; a practice's page; run page | `practice_run`; `PracticeRun`; `PracticeRunSummary`; `/api/practice_runs`; `session`; `practiceSessionId` |
| Practice | The list of practices | "Practice" | Its heading; side menu | `PracticeOverviewPage`; `/practice` |
| Practice | Adding a practice to the list in view | "Add practice" | Practice page's header | `PracticeOverviewPage` |
| Practice | The page where a practice is made | "New practice" | Its heading | `/practice/new`; `PracticeCreatePage`; `PracticeRunCreate` |
| Practice | A new practice's name | the moment the page opened, as "Aug 24, 2026, 9:00 AM" | New practice | `name`; `formatDateTime` |
| Practice | The chosen configurations | "Selected"; "N selected", beside Create; "Remove <name>", spoken | New practice | `config`; `SelectedConfigurationList`; `deck_practice_config_ids`; `selectedCount` |
| Practice | A practice's own page | its name, its date and time beneath | A practice's page | `/practice/:practiceSessionId`; `PracticeDetailsPage` |
| Practice | Narrowing practices by state | "Practice status", spoken; "All"; "Active"; "Completed" | Practice page | `RunStatus`; `status`; `StatusTab` |
| Practice | A practice that can still be continued | "active"; "Active" as badge and tab | Practice page; a practice's page | `active` |
| Practice | A practice that has finished | "completed"; "Completed" as badge and tab | Practice page; a practice's page | `completed` |
| Practice | Going on with an active practice | "Start practice" | A practice's page | `/practice/:practiceSessionId/run` |
| Practice | The copy of each configuration a practice takes at start | — | — | `practice_deck`; `PracticeDeck`; `source_config_id`; `source_config_name` |
| Practice | Running a practice again | "Re-run"; "Re-run <name>", spoken | A practice's page | `/api/practice_runs/{practice_run_id}/rerun`; `PracticeRunRerun`; `rerunPracticeRun` |
| Practice | New practice with a blank name | "Give this practice a name to create it." | New practice | `nameMissing` |
| Practice | New practice with nothing chosen | "Select at least one configuration to practice." | New practice's Selected list | `selectedCount` |
| Practice | A chosen configuration deleted since it was chosen | "A selected configuration no longer exists." | New practice | `config_not_found`; `MISSING_CONFIGURATION_MESSAGE`; `missingIds` |
| Practice | A chosen configuration that yields no prompts | "This configuration no longer produces any prompts — edit it." | New practice, against the configuration's row | `stale_config` |
| Practice | Two chosen configurations of one deck | "Choose one configuration per deck." | New practice | `duplicate_deck` |
| Practice | A practice that would have no cards | "This practice would have no cards. Either the selected decks have no cards, or every card is blank in every field its configuration shows on one side." | New practice; a practice's page, after Re-run | `no_cards` |
| Practice | The chosen configurations will not load | "Could not load your selected configurations." | New practice's Selected list | `allConfigsQuery` |
| Practice | Confirming a re-run | "Re-run this practice?" | A practice's page | `confirmRerunOpen` |
| Practice | What a re-run makes | "A new practice with the same decks is created. This practice and its reviews stay on record." | A practice's page | `confirmRerunOpen` |
| Practice | A re-run that nothing survives | "This practice can't be re-run. A field it practiced has since been removed from each of its decks." | A practice's page | `nothing_to_rerun` |
| Practice | Confirming a practice's deletion | "Delete this practice?" | Practice page; a practice's page | `confirmDeleteOpen`; `pendingDelete` |
| Practice | What deleting a practice takes and leaves | "Its progress will be gone. The decks it practiced are not affected." | Practice page; a practice's page | `confirmDeleteOpen`; `pendingDelete` |
| Run | The page a practice runs on | the practice's name | Run page | `/practice/:practiceSessionId/run`; `PracticeRunPage`; `PracticeRunState`; `/api/practice_runs/{practice_run_id}/state`; `session_name` |
| Run | The current card's two zones | "Prompt"; "Answer" | Run page | `CurrentRunCard`; `prompts`; `answers` |
| Run | An answer not yet shown | "Hidden"; "Show answer" | Run page | `hidden` |
| Run | Moving to the next card | "Next card" | Run page | `current_card` |
| Run | Leaving a finished practice | "Done" | Run page, under "Practice complete" | `/practice/:practiceSessionId` |
| Run | Rating an answer | "Rate"; "Rate <field>", spoken, until the answer is rated; "<field>: <rating>", spoken, once rated, as "Command purpose: Good"; "Again"; "Hard"; "Good"; "Easy" | Run page; summary | `rating`; `RATING_TIERS`; `RatingSubmission`; `/api/practice_cards/{practice_card_id}/rate`; `review_log`; `RatingChip` |
| Run | A missing rating | "Unrated" | Summary | `rating` |
| Run | One go at a card | "attempt"; "Attempt N of M · Passed" | Summary | `practice_card`; `PracticeCard`; `attempt`; `BreakdownAttempt` |
| Run | A card rated above Again on every field | "passed"; "Passed" | Run page; summary | `passed` |
| Run | A card rated Again on a field at its last attempt | "failed"; "Failed" | Run page; summary | `failed`; `still_failed` |
| Run | A card that comes back after Again | "Retry"; "retrying" | Run page | `retry_pending`; `pending` |
| Run | The practice's progress, a wordless bar, spoken | "N passed, N failed, N retrying, N unseen" | Run page | `RunProgress`; `RunProgressBar`; `passed`; `still_failed`; `retry_pending`; `unseen`; `total_cards` |
| Run | Rating a card already rated | "This card has already been rated." | Run page | `card_already_rated` |
| Run | Rating a card that is no longer current | "This is not the current card." | Run page | `not_current_card` |
| Summary | What a practice did to mastery, never named | "Practice complete" heading it on the run page | Run page; a practice's page | `PracticeRunBreakdown`; `/api/practice_runs/{practice_run_id}/breakdown`; `RunBreakdown`; `practice_run_breakdown` |
| Summary | How many cards were practiced | "N cards practiced" | Run page; a practice's page | `total_cards` |
| Summary | Sorting the cards | "Sort", spoken; "Gains first"; "Drops first"; "Mastery" | Run page; a practice's page | `SortKey`; `gains`; `drops`; `mastery` |
| Summary | How well a card or field is known | "Mastery"; a whole number; "—" when never reviewed | Summary | `mastery`; `CardMasteryRead`; `mastery_log`; `/api/cards/{card_id}/mastery` |
| Summary | A change in mastery | "+N"; "−N"; "±0" | Summary | `delta`; `FieldMasteryDelta` |
| Summary | A card's outcome | "First try"; "One retry"; "2+ retries"; "Failed" | Summary | `BreakdownBucket`; `passed_first_try`; `passed_after_one_fail`; `passed_after_many_fails`; `still_failed` |
| Failure | The device is offline | "You're offline. Flashy will reconnect automatically." | A banner at the top of every page | `ConnectionStatus`; `offline`; `useConnectionStatus`; `ConnectionBanner` |
| Failure | Flashy cannot be reached | "Can't reach Flashy. Check your connection; retrying automatically." | A banner at the top of every page | `ConnectionStatus`; `unreachable`; `useConnectionStatus`; `/api/health`; `ConnectionBanner` |
| Failure | Flashy is having trouble | "Flashy is having trouble right now. Retrying automatically." | A banner at the top of every page | `ConnectionStatus`; `server_trouble`; `useConnectionStatus`; `/api/health`; `ConnectionBanner` |
| Failure | An action that could not reach Flashy | "Couldn't reach Flashy. Check your connection and try again." | Beside the control that failed | `failureSentence`; `CONNECTION_FAILED_MESSAGE` |
| Failure | An action Flashy had trouble with | "Flashy is having trouble right now. Try again in a moment." | Beside the control that failed | `ApiError`; `unwrap`; `failureSentence`; `SERVER_TROUBLE_MESSAGE` |
| Failure | An action while Flashy is temporarily unavailable | "Flashy is temporarily unavailable." | Not shown yet | `database_unavailable` |
| Failure | A thing that is gone | "<Thing> not found." | In place of a thing that is gone; beside the control that failed | `ApiError`; `unwrap`; `isNotFound`; `failureSentence` |
| Failure | A thing that will not load | "Could not load this <thing>." | Edit subject; subject page; Edit deck; deck page; Edit card; Edit configuration; a practice's page; run page | `isError` |
| Failure | A list that will not load | "Could not load <things>." | Library; deck page's Configurations tab; Practice page; New practice | `isError` |
| Failure | Any other failed action | "Something went wrong." | Beside the control that failed | `ApiError`; `ApiDetailError`; `detail.code`; `unwrap`; `failureSentence`; `SOMETHING_WENT_WRONG` |
