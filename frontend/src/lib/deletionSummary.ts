import { pluralize } from 'src/lib/pluralize';
import { joinClauses } from 'src/lib/joinClauses';
import type { components } from 'src/api/types';

type DeletionImpactRead = components['schemas']['DeletionImpactRead'];

/**
 * The one sentence behind the deck and subject delete confirms (ADR 048, ADR 051,
 * task 013 MD-3): everything the deletion closure also takes, beyond the entity the
 * user asked to delete, as one English list — decks, cards, fields, deck
 * configurations, then practices, each clause omitted when its count is 0.
 * `subjects_deleted` never appears (a subject delete confirm names *its* decks and
 * below, not itself) and neither does `cards_affected` — cards affected rather than
 * deleted is the editor save confirm's concern (task 013 MD-2), not this one's.
 */
export function deletionSummaryText(impact: DeletionImpactRead): string {
  const clauses = [
    ...(impact.decks_deleted > 0 ? [pluralize(impact.decks_deleted, 'deck')] : []),
    ...(impact.cards_deleted > 0 ? [pluralize(impact.cards_deleted, 'card')] : []),
    ...(impact.fields_deleted > 0 ? [pluralize(impact.fields_deleted, 'field')] : []),
    ...(impact.configurations_deleted > 0
      ? [pluralize(impact.configurations_deleted, 'deck configuration')]
      : []),
    ...(impact.runs_deleted > 0 ? [pluralize(impact.runs_deleted, 'practice')] : []),
  ];
  if (clauses.length === 0) return "This can't be undone.";
  return `This also deletes ${joinClauses(clauses)}. This can't be undone.`;
}
