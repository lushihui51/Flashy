import { client } from 'src/api/client';
import { unwrap, unwrapVoid } from 'src/api/unwrap';
import type { components } from 'src/api/types';

/** Subject and deck narrow the session list through `practice_deck → deck → subject` —
 * the only relation between a session and a deck (a session has no config lineage). */
export type PracticeSessionFilters = { subjectId?: string; deckId?: string };

export const createPracticeSession = async (
  payload: components['schemas']['PracticeSessionCreate'],
) => unwrap(await client.POST('/api/practice_sessions', { body: payload }));

export const readPracticeSessions = async (filters: PracticeSessionFilters = {}) =>
  unwrap(
    await client.GET('/api/practice_sessions', {
      params: {
        query: {
          ...(filters.subjectId ? { subject_id: filters.subjectId } : {}),
          ...(filters.deckId ? { deck_id: filters.deckId } : {}),
        },
      },
    }),
  );

export const readPracticeSession = async (practiceSessionId: string) =>
  unwrap(
    await client.GET('/api/practice_sessions/{practice_session_id}', {
      params: { path: { practice_session_id: practiceSessionId } },
    }),
  );

export const deletePracticeSession = async (practiceSessionId: string) =>
  unwrapVoid(
    await client.DELETE('/api/practice_sessions/{practice_session_id}', {
      params: { path: { practice_session_id: practiceSessionId } },
    }),
  );

export const readCurrentPracticeCard = async (practiceSessionId: string) =>
  unwrap(
    await client.GET('/api/practice_sessions/{practice_session_id}/current_card', {
      params: { path: { practice_session_id: practiceSessionId } },
    }),
  );

export const ratePracticeCard = async (
  practiceCardId: string,
  payload: components['schemas']['RatingSubmission'],
) =>
  unwrap(
    await client.POST('/api/practice_cards/{practice_card_id}/rate', {
      params: { path: { practice_card_id: practiceCardId } },
      body: payload,
    }),
  );
