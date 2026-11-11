import { Pencil } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { readDeck } from 'src/api/deck';
import CardList from 'src/components/library/CardList';
import AddButton from 'src/components/ui/AddButton';
import Breadcrumb from 'src/components/ui/Breadcrumb';
import DeckMark from 'src/components/ui/DeckMark';
import MasteryCircle from 'src/components/ui/MasteryCircle';
import { pluralize } from 'src/lib/pluralize';
import { usePageTitle } from 'src/lib/pageTitle';
import { returnAddressParams } from 'src/lib/returnTo';
import { isNotFound } from 'src/api/unwrap';

export default function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const deckQuery = useQuery({
    queryKey: ['deck', deckId],
    queryFn: () => readDeck(deckId!),
    enabled: !!deckId,
  });
  const deck = deckQuery.data;
  usePageTitle(deck?.name);

  if (deckQuery.isError) {
    return (
      <div className="p-4">
        {isNotFound(deckQuery.error) ? (
          <p className="text-(--color-aside)">Deck not found.</p>
        ) : (
          <p role="alert" className="text-sm text-(--color-wrong)">
            Could not load this deck.
          </p>
        )}
      </div>
    );
  }

  if (!deck) return null;

  const fieldDefs = [...deck.field_defs].sort((a, b) => a.position - b.position);
  // The heading holds the mark to the name's first letter alone, so the mark always starts the
  // first word's line and a word too long for one line still breaks inside itself.
  const [nameFirstLetter = '', ...nameRest] = Array.from(deck.name);

  const cancelToHere = returnAddressParams(location, 'cancelTo').toString();

  // Carries the deck in router state, the deck-context wiring the card form reads on arrival.
  const addCard = () =>
    navigate({ pathname: '/cards/new', search: cancelToHere }, { state: { deckId: deck.id } });

  return (
    <div className="p-4">
      <Breadcrumb places={[{ label: 'Your library', to: '/library' }]} />

      <div className="mt-3.5 flex items-center gap-3">
        <h1 className="min-w-0 flex-1 break-words text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
          <span className="whitespace-nowrap">
            <DeckMark /> {nameFirstLetter}
          </span>
          {nameRest.join('')}
        </h1>
        {deck.readiness !== null && <MasteryCircle readiness={deck.readiness} size="heading" />}
        <button
          type="button"
          aria-label="Edit deck"
          onClick={() => navigate({ pathname: `/decks/${deck.id}/edit`, search: cancelToHere })}
          className="tappable flex size-action shrink-0 items-center justify-center rounded-2xl bg-(--color-surface)"
        >
          <Pencil aria-hidden="true" className="size-icon text-(--color-ink)" />
        </button>
      </div>

      <div className="mt-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-body font-medium text-(--color-aside)">
            {pluralize(deck.cards.length, 'card')} · {pluralize(fieldDefs.length, 'field')}
          </h2>
          <AddButton label="Add card" onClick={addCard} />
        </div>
        {fieldDefs.length > 0 && deck.cards.length > 0 && (
          <div className="mt-3.5">
            <CardList
              deckName={deck.name}
              fieldDefs={fieldDefs}
              cards={deck.cards}
              cardHref={(cardId) => `/cards/${cardId}/edit?${cancelToHere}`}
            />
          </div>
        )}
        {deck.cards.length === 0 && (
          <div className="py-8">
            <p className="text-body text-(--color-aside)">No cards in this deck yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
