import type { components } from 'src/api/types';
import ListRow from 'src/components/ui/ListRow';
import MasteryCircle from 'src/components/ui/MasteryCircle';
import { pluralize } from 'src/lib/pluralize';

type DeckSummary = components['schemas']['DeckSummary'];

type DeckRowProps = {
  deck: DeckSummary;
  /** The deck's subject's name, given where the list spans subjects; the row's second
   * line then opens with it. */
  subjectName?: string;
};

/** A deck in a list of decks: its name over its card and field counts, with its mastery
 * when it has a card, linking to the deck's page. */
export default function DeckRow({ deck, subjectName }: DeckRowProps) {
  const counts = `${pluralize(deck.card_count, 'card')} · ${pluralize(deck.field_names.length, 'field')}`;
  return (
    <ListRow
      title={deck.name}
      subtitle={subjectName ? `${subjectName} · ${counts}` : counts}
      trailing={
        deck.readiness !== null ? <MasteryCircle readiness={deck.readiness} size="row" /> : undefined
      }
      to={`/decks/${deck.id}`}
    />
  );
}
