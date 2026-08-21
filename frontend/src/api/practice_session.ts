import { client, displayError } from 'src/api/client';
import type { components } from 'src/api/types';

export const createPracticeSession = async (
  payload: components['schemas']['PracticeSessionCreate'],
) => {
  const { data, error } = await client.POST('/api/practice_sessions', {
    body: payload,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readPracticeSession = async (practiceSessionId: string) => {
  const { data, error } = await client.GET('/api/practice_sessions/{practice_session_id}', {
    params: { path: { practice_session_id: practiceSessionId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readCurrentPracticeCard = async (practiceSessionId: string) => {
  const { data, error } = await client.GET(
    '/api/practice_sessions/{practice_session_id}/current_card',
    {
      params: { path: { practice_session_id: practiceSessionId } },
    },
  );
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const ratePracticeCard = async (
  practiceCardId: string,
  payload: components['schemas']['RatingSubmission'],
) => {
  const { data, error } = await client.POST('/api/practice_cards/{practice_card_id}/rate', {
    params: { path: { practice_card_id: practiceCardId } },
    body: payload,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};
