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
      className={`shrink-0 rounded-tight text-xs font-semibold ${
        active
          ? 'bg-(--color-ink) px-badge-x py-badge-y text-(--color-surface)'
          : 'outlined-line bg-(--color-surface) px-2 py-0.5 text-(--color-aside)'
      }`}
    >
      {active ? 'Active' : 'Completed'}
    </span>
  );
}
