import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type ListRowBaseProps = {
  leading?: ReactNode;
  /** Usually a plain string; accepts ReactNode so a caller can style a placeholder
   * value in place (e.g. DeckEditor's italic, muted "empty" for a blank card, §4.7) —
   * the wrapping span still owns truncation/line-height, an inner element only
   * overrides its own color/style. */
  title: ReactNode;
  /** Omitted entirely when absent — no placeholder element, no extra text node. Row
   * height still stays consistent across rows via the row's own min-height (sized to
   * fit the two-line case with explicit, not browser-default, line-heights so the
   * number is exact), not by reserving subtitle-specific space in the text column
   * (see Phase 2.7 §2's "two-line row" note). */
  subtitle?: string;
  /** Right-aligned, never truncated — the subtitle absorbs width pressure instead. */
  meta?: string;
};

/** Exactly one of `to` (navigates, renders a Link) or `onClick` (renders a button —
 * for rows that open in-page state, like DeckEditor's card list, §4.7) is required. */
type ListRowProps = ListRowBaseProps &
  ({ to: string; onClick?: never } | { to?: never; onClick: () => void });

/** The one row grammar for both /library and /subjects/:subjectId's children lists
 * (Phase 2.7): identity and shape on the left, size on the right, chevron last.
 * Whichever element it renders as is a single natively keyboard-reachable, Enter-
 * activated target, so the chevron never needs its own focus stop. */
export default function ListRow({ leading, title, subtitle, meta, to, onClick }: ListRowProps) {
  const content = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-5 text-(--color-text)">{title}</span>
        {subtitle && (
          <span className="block truncate text-[13px] leading-4 text-(--color-text-secondary)">
            {subtitle}
          </span>
        )}
      </span>
      {meta && <span className="shrink-0 text-[13px] text-(--color-text-muted)">{meta}</span>}
      <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-(--color-text-muted)" />
    </>
  );

  // 64px = 28px padding (py-[14px]) + 20px title line (leading-5) + 16px subtitle
  // line (leading-4) — the two-line case's exact height, so a one-line row (title
  // only) is floored up to match it instead of rendering visibly shorter.
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-16 w-full items-center gap-3 py-[14px] text-left"
      >
        {content}
      </button>
    );
  }

  return (
    <Link to={to} className="flex min-h-16 items-center gap-3 py-[14px]">
      {content}
    </Link>
  );
}
