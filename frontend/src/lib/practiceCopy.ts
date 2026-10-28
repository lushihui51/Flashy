/** Practice sentences `failureSentence` renders by their refusal codes, kept here so a
 * screen that says one with no failed request behind it says the same words. */

/** Names both real causes of an empty practice, because the API cannot tell them apart. */
export const NO_CARDS_MESSAGE =
  'This practice would have no cards. Either the selected decks have no cards, or every card is blank in every field its configuration shows on one side.';

/** Both paths that drop a selected configuration that has been deleted — the settled
 * list lacking it, and Create's `config_not_found` — say the same thing. */
export const MISSING_CONFIGURATION_MESSAGE = 'A selected configuration no longer exists.';
