import { Fragment, type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { hasEarlierPage } from 'src/lib/historyIndex';

export type BreadcrumbPlace = {
  label: string;
  /** The place's own address, never carrying a remembered tab or filter. */
  to: string;
  icon?: ReactNode;
};

type BreadcrumbProps = {
  /** The places above the page, widest first. */
  places: BreadcrumbPlace[];
};

/** The row above a page's heading that links to each place the page sits under. It
 * lists only the places above the page, never the page itself, and leads with a "<"
 * that goes back exactly when the browser's history holds an earlier page in Flashy. */
export default function Breadcrumb({ places }: BreadcrumbProps): ReactNode {
  const navigate = useNavigate();
  return (
    <nav
      aria-label="Breadcrumb"
      className="inline-flex items-center gap-1.5 text-body font-medium text-(--color-aside)"
    >
      {hasEarlierPage() && (
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate(-1)}
          // An h-11 hit area, pulled back by the negative margins so the icon sits at the
          // row's left edge and the row keeps the height of its text.
          className="-my-3.5 -ml-3.5 flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
      {places.map((place, index) => (
        <Fragment key={place.to}>
          {index > 0 && (
            <span aria-hidden="true" className="text-(--color-aside)">
              ›
            </span>
          )}
          <Link to={place.to} className="inline-flex items-center gap-1">
            {place.icon}
            {place.label}
          </Link>
        </Fragment>
      ))}
    </nav>
  );
}
