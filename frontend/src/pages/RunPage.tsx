import { useState } from 'react';
import { ChevronRight, Pencil } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { endRun, rateRunCard, readRun, readRunBreakdown, readRunState } from 'src/api/run';
import FieldValue from 'src/components/run/FieldValue';
import RatingChip from 'src/components/run/RatingChip';
import RerunButton from 'src/components/run/RerunButton';
import RunProgressBar from 'src/components/run/RunProgressBar';
import RunBreakdown from 'src/components/run/RunBreakdown';
import RunStatusBadge from 'src/components/run/RunStatusBadge';
import Breadcrumb from 'src/components/ui/Breadcrumb';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import DeckMark from 'src/components/ui/DeckMark';
import PracticeMark from 'src/components/ui/PracticeMark';
import RunMark from 'src/components/ui/RunMark';
import type { components } from 'src/api/types';
import { isNotFound } from 'src/api/unwrap';
import { formatRunDay } from 'src/lib/datetime';
import { failureSentence } from 'src/lib/failureSentence';
import { usePageTitle } from 'src/lib/pageTitle';
import { pluralize } from 'src/lib/pluralize';
import { returnAddressParams } from 'src/lib/returnTo';
import { useViewParams } from 'src/lib/viewParams';

type RunState = components['schemas']['RunState'];
type CurrentRunCard = components['schemas']['CurrentRunCard'];
type RunProgress = components['schemas']['RunProgress'];

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

/** The run surface: the current card as a static two-zone reveal with rating, live
 * progress, and a retry marker. Once `current_card` is null, nothing is pending and this
 * page is the completed run's page. */
export default function RunPage() {
  const { runId } = useParams<{ runId: string }>();

  const runQuery = useQuery({
    queryKey: ['run', runId],
    queryFn: () => readRunState(runId!),
    enabled: !!runId,
  });
  usePageTitle(runQuery.data?.practice_name);

  return (
    <div className="flex flex-col p-4">
      <Breadcrumb
        places={[
          { label: 'All practices', to: '/practices' },
          ...(runQuery.data
            ? [
                {
                  label: runQuery.data.practice_name,
                  to: `/practices/${runQuery.data.practice_id}`,
                  // The space keeps the mark and the name two words when spoken; on screen the
                  // link's gap spaces them.
                  icon: (
                    <>
                      <PracticeMark />{' '}
                    </>
                  ),
                },
              ]
            : []),
        ]}
      />

      {runQuery.isError &&
        (isNotFound(runQuery.error) ? (
          <p className="mt-4 text-(--color-aside)">Run not found.</p>
        ) : (
          <p role="alert" className="mt-4 text-sm text-(--color-wrong)">
            Could not load this run.
          </p>
        ))}

      {runQuery.data && (
        <>
          {runQuery.data.current_card && (
            <ProgressLine runId={runId!} progress={runQuery.data.progress} />
          )}
          <RunBody runId={runId!} state={runQuery.data} />
        </>
      )}
    </div>
  );
}

