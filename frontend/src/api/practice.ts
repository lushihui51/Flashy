import { client } from 'src/api/client';
import { unwrap, unwrapVoid } from 'src/api/unwrap';
import type { components } from 'src/api/types';

export const createPractice = async (payload: components['schemas']['PracticeCreate']) =>
  unwrap(await client.POST('/api/practices', { body: payload }));

export const readPractices = async () => unwrap(await client.GET('/api/practices'));

export const readPractice = async (practiceId: string) =>
  unwrap(
    await client.GET('/api/practices/{practice_id}', {
      params: { path: { practice_id: practiceId } },
    }),
  );

export const renamePractice = async (practiceId: string, name: string) =>
  unwrap(
    await client.PATCH('/api/practices/{practice_id}', {
      params: { path: { practice_id: practiceId } },
      body: { name },
    }),
  );

/** Deletes the practice with its runs; the user's mastery stays. */
export const deletePractice = async (practiceId: string) =>
  unwrapVoid(
    await client.DELETE('/api/practices/{practice_id}', {
      params: { path: { practice_id: practiceId } },
    }),
  );

/** The name a practice of `deckIds`, in this order, takes when created with no name. */
export const readSuggestedPracticeName = async (deckIds: string[]) =>
  unwrap(
    await client.GET('/api/practices/suggested-name', {
      params: { query: { deck_ids: deckIds } },
    }),
  );

/** The practice's active run, or a new one when it has none. */
export const startRun = async (practiceId: string) =>
  unwrap(
    await client.POST('/api/practices/{practice_id}/runs', {
      params: { path: { practice_id: practiceId } },
    }),
  );
