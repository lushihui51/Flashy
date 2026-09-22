import { client } from 'src/api/client';
import { unwrap } from 'src/api/unwrap';

type DeletionImpactParams = {
  subjectIds?: string[];
  deckIds?: string[];
  fieldIds?: string[];
  cardIds?: string[];
};

/** `GET /api/deletion-impact` (ADR 051): the deletion closure a delete confirm needs
 * to word its warning, reported as counts. Every param is optional and repeatable on
 * the wire (`?deck_ids=a&deck_ids=b`); the backend 422s if every one is empty. */
export const readDeletionImpact = async ({
  subjectIds,
  deckIds,
  fieldIds,
  cardIds,
}: DeletionImpactParams) =>
  unwrap(
    await client.GET('/api/deletion-impact', {
      params: {
        query: {
          ...(subjectIds ? { subject_ids: subjectIds } : {}),
          ...(deckIds ? { deck_ids: deckIds } : {}),
          ...(fieldIds ? { field_ids: fieldIds } : {}),
          ...(cardIds ? { card_ids: cardIds } : {}),
        },
      },
    }),
  );
