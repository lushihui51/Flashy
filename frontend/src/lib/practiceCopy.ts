/** Practice sentences `failureSentence` renders by their refusal codes, kept here so a
 * screen that says one with no failed request behind it says the same words. */

/** Names both real causes of an empty practice, because the API cannot tell them apart. */
export const NO_CARDS_MESSAGE =
  'This practice would have no cards. Either the selected decks have no cards, or every card is blank in every field its configuration shows on one side.';

/** Both paths that drop a selected configuration that has been deleted — the settled
 * list lacking it, and Create's `config_not_found` — say the same thing. */
export const MISSING_CONFIGURATION_MESSAGE = 'A selected configuration no longer exists.';

/** The chosen cards' decks all lost a field their configuration used, so nothing can be asked as
 * it was practiced. */
export const NOTHING_TO_PRACTICE_MESSAGE =
  "These cards can't be practiced. A field they used has since been removed from their decks.";
