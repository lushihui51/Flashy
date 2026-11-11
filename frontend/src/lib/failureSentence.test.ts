import { describe, expect, it } from 'vitest';
import {
  ApiDetailError,
  ApiError,
  CONNECTION_FAILED_MESSAGE,
  SERVER_TROUBLE_MESSAGE,
  unwrap,
} from 'src/api/unwrap';
import { failureSentence } from 'src/lib/failureSentence';
import {
  MISSING_CONFIGURATION_MESSAGE,
  NO_CARDS_MESSAGE,
  NOTHING_TO_PRACTICE_MESSAGE,
} from 'src/lib/practiceCopy';

const NOT_FOUND = 'Deck not found.';

const detailError = (status: number, code: string, message = 'developer text') =>
  new ApiDetailError(status, { code, message });

function thrownBy(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

describe('failureSentence', () => {
  it("renders each known code's sentence, whatever the status", () => {
    const sentences: Record<string, string> = {
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
    };
    expect(Object.keys(sentences)).toHaveLength(13);

    for (const [code, sentence] of Object.entries(sentences)) {
      for (const status of [400, 404, 409, 422, 500, 503]) {
        expect(failureSentence(detailError(status, code), NOT_FOUND)).toBe(sentence);
      }
    }
  });

  it('reads nothing_to_practice as the sentence drawn for it', () => {
    expect(failureSentence(detailError(400, 'nothing_to_practice'), NOT_FOUND)).toBe(
      "These cards can't be practiced. A field they used has since been removed from their decks.",
    );
  });

  it('a known code wins over a 404', () => {
    expect(failureSentence(detailError(404, 'config_not_found'), NOT_FOUND)).toBe(
      MISSING_CONFIGURATION_MESSAGE,
    );
  });

  it("a 404 without a known code renders the caller's not-found sentence", () => {
    expect(failureSentence(new ApiError(404, 'Deck not found'), NOT_FOUND)).toBe(NOT_FOUND);
    expect(failureSentence(detailError(404, 'deck_gone'), NOT_FOUND)).toBe(NOT_FOUND);
  });

  it('a 5xx without a known code renders the server-trouble sentence, and database_unavailable its own', () => {
    expect(failureSentence(new ApiError(500, 'Internal Server Error'), NOT_FOUND)).toBe(
      SERVER_TROUBLE_MESSAGE,
    );
    expect(failureSentence(new ApiError(502, ''), NOT_FOUND)).toBe(SERVER_TROUBLE_MESSAGE);
    expect(failureSentence(detailError(503, 'unknown_outage'), NOT_FOUND)).toBe(
      SERVER_TROUBLE_MESSAGE,
    );
    expect(failureSentence(detailError(503, 'database_unavailable'), NOT_FOUND)).toBe(
      'Flashy is temporarily unavailable.',
    );
  });

  it('an error that is not an ApiError renders the connection sentence', () => {
    expect(failureSentence(new TypeError('Failed to fetch'), NOT_FOUND)).toBe(
      CONNECTION_FAILED_MESSAGE,
    );
    expect(failureSentence(undefined, NOT_FOUND)).toBe(CONNECTION_FAILED_MESSAGE);
  });

  it('a string detail, a validation array and an unknown code render Something went wrong', () => {
    const res = (status: number) => new Response(null, { status });
    const stringDetail = thrownBy(() =>
      unwrap({ error: { detail: 'Card has no values' }, response: res(400) }),
    );
    const validationArray = thrownBy(() =>
      unwrap({
        error: { detail: [{ loc: ['body', 'name'], msg: 'Field required', type: 'missing' }] },
        response: res(422),
      }),
    );

    expect(failureSentence(stringDetail, NOT_FOUND)).toBe('Something went wrong.');
    expect(failureSentence(validationArray, NOT_FOUND)).toBe('Something went wrong.');
    expect(failureSentence(detailError(409, 'run_active'), NOT_FOUND)).toBe(
      'Something went wrong.',
    );
  });

  it('never reads the message', () => {
    expect(failureSentence(detailError(422, 'deck_name_taken', 'xyz'), NOT_FOUND)).toBe(
      'A deck with this name already exists.',
    );
    expect(failureSentence(detailError(409, 'run_active', 'xyz'), NOT_FOUND)).not.toContain('xyz');
    expect(failureSentence(new ApiError(400, 'xyz'), NOT_FOUND)).not.toContain('xyz');
  });
});
