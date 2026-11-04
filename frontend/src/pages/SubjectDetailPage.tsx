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
        <div className="mt-2 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--color-ground)">
            <SubjectIcon icon={subject.icon} className="h-6 w-6 text-(--color-ink)" />
          </span>
          <div>
            <h1 className="text-[22px] font-medium text-(--color-ink)">{subject.name}</h1>
            {subject.description && (
              <p className="text-[13px] text-(--color-ink)">{subject.description}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          // Deep-links into the overview with this subject already filtered — the filters
          // live in the URL precisely so an entry point is just the right link.
          onClick={() => navigate(`/practice?subject=${subjectId!}`)}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-(--color-main-action) text-sm font-semibold text-(--color-ink)"
        >
          <Play aria-hidden="true" className="h-4 w-4" />
          Practice
        </button>
        <button
          type="button"
          aria-label="Edit subject"
          onClick={() => navigate(`/subjects/${subjectId}/edit`)}
          className="flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-(--color-aside)">
            <Pencil aria-hidden="true" className="h-4 w-4 text-(--color-ink)" />
          </span>
        </button>
      </div>

      <div className="mt-4">
        {/* The add control sits with the collection it adds to, carrying this
            subject so the deck form opens with it preselected. */}
        <div className="flex items-center justify-between">
          <h2 className="text-[12px] font-medium text-(--color-aside)">
            {decks ? `${pluralize(decks.length, 'deck')} · ${pluralize(totalCards, 'card')}` : 'Decks'}
          </h2>
          <AddButton label="Add deck" onClick={addDeck} />
        </div>
        {decks && decks.length === 0 ? (
          // No button here — the row's above is the one add control.
          <p className="py-8 text-(--color-aside)">No decks yet.</p>
        ) : (
          <ul className="mt-1 flex flex-col divide-y divide-(--color-line) border-t border-(--color-line)">
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
