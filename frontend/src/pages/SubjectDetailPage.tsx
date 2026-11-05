import { Pencil, Play } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { readSubject } from 'src/api/subject';
import { readDecks } from 'src/api/deck';
import DeckRow from 'src/components/library/DeckRow';
import SubjectIcon from 'src/components/library/SubjectIcon';
import AddButton from 'src/components/ui/AddButton';
import Breadcrumb from 'src/components/ui/Breadcrumb';
import { pluralize } from 'src/lib/pluralize';
import { usePageTitle } from 'src/lib/pageTitle';
import { isNotFound } from 'src/api/unwrap';

export default function SubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();

  const subjectQuery = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => readSubject(subjectId!),
    enabled: !!subjectId,
  });
  const decksQuery = useQuery({
    queryKey: ['decks', subjectId],
    queryFn: () => readDecks(subjectId),
    enabled: !!subjectId,
  });
  usePageTitle(subjectQuery.data?.name);

  if (subjectQuery.isError) {
    return (
      <div className="p-4">
        {isNotFound(subjectQuery.error) ? (
          <p className="text-(--color-aside)">Subject not found.</p>
        ) : (
          <p role="alert" className="text-sm text-(--color-wrong)">
            Could not load this subject.
          </p>
        )}
      </div>
    );
  }

  const subject = subjectQuery.data;
  const decks = decksQuery.data;
  const totalCards = (decks ?? []).reduce((sum, deck) => sum + deck.card_count, 0);
  const newDeckState = subject ? { subject: { id: subject.id, name: subject.name, icon: subject.icon } } : undefined;
  const addDeck = () => navigate('/decks/new', { state: newDeckState });

  return (
    <div className="p-4">
      <Breadcrumb places={[{ label: 'Your library', to: '/library' }]} />

      {subject && (
        <>
          <div className="mt-4 flex items-center gap-3">
            <span className="tappable flex size-action shrink-0 items-center justify-center rounded-2xl bg-(--color-surface)">
              <SubjectIcon icon={subject.icon} className="size-6.5 text-(--color-ink)" />
            </span>
            <h1 className="min-w-0 break-words text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
              {subject.name}
            </h1>
          </div>
          {subject.description && (
            <p className="mt-4 text-body leading-normal font-light text-(--color-ink)">
              {subject.description}
            </p>
          )}
        </>
      )}

      <div className="mt-4 flex items-center gap-2.5">
        <button
          type="button"
          // Deep-links into the overview with this subject already filtered — the filters
          // live in the URL precisely so an entry point is just the right link.
          onClick={() => navigate(`/practice?subject=${subjectId!}`)}
          className="tappable flex h-action flex-1 items-center justify-center gap-2 rounded-2xl bg-(--color-main-action) text-action font-semibold text-(--color-ink)"
        >
          <Play aria-hidden="true" fill="currentColor" className="size-icon-sm" />
          Practice
        </button>
        <button
          type="button"
          aria-label="Edit subject"
          onClick={() => navigate(`/subjects/${subjectId}/edit`)}
          className="tappable flex size-action shrink-0 items-center justify-center rounded-2xl bg-(--color-surface)"
        >
          <Pencil aria-hidden="true" className="size-icon text-(--color-ink)" />
        </button>
      </div>

      <div className="mt-6">
        {/* The add control sits with the collection it adds to, carrying this
            subject so the deck form opens with it preselected. */}
        <div className="flex items-center justify-between">
          <h2 className="text-body font-medium text-(--color-aside)">
            {decks ? `${pluralize(decks.length, 'deck')} · ${pluralize(totalCards, 'card')}` : 'Decks'}
          </h2>
          <AddButton label="Add deck" onClick={addDeck} />
        </div>
        {decks && decks.length === 0 ? (
          // No button here — the row's above is the one add control.
          <p className="py-8 text-body text-(--color-aside)">No decks yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {(decks ?? []).map((deck) => (
              <li key={deck.id}>
                <DeckRow deck={deck} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
