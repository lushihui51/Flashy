import type { components } from 'src/api/types';

type RunStatus = components['schemas']['RunStatus'];

type RunStatusBadgeProps = {
  status: RunStatus;
};

/** The one place a run's `active`/`completed` status becomes a badge, so every list of
 * runs reads the same status the same way, rather than a second hand-written copy. */
export default function RunStatusBadge({ status }: RunStatusBadgeProps) {
  const active = status === 'active';
  return (
    <span
      className={`shrink-0 rounded-tight text-xs ${
        active
          ? 'bg-(--color-ink) px-badge-x py-badge-y font-semibold text-(--color-surface)'
          : 'border border-(--color-line) bg-(--color-surface) px-2 py-0.5 font-medium text-(--color-aside)'
      }`}
    >
      {active ? 'Active' : 'Completed'}
    </span>
  );
}
