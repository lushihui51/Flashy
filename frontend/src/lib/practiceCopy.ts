/** User-facing practice copy that more than one page renders, kept here so the two
 * surfaces never drift apart. ADR 056: the backend refuses an empty practice with a
 * bare code, and the sentence a user reads belongs to the frontend. It names both
 * real causes because the API cannot tell them apart. */
export const NO_CARDS_MESSAGE =
  'This practice would have no cards. Either the selected decks have no cards, or every card is blank in every field its configuration shows on one side.';

/** Task 019 MD-4: both paths that drop a selected configuration which no longer exists
 * — the settled list lacking it, and Create's `config_not_found` — say the same thing. */
export const MISSING_CONFIGURATION_MESSAGE = 'A selected configuration no longer exists.';
