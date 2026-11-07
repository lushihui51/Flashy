import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type ListRowBaseProps = {
  leading?: ReactNode;
  /** Usually a plain string; accepts ReactNode so a caller can style a placeholder
   * value in place (e.g. an italic, muted "empty" for a blank value) — the wrapping
   * span still owns truncation/line-height, an inner element only overrides its own
   * color/style. */
  title: ReactNode;
  /** Omitted entirely when absent — no placeholder element, no extra text node. A row
   * without one is floored by the row's own min-height to a row with one. */
  subtitle?: string;
  /** On its own line under the subtitle, never truncated. */
  meta?: string;
  /** Sits between the text column and the chevron, at its own width. */
  trailing?: ReactNode;
};

/** Exactly one of `to` (navigates, renders a Link) or `onClick` (renders a button — for
 * rows that open in-page state) is required. */
type ListRowProps = ListRowBaseProps &
  ({ to: string; onClick?: never } | { to?: never; onClick: () => void });

/** The one row grammar for both /library and /subjects/:subjectId's children lists:
 * a block holding identity, shape and size, chevron last. Whichever element
 * it renders as is a single natively keyboard-reachable, Enter-activated target, so
 * the chevron never needs its own focus stop. */
export default function ListRow({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  to,
  onClick,
}: ListRowProps) {
  const content = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="flex min-w-0 flex-1 flex-col gap-0.75">
        <span className="block truncate text-title leading-6 font-semibold text-(--color-ink)">
          {title}
        </span>
        {subtitle && (
          <span className="block truncate text-label leading-4 text-(--color-aside)">
            {subtitle}
          </span>
        )}
        {meta && <span className="block text-label leading-4 text-(--color-aside)">{meta}</span>}
      </span>
      {trailing && <span className="shrink-0">{trailing}</span>}
      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-(--color-ink)" />
    </>
  );

  // The min-height is a two-line row's height at the default text size, so a title-only
  // row is floored up to match it instead of rendering visibly shorter.
  const blockClass =
    'tappable flex min-h-[4.875rem] items-center gap-3.5 rounded-block bg-(--color-surface) p-4';

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${blockClass} w-full text-left`}
      >
        {content}
      </button>
    );
  }

  return (
    <Link to={to} className={blockClass}>
      {content}
    </Link>
  );
}
