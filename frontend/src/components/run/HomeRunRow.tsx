import { Play } from 'lucide-react';
import type { ReactNode } from 'react';
import type { components } from 'src/api/types';
import DeckLine from 'src/components/practice/DeckLine';
import RunProgressBar from 'src/components/run/RunProgressBar';
import RunMark from 'src/components/ui/RunMark';
import { formatRunDay } from 'src/lib/datetime';

type HomeRun = components['schemas']['HomeRun'];

type HomeRunRowProps = {
  run: HomeRun;
  isMain: boolean;
  onPlay: () => void;
  playError: string | null;
};

/** One run's row on Home: its block, its practice's name, its decks, an active run's bar
 * and its play button, yellow when `isMain`. `onPlay` runs on the play button; `playError`
 * is the sentence beneath the row, or null. It holds no query or mutation of its own. */
export default function HomeRunRow({ run, isMain, onPlay, playError }: HomeRunRowProps): ReactNode {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 py-2.25 pr-3 pl-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1.25">
          <span className="flex">
            <span className="outlined-line inline-block h-6 rounded-xl pr-2.25 pl-1.75 text-xs leading-5.25 font-semibold whitespace-nowrap text-(--color-aside)">
              <RunMark /> {formatRunDay(run.day, run.day_index)}
            </span>
          </span>
          <span className="truncate text-body leading-5 font-semibold text-(--color-ink)">
            {run.practice_name}
          </span>
          <DeckLine decks={run.decks} />
          {run.progress && <RunProgressBar progress={run.progress} />}
        </div>
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
    </div>
  );
}
