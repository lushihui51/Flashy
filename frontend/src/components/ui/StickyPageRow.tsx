import type { ReactNode } from 'react';

/** A page's row of actions, which stops directly below the app's header as the page scrolls. */
export default function StickyPageRow({ children }: { children: ReactNode }): ReactNode {
  return (
    // The mark tells a reveal after a tab or filter change to keep clear of this row; it is
    // on every row so that no page can leave it off.
    <div
      data-reveal-clear
      className="sticky top-(--app-header-height) z-10 -mx-4 flex items-center justify-between gap-2 bg-(--color-ground) px-4 py-2"
    >
      {children}
    </div>
  );
}
