import { Pencil, Play } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { readSubject } from 'src/api/subject';
import { readDecks } from 'src/api/deck';
import SubjectIcon from 'src/components/library/SubjectIcon';
import ListRow from 'src/components/ui/ListRow';
import AddButton from 'src/components/ui/AddButton';
import Breadcrumb from 'src/components/ui/Breadcrumb';
import { pluralize } from 'src/lib/pluralize';
import { usePageTitle } from 'src/lib/pageTitle';
import { isNotFound } from 'src/api/unwrap';

/** First two field names, `+N` for the rest — computed by count, not measured text,
 * so it's deterministic regardless of how the names actually render. The row carries
 * no total field count — that lives in the deck page's Cards tab toolbar. */
function formatFieldNames(names: string[]): string {
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

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
          <p className="text-(--color-text-muted)">Subject not found.</p>
        ) : (
          <p role="alert" className="text-sm text-(--color-danger)">
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
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--color-surface-elevated)">
            <SubjectIcon icon={subject.icon} className="h-6 w-6 text-(--color-text)" />
          </span>
          <div>
            <h1 className="text-[22px] font-medium text-(--color-text)">{subject.name}</h1>
            {subject.description && (
              <p className="text-[13px] text-(--color-text-secondary)">{subject.description}</p>
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
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-(--color-primary) text-sm font-semibold text-(--color-primary-contrast)"
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
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-(--color-text-muted)">
            <Pencil aria-hidden="true" className="h-4 w-4 text-(--color-text)" />
          </span>
        </button>
      </div>

      <div className="mt-4">
        {/* The add control sits with the collection it adds to, carrying this
            subject so the deck form opens with it preselected. */}
        <div className="flex items-center justify-between">
          <h2 className="text-[12px] font-medium text-(--color-text-muted)">
            {decks ? `${pluralize(decks.length, 'deck')} · ${pluralize(totalCards, 'card')}` : 'Decks'}
          </h2>
          <AddButton label="Add deck" onClick={addDeck} />
        </div>
        {decks && decks.length === 0 ? (
          // No button here — the row's above is the one add control.
          <p className="py-8 text-(--color-text-muted)">No decks yet.</p>
        ) : (
          <ul className="mt-1 flex flex-col divide-y divide-(--color-surface-elevated) border-t border-(--color-surface-elevated)">
            {(decks ?? []).map((deck) => (
              <li key={deck.id}>
                <ListRow
                  title={deck.name}
                  subtitle={
                    deck.field_names.length > 0 ? formatFieldNames(deck.field_names) : undefined
                  }
                  meta={pluralize(deck.card_count, 'card')}
                  to={`/decks/${deck.id}`}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
