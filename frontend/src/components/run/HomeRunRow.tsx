import { ChevronUp, Play } from 'lucide-react';
import type { ReactNode } from 'react';
import type { components } from 'src/api/types';
import DeckLine from 'src/components/practice/DeckLine';
import RunProgressBar from 'src/components/run/RunProgressBar';
import {
  FAILED_COLOR,
  PASSED_COLOR,
  RETRYING_COLOR,
  UNSEEN_COLOR,
} from 'src/components/run/runProgressColors';
import ChangeBadge from 'src/components/ui/ChangeBadge';
import DeckMark from 'src/components/ui/DeckMark';
import MarkedName from 'src/components/ui/MarkedName';
import RunMark from 'src/components/ui/RunMark';
import { CHANGE_KINDS, CHANGE_WORDS, countChanges, type ChangeKind } from 'src/lib/changeKinds';
import { formatRunDay } from 'src/lib/datetime';
import { pluralize } from 'src/lib/pluralize';

type HomeRun = components['schemas']['HomeRun'];
type RunProgress = components['schemas']['RunProgress'];
type Breakdown = { change: ChangeKind }[] | 'loading' | 'error';

type HomeRunRowProps = {
  run: HomeRun;
  isMain: boolean;
  onPlay: () => void;
  playError: string | null;
  /** Whether the row's details are open. */
  open: boolean;
  /** Opens or closes the details. */
  onToggle: () => void;
  /** A completed run's breakdown for its counts: its cards, or 'loading' or 'error'; absent for an active run. */
  breakdown?: Breakdown;
};

// In the bar's order, each beside a square in the bar's color for it.
const PROGRESS_COUNTS: {
  key: keyof Omit<RunProgress, 'total_cards'>;
  word: string;
  color: string;
}[] = [
  { key: 'passed', word: 'passed', color: PASSED_COLOR },
  { key: 'still_failed', word: 'failed', color: FAILED_COLOR },
  { key: 'retry_pending', word: 'retrying', color: RETRYING_COLOR },
  { key: 'unseen', word: 'unseen', color: UNSEEN_COLOR },
];

function ProgressCounts({ progress }: { progress: RunProgress }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
      {PROGRESS_COUNTS.map((count) => (
        <span
          key={count.key}
          className="flex min-w-0 items-center gap-1.5 text-sm text-(--color-ink)"
        >
          <span
            aria-hidden="true"
            className={`size-2.5 shrink-0 rounded-[0.1875rem] ${count.color}`}
          />
          <span className="min-w-0 break-words">
            <span className="font-semibold">{progress[count.key]}</span> {count.word}
          </span>
        </span>
      ))}
    </div>
  );
}

function ChangeCounts({ breakdown }: { breakdown: Breakdown }) {
  // Until the breakdown arrives the counts' place stays empty, with no words of its own.
  if (breakdown === 'loading') return null;
  if (breakdown === 'error') {
    return (
      <p role="alert" className="text-sm text-(--color-wrong)">
        Could not load this run.
      </p>
    );
  }
  const counts = countChanges(breakdown);
  return (
    <div className="flex flex-wrap gap-1">
      {CHANGE_KINDS.map((kind) => (
        <span
          key={kind}
          role="img"
          aria-label={`${counts[kind]} ${CHANGE_WORDS[kind]}`}
          className="flex flex-1 flex-col items-center gap-0.75 text-sm font-semibold text-(--color-ink)"
        >
          <ChangeBadge kind={kind} />
          {counts[kind]}
        </span>
      ))}
    </div>
  );
}

function RunDetails({
  run,
  breakdown,
  onHide,
}: {
  run: HomeRun;
  breakdown: Breakdown | undefined;
  onHide: () => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-(--color-line) bg-(--color-ground) px-4 pt-3 pb-2.5">
      <div className="flex flex-col gap-0.5">
        {run.decks.map((deck) => (
          <span
            key={deck.deck_id}
            className="line-clamp-2 text-label leading-4.5 break-words text-(--color-aside)"
          >
            <MarkedName mark={<DeckMark />} name={deck.deck_name} />
          </span>
        ))}
      </div>
      {run.progress ? (
        <ProgressCounts progress={run.progress} />
      ) : (
        <>
          <span className="text-label text-(--color-aside)">
            {run.reached_cards} of {pluralize(run.counted_cards, 'card')}
          </span>
          <ChangeCounts breakdown={breakdown ?? 'loading'} />
        </>
      )}
      <button
        type="button"
        onClick={onHide}
        className="flex h-11 items-center justify-center gap-1.5 text-body font-semibold text-(--color-ink)"
      >
        <ChevronUp aria-hidden="true" strokeWidth={2.2} className="size-4" />
        Hide
      </button>
    </div>
  );
}

/** One run's row on Home: its block, its practice's name, its decks, an active run's bar
 * and its play button, yellow when `isMain`, and its details beneath while `open`. `onPlay`
 * runs on the play button; `onToggle` on a tap anywhere else on the row and on the details'
 * "Hide". `playError` is the sentence beneath the row, or null. An active run's details carry
 * its counts from its progress, a completed run's its change counts from `breakdown`. It holds
 * no query or mutation of its own. */
export default function HomeRunRow({
  run,
  isMain,
  onPlay,
  playError,
  open,
  onToggle,
  breakdown,
}: HomeRunRowProps): ReactNode {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 py-2.25 pr-3 pl-4">
        <button
          type="button"
          aria-expanded={open}
          aria-label={run.practice_name}
          onClick={onToggle}
          className="flex min-w-0 flex-1 flex-col gap-1.25 text-left"
        >
          <span className="flex">
            <span className="outlined-line inline-block min-h-6 rounded-xl pr-2.25 pl-1.75 text-xs leading-5.25 font-semibold break-words text-(--color-aside)">
              <MarkedName mark={<RunMark />} name={formatRunDay(run.day, run.day_index)} />
            </span>
          </span>
          <span className="line-clamp-2 w-full text-body leading-5 font-semibold break-words text-(--color-ink)">
            {run.practice_name}
          </span>
          <DeckLine decks={run.decks} className="w-full" />
          {run.progress && <RunProgressBar progress={run.progress} />}
        </button>
        <button
          type="button"
          aria-label={`Practice ${run.practice_name}`}
          onClick={onPlay}
          className={`tappable-sm flex size-11 shrink-0 items-center justify-center rounded-full text-(--color-ink) ${
            isMain ? 'bg-(--color-main-action)' : 'bg-(--color-surface)'
          }`}
        >
          <Play aria-hidden="true" fill="currentColor" className="size-4" />
        </button>
      </div>
      {playError && (
        <p role="alert" className="px-4 pb-3 text-sm text-(--color-wrong)">
          {playError}
        </p>
      )}
      {open && <RunDetails run={run} breakdown={breakdown} onHide={onToggle} />}
    </div>
  );
}
