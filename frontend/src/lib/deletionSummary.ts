import { pluralize } from 'src/lib/pluralize';
import { joinClauses } from 'src/lib/joinClauses';
import type { components } from 'src/api/types';

type DeletionImpactRead = components['schemas']['DeletionImpactRead'];

/**
 * The one sentence behind the deck delete confirm: the cards, fields and runs the
 * deletion closure deletes, as one English list, then the practices it takes the deck
 * out of, each clause omitted when its count is 0. `cards_affected` never appears —
 * cards affected rather than deleted is the editor save confirm's concern, not this
 * one's.
 */
export function deletionSummaryText(impact: DeletionImpactRead): string {
  const deleted = [
    ...(impact.cards_deleted > 0 ? [pluralize(impact.cards_deleted, 'card')] : []),
    ...(impact.fields_deleted > 0 ? [pluralize(impact.fields_deleted, 'field')] : []),
    ...(impact.runs_deleted > 0 ? [pluralize(impact.runs_deleted, 'run')] : []),
  ];
  const takenOut =
    impact.practices_affected > 0
      ? `takes the deck out of ${pluralize(impact.practices_affected, 'practice')}`
      : null;
  if (deleted.length === 0 && takenOut === null) return "This can't be undone.";
  const deletes = deleted.length > 0 ? `deletes ${joinClauses(deleted)}` : null;
  const actions = [deletes, takenOut].filter((clause) => clause !== null).join(', and ');
  return `This also ${actions}. This can't be undone.`;
}
