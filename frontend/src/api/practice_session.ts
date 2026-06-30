import { client, displayError } from "src/api/client";
import type { components } from "src/api/types";

export const createPracticeSession = async (
  payload: components["schemas"]["PracticeSessionCreate"],
) => {
  const { data, error } = await client.POST(
    "/api/practice_sessions/practice_session",
    {
      body: payload,
    },
  );
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readPracticeSession = async (practiceSessionId: string) => {
  const { data, error } = await client.GET(
    "/api/practice_sessions/practice_session/{practice_session_id}",
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

export const readPracticeCard = async (
  practiceSessionId: string,
  forward: boolean,
) => {
  const { data, error } = await client.GET(
    "/api/practice_sessions/practice_session/{practice_session_id}/practice_card",
    {
      params: {
        path: { practice_session_id: practiceSessionId },
        query: { forward: forward },
      },
    },
  );
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};
