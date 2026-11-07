import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ratePracticeCard,
  readPracticeRunState,
  readPracticeRunBreakdown,
} from 'src/api/practice_run';
import FieldValue from 'src/components/practice/FieldValue';
import RatingChip from 'src/components/practice/RatingChip';
import RerunButton from 'src/components/practice/RerunButton';
import RunProgressBar from 'src/components/practice/RunProgressBar';
import RunBreakdown from 'src/components/practice/RunBreakdown';
import Breadcrumb from 'src/components/ui/Breadcrumb';
import type { components } from 'src/api/types';
import { isNotFound } from 'src/api/unwrap';
import { CHANGE_KINDS } from 'src/lib/changeKinds';
import { failureSentence } from 'src/lib/failureSentence';
import { usePageTitle } from 'src/lib/pageTitle';
import { returnAddressParams } from 'src/lib/returnTo';
import { useViewParams } from 'src/lib/viewParams';

type PracticeRunState = components['schemas']['PracticeRunState'];
type CurrentRunCard = components['schemas']['CurrentRunCard'];

const ZONE_CLASS = 'tappable rounded-block bg-(--color-surface) px-4.5 landscape:flex-1';
const ZONE_HEADING_CLASS =
  'flex h-10.5 items-center ruled-bottom text-sm font-semibold text-(--color-ink)';
const ZONE_ROW_CLASS = 'pt-3.5 pb-4 last:pb-4.5';
const CARD_ACTION_CLASS = 'h-13.5 flex-1 rounded-2xl text-action font-semibold';

const RATING_PARAM_PREFIX = 'rating.';

/** `params` less the user's place on the card: `card`, `shown` and every `rating.` key. */
function withoutCardPlace(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete('card');
  next.delete('shown');
  for (const key of Array.from(next.keys())) {
    if (key.startsWith(RATING_PARAM_PREFIX)) next.delete(key);
  }
  return next;
}

/** The rating `params` holds for `fieldDefId`, 1 to 4; undefined when absent or not one. */
function ratingParam(params: URLSearchParams, fieldDefId: string): number | undefined {
  const value = Number(params.get(`${RATING_PARAM_PREFIX}${fieldDefId}`));
  return Number.isInteger(value) && value >= 1 && value <= 4 ? value : undefined;
}

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
    return <RunCompletion practiceSessionId={practiceSessionId} sessionName={state.session_name} />;
  }

  // Keyed by practice_card_id so a new card, which arrives by a query invalidation and not
  // a remount of this page, starts with no rating request pending or failed.
  return (
    <PracticeCardView
      key={state.current_card.practice_card_id}
      practiceSessionId={practiceSessionId}
      currentCard={state.current_card}
    />
  );
}

function RunCompletion({
  practiceSessionId,
  sessionName,
}: {
  practiceSessionId: string;
  sessionName: string;
}) {
  const { params } = useViewParams();
  const [rerunError, setRerunError] = useState('');
  const breakdownQuery = useQuery({
    queryKey: ['practice_run_breakdown', practiceSessionId],
    queryFn: () => readPracticeRunBreakdown(practiceSessionId),
  });

  const totalCards = breakdownQuery.data?.total_cards;
  const requestedKinds = params.getAll('kind');
  const countChosen = CHANGE_KINDS.some((kind) => requestedKinds.includes(kind));

  return (
    <div className="mt-3.5 flex flex-col gap-3.5">
      <div>
        <h1 className="text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
          Practice complete
        </h1>
        {totalCards !== undefined && (
          <p className="mt-1.5 text-body font-medium text-(--color-aside)">
            {totalCards} card{totalCards === 1 ? '' : 's'} practiced
          </p>
        )}
      </div>

      <div className="flex gap-2.5">
        <Link
          to={`/practice/${practiceSessionId}`}
          className={`tappable flex h-action flex-1 items-center justify-center rounded-2xl px-6 text-action font-semibold text-(--color-ink) ${
            countChosen ? 'bg-(--color-surface)' : 'bg-(--color-main-action)'
          }`}
        >
          Done
        </Link>
        <RerunButton
          session={{ id: practiceSessionId, name: sessionName }}
          look="text"
          onError={setRerunError}
        />
      </div>
      {rerunError && (
        <p role="alert" className="text-sm text-(--color-wrong)">
          {rerunError}
        </p>
      )}

      {breakdownQuery.isError && (
        <p role="alert" className="text-sm text-(--color-wrong)">
          {failureSentence(breakdownQuery.error, 'Practice not found.')}
        </p>
      )}
      {breakdownQuery.data && (
        <RunBreakdown breakdown={breakdownQuery.data} practiceSessionId={practiceSessionId} />
      )}
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
  const { params, setParams } = useViewParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // The place in the URL belongs to this card only when tagged with it; one left by an
  // earlier card reads as nothing.
  const placeIsThisCard = params.get('card') === currentCard.practice_card_id;
  const showAnswer = placeIsThisCard && params.get('shown') === '1';
  const ratings: Record<string, number> = {};
  if (placeIsThisCard) {
    for (const field of currentCard.answers) {
      const rating = ratingParam(params, field.field_def_id);
      if (rating !== undefined) ratings[field.field_def_id] = rating;
    }
  }

  const rateMutation = useMutation({
    mutationFn: () => ratePracticeCard(currentCard.practice_card_id, { ratings }),
    onSuccess: async () => {
      // The next card first, so this one keeps its answers and ratings on screen until it
      // is replaced; then the place goes, so nothing carries to the next card.
      await queryClient.invalidateQueries({ queryKey: ['practice_run', practiceSessionId] });
      setParams(withoutCardPlace(params));
    },
  });

  const allRated = currentCard.answers.every((field) => field.field_def_id in ratings);
  const canSubmit = allRated && !rateMutation.isPending;

  const showAnswers = () => {
    const next = withoutCardPlace(params);
    next.set('card', currentCard.practice_card_id);
    next.set('shown', '1');
    setParams(next);
  };

  const rate = (fieldDefId: string, rating: number) => {
    const next = new URLSearchParams(params);
    next.set(`${RATING_PARAM_PREFIX}${fieldDefId}`, String(rating));
    setParams(next);
  };

  const editCard = () => {
    if (!showAnswer) return;
    navigate({
      pathname: `/cards/${currentCard.card_id}/edit`,
      search: returnAddressParams(location, 'cancelTo', 'returnTo').toString(),
    });
  };

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
                      onSelect={(rating) => rate(field.field_def_id, rating)}
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

      <div className="mt-2 flex gap-2.5">
        <button
          type="button"
          aria-disabled={!showAnswer || undefined}
          onClick={editCard}
          className="tappable flex h-13.5 shrink-0 items-center gap-2 rounded-2xl bg-(--color-surface) px-4 text-base font-semibold text-(--color-ink) aria-disabled:border-(--color-line) aria-disabled:bg-(--color-surface) aria-disabled:text-(--color-aside) aria-disabled:[box-shadow:none]"
        >
          <Pencil aria-hidden="true" className="size-4" />
          Edit card
        </button>
        {showAnswer ? (
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
        ) : (
          <button
            type="button"
            onClick={showAnswers}
            className={`tappable bg-(--color-main-action) text-(--color-ink) ${CARD_ACTION_CLASS}`}
          >
            Show answer
          </button>
        )}
      </div>
      {rateMutation.isError && (
        <p role="alert" className="text-sm text-(--color-wrong)">
          {failureSentence(rateMutation.error, 'Practice not found.')}
        </p>
      )}
    </div>
  );
}
