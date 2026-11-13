import { useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { readDecks } from 'src/api/deck';
import { readPractices } from 'src/api/practice';
import type { components } from 'src/api/types';
import DeckPicker from 'src/components/library/DeckPicker';
import DeckLine from 'src/components/practice/DeckLine';
import AddButton from 'src/components/ui/AddButton';
import MarkedName from 'src/components/ui/MarkedName';
import MasteryCircle from 'src/components/ui/MasteryCircle';
import PracticeMark from 'src/components/ui/PracticeMark';
import { usePageTitle } from 'src/lib/pageTitle';
import { returnAddressParams } from 'src/lib/returnTo';
import { useViewParams } from 'src/lib/viewParams';

type PracticeSummary = components['schemas']['PracticeSummary'];
type DeckOption = { id: string; name: string };

/** A practice in All practices: its mark and name over its decks, with its mastery when its
 * decks hold a card, opening the practice's page. */
function PracticeRow({ practice }: { practice: PracticeSummary }) {
  return (
    <Link
      to={`/practices/${practice.id}`}
      className="flex min-w-0 items-center gap-3 py-3.25 pr-3 pl-4"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1.25">
        <span className="line-clamp-2 text-base leading-5 font-semibold break-words text-(--color-ink)">
          <MarkedName mark={<PracticeMark />} name={practice.name} />
        </span>
        <DeckLine decks={practice.decks} />
      </span>
      {practice.readiness !== null && <MasteryCircle readiness={practice.readiness} size="row" />}
    </Link>
  );
}

/** Every practice the user keeps, in the order the server sends them, narrowed to those holding
 * the deck the URL's `deck` names, each a row opening the practice's page. */
export default function PracticeOverviewPage() {
  usePageTitle('All practices');
  const { params, changeView } = useViewParams();
  const navigate = useNavigate();
  const location = useLocation();

  const filterRef = useRef<HTMLDivElement>(null);
  // The list or its empty sentence, whichever shows, so a reveal after the filter changes finds
  // where the list starts.
  const listRef = useRef<HTMLUListElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);

  const deckId = params.get('deck');

  const decksQuery = useQuery({ queryKey: ['decks'], queryFn: () => readDecks() });
  const practicesQuery = useQuery({ queryKey: ['practices'], queryFn: readPractices });

  const decks: DeckOption[] = decksQuery.data ?? [];
  const selectedDeck = decks.find((deck) => deck.id === deckId) ?? null;
  const practices = (practicesQuery.data ?? []).filter(
    (practice) => deckId === null || practice.decks.some((deck) => deck.deck_id === deckId),
  );

  const filterTargets = {
    control: () => filterRef.current?.firstElementChild ?? null,
    listStart: () => listRef.current ?? emptyRef.current,
  };
  const setDeck = (nextDeckId: string | null) => {
    const nextParams = new URLSearchParams(params);
    if (nextDeckId) nextParams.set('deck', nextDeckId);
    else nextParams.delete('deck');
    changeView(nextParams, filterTargets);
  };

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
          All practices
        </h1>
        <AddButton
          label="Add practice"
          onClick={() =>
            navigate({
              pathname: '/practices/new',
              search: returnAddressParams(location, 'cancelTo').toString(),
            })
          }
        />
      </div>

      {/* The picker's input is a form field's height wherever it stands; a filter sits 0.25rem
          shorter. */}
      <div ref={filterRef} className="mt-3.5 [&_input]:h-10.5">
        <DeckPicker<DeckOption>
          purpose="filter"
          items={decks}
          selected={selectedDeck}
          onSelect={(deck) => setDeck(deck.id)}
          clearLabel="All decks"
          onClear={() => setDeck(null)}
          placeholder="All decks"
        />
      </div>

      {practicesQuery.isError && (
        <p role="alert" className="mt-4 text-sm text-(--color-wrong)">
          Could not load practices.
        </p>
      )}

      {practicesQuery.data && practices.length === 0 && (
        <div ref={emptyRef} className="flex flex-col items-start gap-3 py-8">
          <p className="text-body text-(--color-aside)">
            {deckId !== null ? 'No practices match these filters.' : 'No practices yet.'}
          </p>
          {/* No Add practice button here: the header's is always on screen. */}
          {deckId !== null && (
            <button
              type="button"
              onClick={() => setDeck(null)}
              className="tappable-sm h-10 rounded-full bg-(--color-surface) px-3.5 text-body font-semibold text-(--color-ink)"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {practices.length > 0 && (
        <ul
          ref={listRef}
          className="tappable mt-3.5 flex flex-col divide-y divide-(--color-line) rounded-block bg-(--color-surface)"
        >
          {practices.map((practice) => (
            <li key={practice.id}>
              <PracticeRow practice={practice} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
