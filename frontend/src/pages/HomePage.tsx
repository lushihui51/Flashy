import { useQuery } from '@tanstack/react-query';
import { Check, Play, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { readHome } from 'src/api/home';
import type { components } from 'src/api/types';
import PracticeStatusBadge from 'src/components/practice/PracticeStatusBadge';
import RunProgressBar from 'src/components/practice/RunProgressBar';
import SessionDeckChips from 'src/components/practice/SessionDeckChips';
import MasteryCircle from 'src/components/ui/MasteryCircle';
import { usePageTitle } from 'src/lib/pageTitle';
import { pluralize } from 'src/lib/pluralize';

type HomeSteps = components['schemas']['HomeSteps'];
type StepFlag = Extract<keyof HomeSteps, 'has_deck' | 'has_card'>;
type HomeActivePractice = components['schemas']['HomeActivePractice'];
type DeckSummary = components['schemas']['DeckSummary'];

// In the order the things nest. The last has no flag: while the steps show, the user has made
// no practice.
const STEPS: { label: string; to: string; flag: StepFlag | null }[] = [
  { label: 'New deck', to: '/decks/new', flag: 'has_deck' },
  { label: 'New card', to: '/cards/new', flag: 'has_card' },
  { label: 'New practice', to: '/practice/new', flag: null },
];

const STEP_CIRCLE_CLASS =
  'flex size-7.5 shrink-0 items-center justify-center rounded-full text-sm font-semibold';
const BLOCK_CLASS =
  'tappable flex flex-col divide-y divide-(--color-line) rounded-block bg-(--color-surface)';

function FirstPracticeSteps({ steps }: { steps: HomeSteps }) {
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
                  to={step.to}
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

function ActivePractices({ practices }: { practices: HomeActivePractice[] }) {
  return (
    <ul className={`mt-3.5 ${BLOCK_CLASS}`}>
      {practices.map((practice, index) => (
        <li key={practice.id} className="flex flex-col gap-2 px-4 py-3.5">
          <Link to={`/practice/${practice.id}`} className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-body leading-5 font-semibold text-(--color-ink)">
                {practice.name}
              </span>
              <PracticeStatusBadge status={practice.status} />
            </span>
            <span className="flex flex-wrap items-center gap-x-2">
              <SessionDeckChips decks={practice.decks} variant="summary" />
            </span>
          </Link>
          <RunProgressBar progress={practice.progress} />
          {index === 0 && (
            <Link
              to={`/practice/${practice.id}/run`}
              className="tappable mt-1.5 flex h-action w-full items-center justify-center gap-2 rounded-2xl bg-(--color-main-action) text-action font-semibold text-(--color-ink)"
            >
              <Play aria-hidden="true" fill="currentColor" className="size-3 shrink-0" />
              Start practice
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

type RecentDecksProps = {
  decks: DeckSummary[];
  /** Whether the first deck's "Practice" is the page's main action. */
  firstIsMainAction: boolean;
};

function RecentDecks({ decks, firstIsMainAction }: RecentDecksProps) {
  return (
    <>
      <h2 className="mt-5 text-action font-semibold text-(--color-ink)">Recently practiced</h2>
      <ul className={`mt-2.5 ${BLOCK_CLASS}`}>
        {decks.map((deck, index) => (
          <li key={deck.id} className="flex items-center gap-3 py-3 pr-3 pl-4">
            <Link to={`/decks/${deck.id}`} className="flex min-w-0 flex-1 flex-col gap-0.75">
              <span className="truncate text-base font-semibold text-(--color-ink)">
                {deck.name}
              </span>
              <span className="truncate text-label text-(--color-aside)">
                {pluralize(deck.card_count, 'card')} · {pluralize(deck.field_names.length, 'field')}
              </span>
            </Link>
            {deck.readiness !== null && <MasteryCircle readiness={deck.readiness} size="row" />}
            <Link
              to={`/practice?deck=${deck.id}`}
              className={`flex h-10 shrink-0 items-center gap-1.5 px-3.5 text-body font-semibold text-(--color-ink) ${
                firstIsMainAction && index === 0
                  ? 'tappable rounded-2xl bg-(--color-main-action)'
                  : 'tappable-sm rounded-full bg-(--color-surface)'
              }`}
            >
              <Play aria-hidden="true" fill="currentColor" className="size-3 shrink-0" />
              Practice
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** What the user can do next: the steps to a first practice until they have made one, then
 * their active practices, the decks they most recently practiced, and a way to New practice. */
export default function HomePage() {
  usePageTitle('Home');
  // Nothing invalidates this key: a thing made on any other page shows through the refetch on
  // Home's next mount (ADR 088).
  const homeQuery = useQuery({ queryKey: ['home'], queryFn: readHome });

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

  const { steps, active_practices: activePractices, recent_decks: recentDecks } = homeQuery.data;

  return (
    <div className="p-4">
      <h1 className="text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
        Home
      </h1>
      {steps ? (
        <FirstPracticeSteps steps={steps} />
      ) : (
        <>
          {activePractices.length > 0 && <ActivePractices practices={activePractices} />}
          {recentDecks.length > 0 && (
            <RecentDecks decks={recentDecks} firstIsMainAction={activePractices.length === 0} />
          )}
          <Link
            to="/practice/new"
            className="tappable-sm mt-3.5 flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-(--color-surface) text-body font-semibold text-(--color-ink)"
          >
            <Plus aria-hidden="true" strokeWidth={2.8} className="h-3.5 w-3.5" />
            New practice
          </Link>
        </>
      )}
    </div>
  );
}
