import type { components } from 'src/api/types';

type CardSummaryRowProps = {
  /** Sorted by position — index 0 is the title, index 1 (if present) the subtitle. */
  fieldDefs: components['schemas']['DeckFieldDefRead'][];
  values: Record<string, string>;
};

/** A card's read-only summary: first field's value as title (or "Untitled card"),
 * second field's value as a muted subtitle if it has content. Shared between
 * DeckDetailPage (read-only list) and, later, the deck editor's card list (§4.7) —
 * doesn't fetch, takes everything as props. */
export default function CardSummaryRow({ fieldDefs, values }: CardSummaryRowProps) {
  const title = fieldDefs[0] ? values[fieldDefs[0].id] : undefined;
  const subtitle = fieldDefs[1] ? values[fieldDefs[1].id] : undefined;

  return (
    <div className="flex flex-col justify-center px-1 py-1">
      <span className="font-medium text-(--color-text)">{title || 'Untitled card'}</span>
      {subtitle && <span className="text-sm text-(--color-text-muted)">{subtitle}</span>}
    </div>
  );
}
