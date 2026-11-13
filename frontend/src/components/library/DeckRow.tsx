import type { components } from 'src/api/types';
import DeckMark from 'src/components/ui/DeckMark';
import ListRow from 'src/components/ui/ListRow';
import MarkedName from 'src/components/ui/MarkedName';
import MasteryCircle from 'src/components/ui/MasteryCircle';
import { pluralize } from 'src/lib/pluralize';

type DeckSummary = components['schemas']['DeckSummary'];

/** A deck in a list of decks: its mark and name over its card and field counts, with its
 * mastery when it has a card, linking to the deck's page. */
export default function DeckRow({ deck }: { deck: DeckSummary }) {
  return (
    <ListRow
      title={<MarkedName mark={<DeckMark />} name={deck.name} />}
      subtitle={`${pluralize(deck.card_count, 'card')} · ${pluralize(deck.field_names.length, 'field')}`}
      trailing={
        deck.readiness !== null ? (
          <MasteryCircle readiness={deck.readiness} size="row" />
        ) : undefined
      }
      to={`/decks/${deck.id}`}
    />
  );
}
