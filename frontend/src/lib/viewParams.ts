import { useCallback, useLayoutEffect, useReducer, useRef } from 'react';
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
  /** Writes `next` as a change to what the page's list shows, then moves the list's scroller
   * only as far as it takes to show the control and the list's first rows. Throws when the list
   * has no ancestor marked `data-reveal-scroller`. */
  changeView: (next: URLSearchParams, targets: ViewTargets) => void;
  /** Moves the sentence's scroller, the page or the overlay the form sits in, only as far as it
   * takes to show the control and the rows, within the band the marked elements inside that
   * scroller leave clear, and writes nothing. `control` is the part of the form, `listStart` the
   * element holding its sentence, null until it is rendered. Throws when the sentence has no
   * ancestor marked `data-reveal-scroller`. */
  reveal: (targets: ViewTargets) => void;
  /** Reveals the first element marked `data-reveal-sentence`, in DOM order, inside the
   * nearest marked scroller of `from`, with that sentence's part as the control; nothing
   * when no sentence shows. Waits for a commit as `reveal` does. Throws when `from` has no
   * ancestor marked `data-reveal-scroller`. */
  revealFirstSentence: (from: Element | null) => void;
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

/** The nearest element at or above `element` that a reveal scrolls. Throws when there is none. */
function scrollerOf(element: Element): Element {
  const scroller = element.closest('[data-reveal-scroller]');
  if (!scroller) throw new Error('A reveal found no ancestor marked data-reveal-scroller.');
  return scroller;
}

/** The band a reveal keeps its targets in, between the elements inside `scroller` marked
 * `data-reveal-clear`, in viewport coordinates: `top` is the greatest stuck bottom among those stuck at the top, 0 with
 * none, and `bottom` the least top among those stuck at the foot, the viewport's bottom with
 * none. */
function bandOf(scroller: Element): { top: number; bottom: number } {
  let top = 0;
  let bottom = window.innerHeight;
  for (const element of scroller.querySelectorAll('[data-reveal-clear]')) {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    // The side comes from `bottom` first: an element fixed at the foot reports a numeric `top`
    // too, and would read as stuck at the top (ADR 097).
    if (style.bottom !== 'auto') {
      bottom = Math.min(bottom, rect.top);
    } else {
      // The stuck place rather than the current edges: a row the page has not scrolled to yet
      // sits below where it will stick, and would misplace the band (ADR 097).
      top = Math.max(top, (Number.parseFloat(style.top) || 0) + rect.height);
    }
  }
  return { top, bottom };
}

/** `delta` as whole pixels, since the browser lands a scroll on a whole pixel and would round
 * half a pixel the wrong way: the whole number above when it still keeps `top`, the least top
 * among the targets, at or below `bandTop`, else the one below. */
function wholePixels(delta: number, top: number, bandTop: number): number {
  const above = Math.ceil(delta);
  return top - above >= bandTop ? above : Math.floor(delta);
}

/** Scrolls the scroller of `list`, the element `targets.listStart` gave, by the whole pixels of
 * `revealDelta` over that scroller's band, `targets.control` and the first rows of `list`. */
function scrollToTargets(targets: ViewTargets, list: Element) {
  const scroller = scrollerOf(list);
  const control = targets.control();
  const band = bandOf(scroller);
  const input = {
    bandTop: band.top,
    bandBottom: band.bottom,
    control: control ? edgesOf(control) : null,
    rows: rowsOf(list).map(edgesOf),
  };
  const edges = input.control ? [input.control, ...input.rows] : input.rows;
  const top = Math.min(...edges.map((edge) => edge.top));
  scroller.scrollBy(0, wholePixels(revealDelta(input), top, input.bandTop));
}

/** The one way a page reads and writes its own URL search params. A write replaces the
 * current history entry, so it adds no step to going back. */
export function useViewParams(): ViewParams {
  const [params, setSearchParams] = useSearchParams();
  // The targets of the latest changeView or reveal, held until the page has rendered what they
  // wait for. A changeView's are keyed by its write's params, so no earlier or later write can
  // fire them; a reveal's key is null, since it writes no params and waits only for its target.
  // A reveal of the first sentence looks once, on the commit it asks for: waiting on would move
  // the page later, when a sentence appears with no tap behind it.
  const pending = useRef<{ key: string | null; targets: ViewTargets; once?: boolean } | null>(null);
  const [, askForCommit] = useReducer((commits: number) => commits + 1, 0);

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

  const reveal = useCallback((targets: ViewTargets) => {
    const list = targets.listStart();
    if (list) {
      // Now rather than in the effect: a tap that changes no state causes no commit.
      pending.current = null;
      scrollToTargets(targets, list);
    } else {
      pending.current = { key: null, targets };
    }
  }, []);

  const revealFirstSentence = useCallback((from: Element | null) => {
    if (!from) return;
    const sentence = () => scrollerOf(from).querySelector('[data-reveal-sentence]');
    pending.current = {
      key: null,
      once: true,
      targets: {
        control: () => sentence()?.closest('[data-reveal-part]') ?? null,
        listStart: sentence,
      },
    };
    // The caller may have just set a sentence above the first one showing, so the choice waits
    // for that commit; a tap that changes no state must still get one.
    askForCommit();
  }, []);

  // Every commit, before the browser paints, so the new list or sentence appears already in
  // place rather than drawn once and then moved.
  useLayoutEffect(() => {
    const current = pending.current;
    if (!current || (current.key !== null && params.toString() !== current.key)) return;
    const list = current.targets.listStart();
    if (!list && !current.once) return;
    pending.current = null;
    if (!list) return;
    scrollToTargets(current.targets, list);
  });

  return { params, setParams, changeView, reveal, revealFirstSentence };
}
