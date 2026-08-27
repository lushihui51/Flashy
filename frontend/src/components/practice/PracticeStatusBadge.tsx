import type { components } from 'src/api/types';

type SessionStatus = components['schemas']['SessionStatus'];

type PracticeStatusBadgeProps = {
  status: SessionStatus;
};

/** The one place a session's `active`/`completed` status becomes a badge — extracted
 * from the overview row (Phase 4) so the detail page reads the same status the same
 * way, rather than a second hand-written copy. */
export default function PracticeStatusBadge({ status }: PracticeStatusBadgeProps) {
  const active = status === 'active';
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        active
          ? 'bg-(--color-primary) text-(--color-primary-contrast)'
          : 'bg-(--color-surface-elevated) text-(--color-text-secondary)'
      }`}
    >
      {active ? 'Active' : 'Completed'}
    </span>
  );
}
