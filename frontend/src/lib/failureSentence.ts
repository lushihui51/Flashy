import {
  ApiDetailError,
  ApiError,
  CONNECTION_FAILED_MESSAGE,
  SERVER_TROUBLE_MESSAGE,
} from 'src/api/unwrap';
import {
  MISSING_CONFIGURATION_MESSAGE,
  NO_CARDS_MESSAGE,
  NOTHING_TO_PRACTICE_MESSAGE,
} from 'src/lib/practiceCopy';

const SOMETHING_WENT_WRONG = 'Something went wrong.';

// `run_active` has no row: no screen reaches it, so it falls to SOMETHING_WENT_WRONG.
const SENTENCE_BY_CODE: ReadonlyMap<string, string> = new Map(
  Object.entries({
    deck_name_taken: 'A deck with this name already exists.',
    field_name_taken: 'A field with this name already exists.',
    configuration_name_taken: 'A configuration with this name already exists.',
    too_few_fields: 'A deck needs at least two fields.',
    card_already_rated: 'This card has already been rated.',
    not_current_card: 'This is not the current card.',
    no_cards: NO_CARDS_MESSAGE,
    config_not_found: MISSING_CONFIGURATION_MESSAGE,
    stale_config: 'This configuration no longer produces any prompts — edit it.',
    duplicate_deck: 'Choose one configuration per deck.',
    nothing_to_rerun:
      "This practice can't be re-run. A field it practiced has since been removed from each of its decks.",
    nothing_to_practice: NOTHING_TO_PRACTICE_MESSAGE,
    database_unavailable: 'Flashy is temporarily unavailable.',
  }),
);

/** The sentence the user reads for a failed request. `notFound` is the caller's own
 * "<Thing> not found." sentence, rendered when the response is a 404 that carries no
 * known code. Never reads the error's message. */
export function failureSentence(error: unknown, notFound: string): string {
  const sentence =
    error instanceof ApiDetailError ? SENTENCE_BY_CODE.get(error.detail.code) : undefined;
  if (sentence !== undefined) return sentence;
  // fetch rejects without an ApiError only when no response arrived.
  if (!(error instanceof ApiError)) return CONNECTION_FAILED_MESSAGE;
  if (error.status === 404) return notFound;
  if (error.status >= 500) return SERVER_TROUBLE_MESSAGE;
  return SOMETHING_WENT_WRONG;
}
