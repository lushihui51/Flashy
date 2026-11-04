import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { readSubjects } from 'src/api/subject';
import { readDecks } from 'src/api/deck';
import DeckRow from 'src/components/library/DeckRow';
import SubjectIcon from 'src/components/library/SubjectIcon';
import ListRow from 'src/components/ui/ListRow';
import AddButton from 'src/components/ui/AddButton';
import Tabs from 'src/components/ui/Tabs';
import { pluralize } from 'src/lib/pluralize';
import { usePageTitle } from 'src/lib/pageTitle';
import { useViewParams } from 'src/lib/viewParams';

const TABS = ['subjects', 'decks'] as const;
type Tab = (typeof TABS)[number];

const TAB_ITEMS: { value: Tab; label: string }[] = [
  { value: 'subjects', label: 'Subjects' },
  { value: 'decks', label: 'Decks' },
];

function isTab(value: string | null): value is Tab {
  return value !== null && (TABS as readonly string[]).includes(value);
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <div className="py-8">
      <p className="text-[15px] text-(--color-aside)">{copy}</p>
    </div>
  );
}

export default function LibraryPage() {
  usePageTitle('Your library');
  const navigate = useNavigate();
  // In the URL rather than component state: a return to the library — via browser back
  // or the deck page's crumb — should restore whichever tab was open.
  const { params, setParams } = useViewParams();
  const tab: Tab = isTab(params.get('tab')) ? (params.get('tab') as Tab) : 'subjects';

  const setTab = (next: Tab) => {
    const nextParams = new URLSearchParams(params);
    if (next === 'subjects') nextParams.delete('tab');
    else nextParams.set('tab', next);
    setParams(nextParams);
  };

  const subjectsQuery = useQuery({ queryKey: ['subjects'], queryFn: readSubjects });
  const decksQuery = useQuery({ queryKey: ['decks'], queryFn: () => readDecks() });

  const subjectNameById = new Map((subjectsQuery.data ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="p-4">
      <h1 className="text-[30px] leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">Your library</h1>

      <div className="mt-4">
        <Tabs ariaLabel="Library" items={TAB_ITEMS} value={tab} onChange={setTab} />
      </div>

      {tab === 'subjects' ? (
        <section aria-label="Subjects">
          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-(--color-aside)">
              {subjectsQuery.data ? `${subjectsQuery.data.length} subjects` : 'Subjects'}
            </h2>
            <AddButton label="Add subject" onClick={() => navigate('/subjects/new')} />
          </div>
          {subjectsQuery.isError && (
            <p role="alert" className="mt-2 text-sm text-(--color-wrong)">
              Could not load subjects.
            </p>
          )}

          {subjectsQuery.data && subjectsQuery.data.length === 0 ? (
            <EmptyState copy="No subjects yet." />
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {(subjectsQuery.data ?? []).map((subject) => (
                <li key={subject.id}>
                  <ListRow
                    leading={
                      <span className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] border-[1.5px] border-(--color-ink)">
                        <SubjectIcon icon={subject.icon} className="h-[22px] w-[22px] text-(--color-ink)" />
                      </span>
                    }
                    title={subject.name}
                    subtitle={subject.description || undefined}
                    meta={pluralize(subject.deck_count, 'deck')}
                    to={`/subjects/${subject.id}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section aria-label="Decks">
          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-(--color-aside)">
              {decksQuery.data ? `${decksQuery.data.length} decks` : 'Decks'}
            </h2>
            <AddButton label="Add deck" onClick={() => navigate('/decks/new')} />
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
                  <DeckRow deck={deck} subjectName={subjectNameById.get(deck.subject_id)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
