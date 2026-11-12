import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Plus } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { readHome } from 'src/api/home';
import { startRun } from 'src/api/practice';
import type { components } from 'src/api/types';
import HomeRunRow from 'src/components/run/HomeRunRow';
import FormBar from 'src/components/ui/FormBar';
import { failureSentence } from 'src/lib/failureSentence';
import { usePageTitle } from 'src/lib/pageTitle';
import { returnAddressParams } from 'src/lib/returnTo';

type HomeSteps = components['schemas']['HomeSteps'];
type StepFlag = Extract<keyof HomeSteps, 'has_deck' | 'has_card'>;
type HomeRun = components['schemas']['HomeRun'];

// In the order the things nest. The last has no flag: while the steps show, the user has made
// no practice.
const STEPS: { label: string; to: string; flag: StepFlag | null }[] = [
  { label: 'New deck', to: '/decks/new', flag: 'has_deck' },
  { label: 'New card', to: '/cards/new', flag: 'has_card' },
  { label: 'New practice', to: '/practices/new', flag: null },
];

const STEP_CIRCLE_CLASS =
  'flex size-7.5 shrink-0 items-center justify-center rounded-full text-sm font-semibold';
const BLOCK_CLASS =
  'tappable flex flex-col divide-y divide-(--color-line) rounded-block bg-(--color-surface)';

function FirstPracticeSteps({ steps }: { steps: HomeSteps }) {
  const location = useLocation();
  const isDone = (flag: StepFlag | null) => flag !== null && steps[flag];
  const doneCount = STEPS.filter((step) => isDone(step.flag)).length;
  const nextIndex = STEPS.findIndex((step) => !isDone(step.flag));

  return (
    <>
      <div className="mt-3.5 flex flex-col gap-1">
        <h2 className="text-title font-bold text-(--color-ink)">Your first practice</h2>
        <span className="text-sm text-(--color-aside)">{`${doneCount} of ${STEPS.length}`}</span>
      </div>
      <ol aria-label="Your first practice" className={`mt-3 ${BLOCK_CLASS}`}>
        {STEPS.map((step, index) => {
          if (isDone(step.flag)) {
            return (
              <li key={step.label} className="flex items-center gap-3 px-4 py-3.5">
                <span className={`${STEP_CIRCLE_CLASS} bg-(--color-ink) text-(--color-surface)`}>
                  <Check aria-hidden="true" strokeWidth={3} className="h-4 w-4" />
                </span>
                <span className="text-base font-medium text-(--color-aside) line-through">
                  {step.label}
                </span>
              </li>
            );
          }
          if (index === nextIndex) {
            return (
              <li key={step.label} className="flex items-center gap-3 px-4 py-3">
                <span className={`${STEP_CIRCLE_CLASS} outlined-ink text-(--color-ink)`}>
                  {index + 1}
                </span>
                <Link
                  to={{
                    pathname: step.to,
                    search: returnAddressParams(location, 'cancelTo').toString(),
                  }}
                  className="tappable flex h-field min-w-0 flex-1 items-center justify-start gap-2 rounded-2xl bg-(--color-main-action) px-4.5 text-action font-semibold text-(--color-ink)"
                >
                  <Plus aria-hidden="true" strokeWidth={2.8} className="h-3.5 w-3.5 shrink-0" />
                  {step.label}
                </Link>
              </li>
            );
          }
          return (
            <li key={step.label} className="flex items-center gap-3 px-4 py-3.5">
              <span className={`${STEP_CIRCLE_CLASS} outlined-line text-(--color-aside)`}>
                {index + 1}
              </span>
              <span className="text-base font-medium text-(--color-aside)">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

type RunSectionProps = {
  heading: string;
  runs: HomeRun[];
  /** Whether the first run's play button is the page's main action. */
  firstIsMain: boolean;
  onPlay: (run: HomeRun) => void;
  /** The sentence beneath a run's row after its play button failed, or null. */
  playError: (run: HomeRun) => string | null;
};

function RunSection({ heading, runs, firstIsMain, onPlay, playError }: RunSectionProps) {
  return (
    <>
      <h2 className="mt-4 text-action font-semibold text-(--color-ink)">{heading}</h2>
      <ul aria-label={heading} className={`mt-1.5 ${BLOCK_CLASS}`}>
        {runs.map((run, index) => (
          <li key={run.id}>
            <HomeRunRow
              run={run}
              isMain={firstIsMain && index === 0}
              onPlay={() => onPlay(run)}
              playError={playError(run)}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

/** What the user can do next: the steps to a first practice until they have made one, then
 * their active runs and their recently completed runs, each a play button from a card, over a
 * bar leading to All practices. */
export default function HomePage() {
  usePageTitle('Home');
  const navigate = useNavigate();
  // Nothing invalidates this key: a thing made on any other page shows through the refetch on
  // Home's next mount (ADR 088).
  const homeQuery = useQuery({ queryKey: ['home'], queryFn: readHome });
  // A completed run's play button starts its practice again; its variable is the row tapped,
  // so a refusal shows beneath that row alone.
  const startMutation = useMutation({
    mutationFn: (run: HomeRun) => startRun(run.practice_id),
    onSuccess: (started) => navigate(`/runs/${started.id}`),
  });

  if (homeQuery.isError) {
    return (
      <div className="p-4">
        <p role="alert" className="text-sm text-(--color-wrong)">
          Could not load Home.
        </p>
      </div>
    );
  }
  if (!homeQuery.data) return null;

  const { steps, active_runs: activeRuns, recent_runs: recentRuns } = homeQuery.data;

  const play = (run: HomeRun) => {
    if (run.status === 'active') navigate(`/runs/${run.id}`);
    else startMutation.mutate(run);
  };
  const playError = (run: HomeRun) =>
    startMutation.isError && startMutation.variables.id === run.id
      ? failureSentence(startMutation.error, 'Practice not found.')
      : null;

  return (
    <div className="p-4">
      <h1 className="text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
        Home
      </h1>
      {steps ? (
        <FirstPracticeSteps steps={steps} />
      ) : (
        <>
          {activeRuns.length > 0 && (
            <RunSection
              heading="Active"
              runs={activeRuns}
              firstIsMain
              onPlay={play}
              playError={playError}
            />
          )}
          {recentRuns.length > 0 && (
            <RunSection
              heading="Recently completed"
              runs={recentRuns}
              firstIsMain={activeRuns.length === 0}
              onPlay={play}
              playError={playError}
            />
          )}
          <FormBar>
            <Link
              to="/practices"
              className="tappable-sm flex h-action flex-1 items-center justify-center rounded-2xl bg-(--color-surface) text-body font-semibold text-(--color-ink)"
            >
              All practices
            </Link>
          </FormBar>
        </>
      )}
    </div>
  );
}
