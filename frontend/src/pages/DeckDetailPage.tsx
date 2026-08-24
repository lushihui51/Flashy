import { ChevronLeft, Pencil, Play, Plus } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { readDeck } from 'src/api/deck';
import { readSubject } from 'src/api/subject';
import SubjectIcon from 'src/components/library/SubjectIcon';
import CardTable from 'src/components/library/CardTable';
import { pluralize } from 'src/lib/pluralize';

export default function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const deckQuery = useQuery({
    queryKey: ['deck', deckId],
    queryFn: () => readDeck(deckId!),
    enabled: !!deckId,
  });
  const deck = deckQuery.data;

  const subjectQuery = useQuery({
    queryKey: ['subject', deck?.subject_id],
    queryFn: () => readSubject(deck!.subject_id),
    enabled: !!deck,
  });

  if (deckQuery.isError) {
    return (
      <div className="p-4">
        <p className="text-(--color-text-muted)">Deck not found.</p>
      </div>
    );
  }

  if (!deck) return null;

  const fieldDefs = [...deck.field_defs].sort((a, b) => a.position - b.position);
  const subject = subjectQuery.data;

  return (
    <div className="p-4">
      {subject && (
        <Link
          to={`/subjects/${subject.id}`}
          className="inline-flex items-center gap-1 text-[13px] text-(--color-text-secondary)"
        >
          <ChevronLeft aria-hidden="true" className="h-[15px] w-[15px]" />
          <SubjectIcon icon={subject.icon} className="h-[15px] w-[15px]" />
          {subject.name}
        </Link>
      )}

      <h1 className="mt-1 text-[22px] font-medium text-(--color-text)">{deck.name}</h1>
      <p className="text-[13px] text-(--color-text-muted)">
        {pluralize(deck.cards.length, 'card')} · {pluralize(fieldDefs.length, 'field')}
      </p>

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
          aria-label="New card"
          onClick={() => navigate('/cards/new', { state: { deckId: deck.id } })}
          className="flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-(--color-text-muted)">
            <Plus aria-hidden="true" className="h-4 w-4 text-(--color-text)" />
          </span>
        </button>
        <button
          type="button"
          aria-label="Edit deck"
          onClick={() => navigate(`/decks/${deck.id}/edit`)}
          className="flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-(--color-text-muted)">
            <Pencil aria-hidden="true" className="h-4 w-4 text-(--color-text)" />
          </span>
        </button>
      </div>

      {/* The table (and its header row) renders whenever the deck has any active
          fields, regardless of card count — a zero-card deck still has a schema, and
          that's exactly what an empty deck has to show. The empty state is a sibling
          below it, outside CardTable's own horizontally-scrolling wrapper, so it
          stays put under the frozen first column instead of scrolling away with the
          header (2.5 §1.4). */}
      <div className="mt-4">
        {fieldDefs.length > 0 && (
          <CardTable
            deckName={deck.name}
            fieldDefs={fieldDefs}
            cards={deck.cards}
            cardHref={(cardId) => `/cards/${cardId}/edit`}
          />
        )}
        {deck.cards.length === 0 && (
          <div className="flex flex-col items-start gap-3 px-3 py-8">
            <p className="text-(--color-text-muted)">No cards in this deck yet.</p>
            <button
              type="button"
              onClick={() => navigate('/cards/new', { state: { deckId: deck.id } })}
              className="h-9 shrink-0 rounded-full bg-(--color-primary) px-3 text-sm font-semibold text-(--color-primary-contrast)"
            >
              New card
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
