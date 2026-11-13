import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { readDecks } from 'src/api/deck';
import DeckRow from 'src/components/library/DeckRow';
import AddButton from 'src/components/ui/AddButton';
import { usePageTitle } from 'src/lib/pageTitle';
import { returnAddressParams } from 'src/lib/returnTo';

function EmptyState({ copy }: { copy: string }) {
  return (
    <div className="py-8">
      <p className="text-body text-(--color-aside)">{copy}</p>
    </div>
  );
}

export default function LibraryPage() {
  usePageTitle('Your library');
  const navigate = useNavigate();
  const location = useLocation();
  const decksQuery = useQuery({ queryKey: ['decks'], queryFn: () => readDecks() });

  return (
    <div className="p-4">
      <h1 className="text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
        Your library
      </h1>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-body font-medium text-(--color-aside)">
          {decksQuery.data ? `${decksQuery.data.length} decks` : 'Decks'}
        </h2>
        <AddButton
          label="Add deck"
          onClick={() =>
            navigate({
              pathname: '/decks/new',
              search: returnAddressParams(location, 'cancelTo').toString(),
            })
          }
        />
      </div>
      {decksQuery.isError && (
        <p role="alert" className="mt-2 text-sm text-(--color-wrong)">
          Could not load decks.
        </p>
      )}

      {decksQuery.data && decksQuery.data.length === 0 ? (
        <EmptyState copy="No decks yet." />
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {(decksQuery.data ?? []).map((deck) => (
            <li key={deck.id}>
              <DeckRow deck={deck} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
