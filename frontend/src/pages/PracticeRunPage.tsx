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

const ZONE_CLASS = 'tappable rounded-block bg-(--color-surface) px-4.5 landscape:flex-1';
const ZONE_HEADING_CLASS =
  'flex h-10.5 items-center ruled-bottom text-sm font-semibold text-(--color-ink)';
const ZONE_ROW_CLASS = 'pt-3.5 pb-4 last:pb-4.5';
const CARD_ACTION_CLASS = 'mt-2 h-13.5 w-full shrink-0 rounded-2xl text-action font-semibold';

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
      <h2 className="text-title font-bold text-(--color-ink)">Practice complete</h2>

      {breakdownQuery.isError && (
        <p role="alert" className="text-sm text-(--color-wrong)">
          {failureSentence(breakdownQuery.error, 'Practice not found.')}
        </p>
      )}
      {breakdownQuery.data && <RunBreakdown breakdown={breakdownQuery.data} />}

      <Link
        to={`/practice/${practiceSessionId}`}
        className="tappable flex h-action items-center justify-center rounded-2xl bg-(--color-main-action) px-6 text-action font-semibold text-(--color-ink)"
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
  const canSubmit = allRated && !rateMutation.isPending;

  return (
    <div className="mt-3.5 flex flex-col gap-3.5">
      {currentCard.attempt > 1 && (
        <span className="w-fit rounded-tight bg-(--color-aside) px-badge-x py-badge-y text-xs font-semibold text-(--color-surface)">
          Retry
        </span>
      )}

      <div className="flex flex-col gap-3.5 landscape:flex-row">
        <section className={ZONE_CLASS}>
          <h2 className={ZONE_HEADING_CLASS}>Prompt</h2>
          <div className="divide-y divide-(--color-line)">
            {currentCard.prompts.map((field) => (
              <div key={field.field_def_id} className={ZONE_ROW_CLASS}>
                <FieldValue field={field} labeled zone="prompt" />
              </div>
            ))}
          </div>
        </section>

        <section className={ZONE_CLASS}>
          <h2 className={ZONE_HEADING_CLASS}>Answer</h2>
          <div className="divide-y divide-(--color-line)">
            {currentCard.answers.map((field) =>
              showAnswer ? (
                <div
                  key={field.field_def_id}
                  className={`flex items-end justify-between gap-3 ${ZONE_ROW_CLASS}`}
                >
                  <FieldValue field={field} labeled zone="answer" />
                  <div className="shrink-0">
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
                <div key={field.field_def_id} className={ZONE_ROW_CLASS}>
                  <FieldValue field={field} labeled hidden zone="answer" />
                </div>
              ),
            )}
          </div>
        </section>
      </div>

      {showAnswer ? (
        <>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => rateMutation.mutate()}
            className={`${CARD_ACTION_CLASS} ${
              canSubmit
                ? 'tappable bg-(--color-main-action) text-(--color-ink)'
                : 'outlined-line bg-(--color-surface) text-(--color-aside)'
            }`}
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
          className={`tappable bg-(--color-main-action) text-(--color-ink) ${CARD_ACTION_CLASS}`}
        >
          Show answer
        </button>
      )}
    </div>
  );
}
