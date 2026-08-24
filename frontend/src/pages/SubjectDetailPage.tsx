import { ChevronLeft, Pencil, Play, Plus } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { readSubject } from 'src/api/subject';
import { readDecks } from 'src/api/deck';
import SubjectIcon from 'src/components/library/SubjectIcon';
import ListRow from 'src/components/ui/ListRow';
import { pluralize } from 'src/lib/pluralize';

/** First two field names, `+N` for the rest — computed by count, not measured text,
 * so it's deterministic regardless of how the names actually render. The row no
 * longer states the total field count (Phase 2.7's accepted tradeoff) — that lives
 * on the deck detail page's own meta line. */
function formatFieldNames(names: string[]): string {
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

function deckMeta(cardCount: number): string {
  return cardCount === 0 ? 'No cards' : pluralize(cardCount, 'card');
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

  if (subjectQuery.isError) {
    return (
      <div className="p-4">
        <p className="text-(--color-text-muted)">Subject not found.</p>
      </div>
    );
  }

  const subject = subjectQuery.data;
  const decks = decksQuery.data;
  const totalCards = (decks ?? []).reduce((sum, deck) => sum + deck.card_count, 0);
  const newDeckState = subject ? { subject: { id: subject.id, name: subject.name, icon: subject.icon } } : undefined;

  return (
    <div className="p-4">
      <Link
        to="/library"
        className="inline-flex items-center gap-1 text-[13px] text-(--color-text-secondary)"
      >
        <ChevronLeft aria-hidden="true" className="h-[15px] w-[15px]" />
        Your library
      </Link>

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

      {decks && (
        <p className="mt-2 text-[13px] text-(--color-text-muted)">
          {pluralize(decks.length, 'deck')} · {pluralize(totalCards, 'card')}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        {/* TODO(defer:nav-targets) Practice is a no-op until practice sessions exist. */}
        <button
          type="button"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-(--color-primary) text-sm font-semibold text-(--color-primary-contrast)"
        >
          <Play aria-hidden="true" className="h-4 w-4" />
          Practice
        </button>
        <button
          type="button"
          aria-label="New deck"
          onClick={() => navigate('/decks/new', { state: newDeckState })}
          className="flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-(--color-text-muted)">
            <Plus aria-hidden="true" className="h-4 w-4 text-(--color-text)" />
          </span>
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
        {decks && decks.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-8">
            <p className="text-(--color-text-muted)">No decks in this subject yet.</p>
            <button
              type="button"
              onClick={() => navigate('/decks/new', { state: newDeckState })}
              className="h-9 shrink-0 rounded-full bg-(--color-primary) px-3 text-sm font-semibold text-(--color-primary-contrast)"
            >
              New deck
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-[12px] font-medium text-(--color-text-muted)">Decks</h2>
            <ul className="mt-1 flex flex-col divide-y divide-(--color-surface-elevated) border-t border-(--color-surface-elevated)">
              {(decks ?? []).map((deck) => (
                <li key={deck.id}>
                  <ListRow
                    title={deck.name}
                    subtitle={
                      deck.field_names.length > 0 ? formatFieldNames(deck.field_names) : undefined
                    }
                    meta={deckMeta(deck.card_count)}
                    to={`/decks/${deck.id}`}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
