import { client } from 'src/api/client';
import { unwrap, unwrapVoid } from 'src/api/unwrap';
import type { components } from 'src/api/types';

/** Subject and deck narrow the run list through `practice_deck → deck → subject`;
 * `source_config_id` is attribution only and never a filter (ADR 040). */
export type PracticeRunFilters = { subjectId?: string; deckId?: string };

export const createPracticeRun = async (payload: components['schemas']['PracticeRunCreate']) =>
  unwrap(await client.POST('/api/practice_runs', { body: payload }));

export const readPracticeRuns = async (filters: PracticeRunFilters = {}) =>
  unwrap(
    await client.GET('/api/practice_runs', {
      params: {
        query: {
          ...(filters.subjectId ? { subject_id: filters.subjectId } : {}),
          ...(filters.deckId ? { deck_id: filters.deckId } : {}),
        },
      },
    }),
  );

export const readPracticeRun = async (practiceSessionId: string) =>
  unwrap(
    await client.GET('/api/practice_runs/{practice_run_id}', {
      params: { path: { practice_run_id: practiceSessionId } },
    }),
  );

export const deletePracticeRun = async (practiceSessionId: string) =>
  unwrapVoid(
    await client.DELETE('/api/practice_runs/{practice_run_id}', {
      params: { path: { practice_run_id: practiceSessionId } },
    }),
  );

export const readPracticeRunState = async (practiceSessionId: string) =>
  unwrap(
    await client.GET('/api/practice_runs/{practice_run_id}/state', {
      params: { path: { practice_run_id: practiceSessionId } },
    }),
  );

export const readPracticeRunBreakdown = async (practiceSessionId: string) =>
  unwrap(
    await client.GET('/api/practice_runs/{practice_run_id}/breakdown', {
      params: { path: { practice_run_id: practiceSessionId } },
    }),
  );

export const rerunPracticeRun = async (practiceSessionId: string, name: string) =>
  unwrap(
    await client.POST('/api/practice_runs/{practice_run_id}/rerun', {
      params: { path: { practice_run_id: practiceSessionId } },
      body: { name },
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
