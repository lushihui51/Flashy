import { Fragment, type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

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
 * lists only the places above the page, never the page itself. */
export default function Breadcrumb({ places }: BreadcrumbProps): ReactNode {
  return (
    <nav
      aria-label="Breadcrumb"
      className="inline-flex items-center gap-1.5 text-[15px] font-medium text-(--color-aside)"
    >
      <ChevronLeft aria-hidden="true" className="h-4 w-4" />
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
