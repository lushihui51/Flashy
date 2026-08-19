import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readCurrentPracticeCard, ratePracticeCard } from 'src/api/practice_session';
import { readCard, readCardMastery } from 'src/api/card';
import { readFieldDefs } from 'src/api/field_def';

const RATINGS = [
  { value: 1, label: '1 · Fail' },
  { value: 2, label: '2 · Hard' },
  { value: 3, label: '3 · Good' },
  { value: 4, label: '4 · Easy' },
];

// Smoke-path UI only — see docs/cc/2026-08-19-frontend-rewrite-survey.md. practice_card.prompts/
// answers are field_def id arrays, not text, so this page has to additionally fetch
// the underlying card's values (and the deck's field names, for a readable label)
// to render anything — a real UI would probably want the API to embed that directly.
export default function PracticeRunner() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [justRatedMastery, setJustRatedMastery] = useState<{
    mastery: number;
    reviewed_field_count: number;
  } | null>(null);

  const {
    data: practiceCard,
    isPending: cardPending,
    error: cardError,
  } = useQuery({
    queryKey: ['current_card', sessionId],
    queryFn: () => readCurrentPracticeCard(sessionId),
    enabled: !!sessionId,
    retry: false,
  });

  const { data: card, isPending: cardValuesPending } = useQuery({
    queryKey: ['card', practiceCard?.card_id],
    queryFn: () => readCard(practiceCard!.card_id),
    enabled: !!practiceCard,
  });

  const { data: fields = [] } = useQuery({
    queryKey: ['fields', card?.deck_id],
    queryFn: () => readFieldDefs(card!.deck_id),
    enabled: !!card,
  });
  const fieldNameById = new Map(fields.map((f) => [f.id, f.name]));

  const rateMutation = useMutation({
    mutationFn: () => ratePracticeCard(practiceCard!.id, { ratings }),
    onSuccess: async (result) => {
      if (!result) return;
      const mastery = await readCardMastery(result.rated_practice_card.card_id);
      setJustRatedMastery(mastery ?? null);
    },
  });

  const handleNext = () => {
    setRevealed(false);
    setRatings({});
    setJustRatedMastery(null);
    queryClient.invalidateQueries({ queryKey: ['current_card', sessionId] });
  };

  if (!sessionId) return <div>Session not found</div>;

  if (cardError) {
    // The backend collapses every error into a generic message — a 404 "no pending
    // card" (session complete) looks the same as a real failure here. Noted in the
    // survey as an API-client awkwardness worth fixing in the real rewrite.
    const complete = cardError.message.toLowerCase().includes('no pending practice card');
    return (
      <div>
        <p className="text-lg font-semibold mb-4">
          {complete ? 'Session complete! 🎉' : `Error: ${cardError.message}`}
        </p>
        <button className="text-sm text-small-text cursor-pointer" onClick={() => navigate('/decks')}>
          &lt; Back to decks
        </button>
      </div>
    );
  }

  if (cardPending || cardValuesPending || !practiceCard || !card) return <div>Loading...</div>;

  const missingRatings = practiceCard.answers.some((id) => ratings[id] === undefined);

  return (
    <div className="space-y-6 max-w-xl">
      <button className="text-sm text-small-text cursor-pointer" onClick={() => navigate('/decks')}>
        &lt; Back to decks
      </button>

      <section>
        <h2 className="text-sm font-semibold text-small-text mb-2">Prompt</h2>
        {practiceCard.prompts.map((fieldId) => (
          <p key={fieldId} className="text-lg">
            <span className="text-small-text">{fieldNameById.get(fieldId) ?? fieldId}: </span>
            {card.values[fieldId]}
          </p>
        ))}
      </section>

      {!revealed && !justRatedMastery && (
        <button
          className="bg-black text-white rounded-lg px-4 py-3"
          onClick={() => setRevealed(true)}
        >
          Reveal answer
        </button>
      )}

      {revealed && !justRatedMastery && (
        <>
          <section>
            <h2 className="text-sm font-semibold text-small-text mb-2">Answer</h2>
            {practiceCard.answers.map((fieldId) => (
              <div key={fieldId} className="mb-4">
                <p className="text-lg mb-2">
                  <span className="text-small-text">{fieldNameById.get(fieldId) ?? fieldId}: </span>
                  {card.values[fieldId]}
                </p>
                <div className="flex gap-2">
                  {RATINGS.map((r) => (
                    <button
                      key={r.value}
                      className={`px-3 py-2 rounded-lg text-sm border ${
                        ratings[fieldId] === r.value
                          ? 'bg-black text-white border-black'
                          : 'border-gray-300'
                      }`}
                      onClick={() => setRatings((prev) => ({ ...prev, [fieldId]: r.value }))}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
          <button
            className="bg-black text-white rounded-lg px-4 py-3 disabled:bg-gray-400"
            disabled={missingRatings || rateMutation.isPending}
            onClick={() => rateMutation.mutate()}
          >
            Submit rating
          </button>
          {rateMutation.isError && (
            <p className="text-sm text-red-600">{rateMutation.error.message}</p>
          )}
        </>
      )}

      {justRatedMastery && (
        <section className="space-y-3">
          <p className="text-sm text-small-text">
            Card mastery: {justRatedMastery.mastery.toFixed(1)} (
            {justRatedMastery.reviewed_field_count} field
            {justRatedMastery.reviewed_field_count === 1 ? '' : 's'} reviewed)
          </p>
          <button className="bg-black text-white rounded-lg px-4 py-3" onClick={handleNext}>
            Next card
          </button>
        </section>
      )}
    </div>
  );
}
