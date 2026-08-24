import { client } from 'src/api/client';
import { unwrap } from 'src/api/unwrap';
import type { components } from 'src/api/types';

export const createPracticeSession = async (
  payload: components['schemas']['PracticeSessionCreate'],
) => unwrap(await client.POST('/api/practice_sessions', { body: payload }));

export const readPracticeSession = async (practiceSessionId: string) =>
  unwrap(
    await client.GET('/api/practice_sessions/{practice_session_id}', {
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
