import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ratePracticeCard,
  readPracticeRunState,
  readPracticeRunBreakdown,
} from 'src/api/practice_run';
import FieldValue from 'src/components/practice/FieldValue';
import RatingChip from 'src/components/practice/RatingChip';
import RunProgressBar from 'src/components/practice/RunProgressBar';
import RunBreakdown from 'src/components/practice/RunBreakdown';
import Breadcrumb from 'src/components/ui/Breadcrumb';
import type { components } from 'src/api/types';
import { isNotFound } from 'src/api/unwrap';
import { failureSentence } from 'src/lib/failureSentence';
import { usePageTitle } from 'src/lib/pageTitle';

type PracticeRunState = components['schemas']['PracticeRunState'];
type CurrentRunCard = components['schemas']['CurrentRunCard'];

/** The active-session run surface: the current card as a static two-zone reveal with
 * rating, live progress, and a retry marker. Once `current_card` is null, nothing is
 * pending and this page shows the same completion breakdown the details page shows
 * later. */
export default function PracticeRunPage() {
  const { practiceSessionId } = useParams<{ practiceSessionId: string }>();

  const runQuery = useQuery({
    queryKey: ['practice_run', practiceSessionId],
    queryFn: () => readPracticeRunState(practiceSessionId!),
    enabled: !!practiceSessionId,
  });
  usePageTitle(runQuery.data?.session_name);

  return (
    <div className="flex flex-col p-4">
      <Breadcrumb
        places={[
          { label: 'Practice', to: '/practice' },
          ...(runQuery.data
            ? [{ label: runQuery.data.session_name, to: `/practice/${practiceSessionId}` }]
            : []),
        ]}
      />

      {runQuery.isError &&
        (isNotFound(runQuery.error) ? (
          <p className="mt-4 text-(--color-aside)">Practice not found.</p>
        ) : (
          <p role="alert" className="mt-4 text-sm text-(--color-wrong)">
            Could not load this practice.
          </p>
        ))}

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
    queryKey: ['practice_run_breakdown', practiceSessionId],
    queryFn: () => readPracticeRunBreakdown(practiceSessionId),
  });

  return (
    <div className="mt-4 flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-(--color-ink)">Practice complete</h2>

      {breakdownQuery.isError && (
        <p role="alert" className="text-sm text-(--color-wrong)">
          {failureSentence(breakdownQuery.error, 'Practice not found.')}
        </p>
      )}
      {breakdownQuery.data && <RunBreakdown breakdown={breakdownQuery.data} />}

      <Link
        to={`/practice/${practiceSessionId}`}
        className="flex h-11 items-center justify-center rounded-full bg-(--color-main-action) px-6 text-sm font-semibold text-(--color-ink)"
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
        <span className="w-fit rounded-full bg-(--color-aside) px-3 py-1 text-xs font-semibold text-(--color-surface)">
          Retry
        </span>
      )}

      <div className="flex flex-col gap-4 landscape:flex-row">
        <section className="space-y-3 rounded-2xl bg-(--color-surface) p-5 shadow-lg landscape:flex-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-(--color-aside)">
            Prompt
          </h2>
          {currentCard.prompts.map((field) => (
            <FieldValue key={field.field_def_id} field={field} labeled />
          ))}
        </section>

        <section
          className={`space-y-3 rounded-2xl bg-(--color-surface) p-5 landscape:flex-1 ${
            showAnswer ? 'shadow-lg' : 'border-2 border-dashed border-(--color-aside)'
          }`}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-(--color-aside)">
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
            className="h-11 w-full shrink-0 rounded-full bg-(--color-main-action) text-sm font-semibold text-(--color-ink) disabled:opacity-60"
          >
            Next card
          </button>
          {rateMutation.isError && (
            <p role="alert" className="text-sm text-(--color-wrong)">
              {failureSentence(rateMutation.error, 'Practice not found.')}
            </p>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => setShowAnswer(true)}
          className="h-11 w-full shrink-0 rounded-full bg-(--color-main-action) text-sm font-semibold text-(--color-ink)"
        >
          Show answer
        </button>
      )}
    </div>
  );
}
