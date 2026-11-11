import { client } from 'src/api/client';
import { unwrap } from 'src/api/unwrap';
import type { components } from 'src/api/types';

export const readRun = async (runId: string) =>
  unwrap(await client.GET('/api/runs/{run_id}', { params: { path: { run_id: runId } } }));

export const readRunState = async (runId: string) =>
  unwrap(
    await client.GET('/api/runs/{run_id}/state', { params: { path: { run_id: runId } } }),
  );

export const readRunBreakdown = async (runId: string) =>
  unwrap(
    await client.GET('/api/runs/{run_id}/breakdown', { params: { path: { run_id: runId } } }),
  );

/** A new run of the completed run's whole practice. */
export const rerunRun = async (runId: string) =>
  unwrap(
    await client.POST('/api/runs/{run_id}/rerun', { params: { path: { run_id: runId } } }),
  );

/** A new run of exactly `cardIds`, each a card of the completed run. */
export const startChosenCards = async (runId: string, cardIds: string[]) =>
  unwrap(
    await client.POST('/api/runs/{run_id}/chosen_cards', {
      params: { path: { run_id: runId } },
      body: { card_ids: cardIds },
    }),
  );

export const rateRunCard = async (
  runCardId: string,
  ratings: components['schemas']['RatingSubmission']['ratings'],
) =>
  unwrap(
    await client.POST('/api/run_cards/{run_card_id}/rate', {
      params: { path: { run_card_id: runCardId } },
      body: { ratings },
    }),
  );
