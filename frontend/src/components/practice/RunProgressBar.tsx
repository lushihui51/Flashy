import type { components } from 'src/api/types';

type SessionProgress = components['schemas']['SessionProgress'];

type RunProgressBarProps = {
  progress: SessionProgress;
};

/** ADR 028: one proportional bar, four color segments, sized against `total_cards` —
 * fixed at session start, so a requeue (which paints a segment red and adds a new
 * pending row in the same action) never shrinks another segment's share. Segment
 * order and colors are the contract (docs/tasks/006-practice-run.md): passed, then
 * still_failed, then retry_pending, then unseen, left to right. Numeric counts are
 * screen-reader-only (`aria-label`) — the bar itself carries no visible text, per
 * this task's Out of scope. */
const SEGMENTS = [
  { key: 'passed', label: 'passed', colorClass: 'bg-(--color-success)' },
  { key: 'still_failed', label: 'failed', colorClass: 'bg-(--color-danger)' },
  { key: 'retry_pending', label: 'retrying', colorClass: 'bg-(--color-warning)' },
  { key: 'unseen', label: 'unseen', colorClass: 'bg-(--color-pending)' },
] as const;

export default function RunProgressBar({ progress }: RunProgressBarProps) {
  const total = progress.total_cards;
  const ariaLabel = SEGMENTS.map((segment) => `${progress[segment.key]} ${segment.label}`).join(
    ', ',
  );

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="flex h-2 w-full overflow-hidden rounded-full bg-(--color-surface-elevated)"
    >
      {total > 0 &&
        SEGMENTS.filter((segment) => progress[segment.key] > 0).map((segment) => (
          <div
            key={segment.key}
            className={segment.colorClass}
            style={{ width: `${(progress[segment.key] / total) * 100}%` }}
          />
        ))}
    </div>
  );
}
