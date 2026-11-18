import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type BreadcrumbPlace = {
  label: string;
  /** The place's own address, never carrying a remembered tab or filter. */
  to: string;
  /** Drawn before the label, on its first line, and spoken as a word of its own before it. */
  icon?: ReactNode;
};

type BreadcrumbProps = {
  /** The places above the page, widest first. */
  places: BreadcrumbPlace[];
};

/** The row above a page's heading that links to each place the page sits under. It
 * lists only the places above the page, never the page itself. */
export default function Breadcrumb({ places }: BreadcrumbProps): ReactNode {
  return (
    <nav
      aria-label="Breadcrumb"
      className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 text-body font-medium text-(--color-aside)"
    >
      {places.map((place, index) => (
        <Fragment key={place.to}>
          {index > 0 && (
            <span aria-hidden="true" className="text-(--color-aside)">
              ›
            </span>
          )}
          <Link to={place.to} className="inline-flex min-w-0 items-start gap-1">
            {place.icon !== undefined && (
              <>
                {/* One line high, so the icon stays on the label's first line when the label
                    wraps. */}
                <span className="flex h-[1lh] shrink-0 items-center">{place.icon}</span>
                {/* Keeps the icon and the label two words when spoken; on screen the link's gap
                    spaces them. */}{' '}
              </>
            )}
            <span className="min-w-0 break-words">{place.label}</span>
          </Link>
        </Fragment>
      ))}
    </nav>
  );
}