function ProgressLine({ runId, progress }: { runId: string; progress: RunProgress }) {
  const { params, setParams } = useViewParams();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const endMutation = useMutation({
    mutationFn: () => endRun(runId),
    onSuccess: async () => {
      // The completed run replaces the card in place; then the place on the card goes, as
      // after the last card's rating.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['run', runId] }),
        queryClient.invalidateQueries({ queryKey: ['run_detail', runId] }),
      ]);
      setParams(withoutCardPlace(params));
    },
  });

  return (
    <>
      <div className="mt-4 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <RunProgressBar progress={progress} />
        </div>
        <button
          type="button"
          disabled={endMutation.isPending}
          onClick={() => setConfirmOpen(true)}
          className="tappable-sm h-9 shrink-0 rounded-xl bg-(--color-surface) px-3 text-sm font-semibold text-(--color-ink)"
        >
          End run
        </button>
      </div>
      {endMutation.isError && (
        <p role="alert" className="mt-2 text-sm text-(--color-wrong)">
          {failureSentence(endMutation.error, 'Run not found.')}
        </p>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="End this run?"
        description="The cards you have not reached stay as they are. The run shows only the cards you did."
        confirmLabel="End run"
        onConfirm={() => {
          setConfirmOpen(false);
          endMutation.mutate();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

function RunBody({ runId, state }: { runId: string; state: RunState }) {
  if (!state.current_card) {
    return <CompletedRun runId={runId} day={formatRunDay(state.day, state.day_index)} />;
  }

  // Keyed by run_card_id so a new card, which arrives by a query invalidation and not a
  // remount of this page, starts with no rating request pending or failed.
  return (
    <RunCardView key={state.current_card.run_card_id} runId={runId} currentCard={state.current_card} />
  );
}

/** The completed run's page below its row of places: the run's mark and `day` as its heading,
 * its badge and count, a line per deck it asked, Re-run, then its summary. */
function CompletedRun({ runId, day }: { runId: string; day: string }) {
  const location = useLocation();
  const [rerunError, setRerunError] = useState('');
  const runQuery = useQuery({
    queryKey: ['run_detail', runId],
    queryFn: () => readRun(runId),
  });
  const breakdownQuery = useQuery({
    queryKey: ['run_breakdown', runId],
    queryFn: () => readRunBreakdown(runId),
  });
  const run = runQuery.data;

  return (
    <div className="mt-3.5 flex flex-col gap-3.5">
      <div>
        <h1 className="text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
          <span className="whitespace-nowrap">
            <RunMark /> {day}
          </span>
        </h1>
        {run && (
          <p className="mt-2 flex items-center gap-2.5">
            <RunStatusBadge status={run.status} />
            <span className="text-body font-medium text-(--color-aside)">
              {run.reached_cards} of {pluralize(run.counted_cards, 'card')}
            </span>
          </p>
        )}
      </div>

      {runQuery.isError ? (
        isNotFound(runQuery.error) ? (
          <p className="text-(--color-aside)">Run not found.</p>
        ) : (
          <p role="alert" className="text-sm text-(--color-wrong)">
            Could not load this run.
          </p>
        )
      ) : (
        <>
          {run && (
            <ul className="tappable flex flex-col divide-y divide-(--color-line) rounded-block bg-(--color-surface)">
              {run.decks.map((deck) => (
                <li key={deck.deck_id}>
                  <Link
                    to={{
                      pathname: `/runs/${runId}/decks/${deck.deck_id}`,
                      search: returnAddressParams(location, 'cancelTo').toString(),
                    }}
                    className="flex min-h-11 items-center justify-between gap-3 py-3 pr-3 pl-4"
                  >
                    <span className="truncate text-body leading-5 font-semibold text-(--color-ink)">
                      <DeckMark /> {deck.deck_name}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-icon shrink-0 text-(--color-aside)"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-2">
            <RerunButton runId={runId} onError={setRerunError} />
            {rerunError && (
              <p role="alert" className="text-sm text-(--color-wrong)">
                {rerunError}
              </p>
            )}
          </div>
        </>
      )}

      {breakdownQuery.isError && (
        <p role="alert" className="text-sm text-(--color-wrong)">
          {failureSentence(breakdownQuery.error, 'Run not found.')}
        </p>
      )}
      {breakdownQuery.data && <RunBreakdown breakdown={breakdownQuery.data} runId={runId} />}
    </div>
  );
}

function RunCardView({ runId, currentCard }: { runId: string; currentCard: CurrentRunCard }) {
  const { params, setParams } = useViewParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // The place in the URL belongs to this card only when tagged with it; one left by an
  // earlier card reads as nothing.
  const placeIsThisCard = params.get('card') === currentCard.run_card_id;
  const showAnswer = placeIsThisCard && params.get('shown') === '1';
  const ratings: Record<string, number> = {};
  if (placeIsThisCard) {
    for (const field of currentCard.answers) {
      const rating = ratingParam(params, field.field_def_id);
      if (rating !== undefined) ratings[field.field_def_id] = rating;
    }
  }

  const rateMutation = useMutation({
    mutationFn: () => rateRunCard(currentCard.run_card_id, ratings),
    onSuccess: async () => {
      // The next card first, so this one keeps its answers and ratings on screen until it
      // is replaced; then the place goes, so nothing carries to the next card.
      await queryClient.invalidateQueries({ queryKey: ['run', runId] });
      setParams(withoutCardPlace(params));
    },
  });

  const allRated = currentCard.answers.every((field) => field.field_def_id in ratings);
  const canSubmit = allRated && !rateMutation.isPending;

  const showAnswers = () => {
    const next = withoutCardPlace(params);
    next.set('card', currentCard.run_card_id);
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
          {failureSentence(rateMutation.error, 'Run not found.')}
        </p>
      )}
    </div>
  );
}
