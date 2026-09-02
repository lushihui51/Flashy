import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ratePracticeCard,
  readPracticeRunState,
  readPracticeSessionBreakdown,
} from 'src/api/practice_session';
import FieldValue from 'src/components/practice/FieldValue';
import RatingChip from 'src/components/practice/RatingChip';
import RunProgressBar from 'src/components/practice/RunProgressBar';
import SessionBreakdown from 'src/components/practice/SessionBreakdown';
import type { components } from 'src/api/types';

type PracticeRunState = components['schemas']['PracticeRunState'];
type CurrentRunCard = components['schemas']['CurrentRunCard'];

/** The active-session run surface (ADR 027, ADR 028, ADR 031): the current card as a
 * static two-zone reveal with rating (MD-1, MD-2, MD-4, MD-5), live progress, and a
 * retry marker (MD-3). Once `current_card` is null, nothing is pending and this page
 * shows the same completion breakdown (ADR 029, T8) the details page shows later. */
export default function PracticeRunPage() {
  const { practiceSessionId } = useParams<{ practiceSessionId: string }>();

  const runQuery = useQuery({
    queryKey: ['practice_run', practiceSessionId],
    queryFn: () => readPracticeRunState(practiceSessionId!),
    enabled: !!practiceSessionId,
  });

  return (
    <div className="flex flex-col p-4">
      <Link
        to={`/practice/${practiceSessionId}`}
        className="inline-flex items-center gap-1 text-[13px] text-(--color-text-secondary)"
      >
        <ChevronLeft aria-hidden="true" className="h-[15px] w-[15px]" />
        {/* 005 MD-2: static until the session's real name is fetched, then upgraded. */}
        {runQuery.data?.session_name ?? 'Practice session'}
      </Link>

      {runQuery.isError && (
        <p className="mt-4 text-(--color-text-muted)">Practice session not found.</p>
      )}

      {runQuery.data && (
        <>
          <div className="mt-4">
            <RunProgressBar progress={runQuery.data.progress} />
          </div>
          <PracticeRunBody practiceSessionId={practiceSessionId!} state={runQuery.data} />
        </>
      )}
    </div>
  );
}

function PracticeRunBody({
  practiceSessionId,
  state,
}: {
  practiceSessionId: string;
  state: PracticeRunState;
}) {
  if (!state.current_card) {
    return <RunCompletion practiceSessionId={practiceSessionId} />;
  }

  // Keyed by practice_card_id so "next card" (a query invalidation, not a remount of
  // this whole page) still gets fresh showAnswer/ratings state by forcing React to
  // discard and recreate this subtree rather than reusing it across cards.
  return (
    <PracticeCardView
      key={state.current_card.practice_card_id}
      practiceSessionId={practiceSessionId}
      currentCard={state.current_card}
    />
  );
}

function RunCompletion({ practiceSessionId }: { practiceSessionId: string }) {
  const breakdownQuery = useQuery({
    queryKey: ['practice_breakdown', practiceSessionId],
    queryFn: () => readPracticeSessionBreakdown(practiceSessionId),
  });

  return (
    <div className="mt-4 flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-(--color-text)">Practice complete</h2>

      {breakdownQuery.isError && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {breakdownQuery.error.message}
        </p>
      )}
      {breakdownQuery.data && <SessionBreakdown breakdown={breakdownQuery.data} />}

      <Link
        to={`/practice/${practiceSessionId}`}
        className="flex h-11 items-center justify-center rounded-full bg-(--color-primary) px-6 text-sm font-semibold text-(--color-primary-contrast)"
      >
        Done
      </Link>
    </div>
  );
}

function PracticeCardView({
  practiceSessionId,
  currentCard,
}: {
  practiceSessionId: string;
  currentCard: CurrentRunCard;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();

  const rateMutation = useMutation({
    mutationFn: () => ratePracticeCard(currentCard.practice_card_id, { ratings }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['practice_run', practiceSessionId] }),
  });

  const allRated = currentCard.answers.every((field) => field.field_def_id in ratings);

  return (
    <div className="mt-4 flex flex-col gap-4">
      {currentCard.attempt > 1 && (
        <span className="w-fit rounded-full bg-(--color-warning) px-3 py-1 text-xs font-semibold text-(--color-text)">
          Retry
        </span>
      )}

      <div className="flex flex-col gap-4 landscape:flex-row">
        <section className="space-y-3 rounded-2xl bg-(--color-surface) p-5 shadow-lg landscape:flex-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
            Prompt
          </h2>
          {currentCard.prompts.map((field) => (
            <FieldValue key={field.field_def_id} field={field} labeled />
          ))}
        </section>

        <section
          className={`space-y-3 rounded-2xl bg-(--color-surface) p-5 landscape:flex-1 ${
            showAnswer ? 'shadow-lg' : 'border-2 border-dashed border-(--color-text-muted)'
          }`}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
            Answer
          </h2>
          {currentCard.answers.map((field) =>
            showAnswer ? (
              <div key={field.field_def_id} className="flex items-start justify-between gap-3">
                <FieldValue field={field} labeled />
                <div className="mt-4 shrink-0">
                  <RatingChip
                    fieldName={field.name}
                    rating={ratings[field.field_def_id] ?? null}
                    onSelect={(rating) =>
                      setRatings((prev) => ({ ...prev, [field.field_def_id]: rating }))
                    }
                  />
                </div>
              </div>
            ) : (
              <FieldValue key={field.field_def_id} field={field} labeled hidden />
            ),
          )}
        </section>
      </div>

      {showAnswer ? (
        <>
          <button
            type="button"
            disabled={!allRated || rateMutation.isPending}
            onClick={() => rateMutation.mutate()}
            className="h-11 w-full shrink-0 rounded-full bg-(--color-primary) text-sm font-semibold text-(--color-primary-contrast) disabled:opacity-60"
          >
            Next card
          </button>
          {rateMutation.isError && (
            <p role="alert" className="text-sm text-(--color-danger)">
              {rateMutation.error.message}
            </p>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => setShowAnswer(true)}
          className="h-11 w-full shrink-0 rounded-full bg-(--color-primary) text-sm font-semibold text-(--color-primary-contrast)"
        >
          Show answer
        </button>
      )}
    </div>
  );
}
