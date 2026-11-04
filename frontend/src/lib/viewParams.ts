import { useCallback, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { revealDelta, type Edges } from 'src/lib/revealDelta';

export type ViewTargets = {
  /** The control the user tapped, as rendered after the change. */
  control: () => Element | null;
  /** The element holding the new list, once the page has rendered it for the hook's
   * current params; null until then. */
  listStart: () => Element | null;
};

export type ViewParams = {
  /** The page's search params as the URL holds them now. */
  params: URLSearchParams;
  /** Writes `next` as the page's search params without moving the page. */
  setParams: (next: URLSearchParams) => void;
  /** Writes `next` as a change to what the page's list shows, then moves the page only
   * as far as it takes to show the control and the list's first rows. */
  changeView: (next: URLSearchParams, targets: ViewTargets) => void;
};

function edgesOf(element: Element): Edges {
  const { top, bottom } = element.getBoundingClientRect();
  return { top, bottom };
}

/** The list's first two rows: the elements marked `data-reveal-row` under `list`, else its
 * element children, else `list` itself. */
function rowsOf(list: Element): Element[] {
  const marked = Array.from(list.querySelectorAll('[data-reveal-row]'));
  if (marked.length > 0) return marked.slice(0, 2);
  const children = Array.from(list.children);
  if (children.length > 0) return children.slice(0, 2);
  return [list];
}

/** The greatest stuck bottom among the page's sticky elements marked `data-reveal-clear`,
 * each its sticky `top` plus its height; 0 when the page has none. */
function bandTop(): number {
  let greatest = 0;
  for (const element of document.querySelectorAll('[data-reveal-clear]')) {
    // The stuck place rather than the current edges: a row the page has not scrolled to yet
    // sits below where it will stick, and would misplace the band (ADR 097).
    const top = Number.parseFloat(getComputedStyle(element).top) || 0;
    greatest = Math.max(greatest, top + element.getBoundingClientRect().height);
  }
  return greatest;
}

/** `delta` as whole pixels, since the browser lands a scroll on a whole pixel and would round
 * half a pixel the wrong way: the whole number above when it still keeps `top`, the least top
 * among the targets, at or below `bandTop`, else the one below. */
function wholePixels(delta: number, top: number, bandTop: number): number {
  const above = Math.ceil(delta);
  return top - above >= bandTop ? above : Math.floor(delta);
}

/** The one way a page reads and writes its own URL search params. A write replaces the
 * current history entry, so it adds no step to going back. */
export function useViewParams(): ViewParams {
  const [params, setSearchParams] = useSearchParams();
  // The targets of the latest changeView, held until the page has rendered its list for
  // that write's params, keyed by those params so no earlier or later write can fire them.
  const pending = useRef<{ key: string; targets: ViewTargets } | null>(null);

  const setParams = useCallback(
    (next: URLSearchParams) => {
      setSearchParams(next, { replace: true, preventScrollReset: true });
    },
    [setSearchParams],
  );

  const changeView = useCallback(
    (next: URLSearchParams, targets: ViewTargets) => {
      pending.current = { key: next.toString(), targets };
      setSearchParams(next, { replace: true, preventScrollReset: true });
    },
    [setSearchParams],
  );

  // Every commit, before the browser paints, so the new list appears already in place
  // rather than drawn once and then moved.
  useLayoutEffect(() => {
    const current = pending.current;
    if (!current || params.toString() !== current.key) return;
    const list = current.targets.listStart();
    if (!list) return;
    pending.current = null;
    const control = current.targets.control();
    const input = {
      viewportHeight: window.innerHeight,
      bandTop: bandTop(),
      control: control ? edgesOf(control) : null,
      rows: rowsOf(list).map(edgesOf),
    };
    const targets = input.control ? [input.control, ...input.rows] : input.rows;
    const top = Math.min(...targets.map((edges) => edges.top));
    window.scrollBy(0, wholePixels(revealDelta(input), top, input.bandTop));
  });

  return { params, setParams, changeView };
}
