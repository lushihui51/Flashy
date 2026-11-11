import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { readPractices } from 'src/api/practice';
import DeckChips from 'src/components/practice/DeckChips';
import AddButton from 'src/components/ui/AddButton';
import { usePageTitle } from 'src/lib/pageTitle';
import { returnAddressParams } from 'src/lib/returnTo';

/** Every practice the user keeps, in the order the server sends them, each a row opening
 * the practice's page. */
export default function PracticeOverviewPage() {
  usePageTitle('Practice');
  const navigate = useNavigate();
  const location = useLocation();

  const practicesQuery = useQuery({ queryKey: ['practices'], queryFn: readPractices });
  const practices = practicesQuery.data ?? [];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
          Practice
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

      {practicesQuery.isError && (
        <p role="alert" className="mt-4 text-sm text-(--color-wrong)">
          Could not load practices.
        </p>
      )}

      {practicesQuery.data && practices.length === 0 && (
        <p className="py-8 text-body text-(--color-aside)">No practices yet.</p>
      )}

      {practices.length > 0 && (
        <ul className="tappable mt-3.5 flex flex-col divide-y divide-(--color-line) rounded-block bg-(--color-surface)">
          {practices.map((practice) => (
            <li key={practice.id}>
              <Link
                to={`/practices/${practice.id}`}
                className="flex min-w-0 flex-col gap-1 py-3 pr-3 pl-4"
              >
                <span className="truncate text-body leading-5 font-semibold text-(--color-ink)">
                  {practice.name}
                </span>
                <span className="flex flex-wrap items-center gap-x-2">
                  <DeckChips decks={practice.decks} variant="summary" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
