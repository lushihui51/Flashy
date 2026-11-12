import type { components } from 'src/api/types';
import {
  FAILED_COLOR,
  PASSED_COLOR,
  RETRYING_COLOR,
  UNSEEN_COLOR,
} from 'src/components/run/runProgressColors';

type RunProgress = components['schemas']['RunProgress'];

type RunProgressBarProps = {
  progress: RunProgress;
};

/** One proportional bar, four color segments, sized against `total_cards` — fixed at
 * the cut of the run, so a requeue (which paints a segment red and adds a new pending row
 * in the same action) never shrinks another segment's share. Segment order and colors
 * are fixed: passed, then still_failed, then retry_pending, then unseen, left to
 * right. Numeric counts are screen-reader-only (`aria-label`) — the bar itself carries
 * no visible text. */
const SEGMENTS = [
  { key: 'passed', label: 'passed', color: PASSED_COLOR },
  { key: 'still_failed', label: 'failed', color: FAILED_COLOR },
  { key: 'retry_pending', label: 'retrying', color: RETRYING_COLOR },
  { key: 'unseen', label: 'unseen', color: UNSEEN_COLOR },
] as const;

export default function RunProgressBar({ progress }: RunProgressBarProps) {
  const total = progress.total_cards;
  const ariaLabel = SEGMENTS.map((segment) => `${progress[segment.key]} ${segment.label}`).join(
    ', ',
  );

  return (
    <div role="img" aria-label={ariaLabel} className="flex h-2 w-full gap-0.75">
      {total > 0 &&
        SEGMENTS.filter((segment) => progress[segment.key] > 0).map((segment) => (
          <div
            key={segment.key}
            className={`rounded-sm ${segment.color}`}
            style={{ width: `${(progress[segment.key] / total) * 100}%` }}
          />
        ))}
    </div>
  );
}
