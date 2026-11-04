/** Edges in viewport coordinates, as `getBoundingClientRect` gives them. */
export type Edges = { top: number; bottom: number };

export type RevealInput = {
  viewportHeight: number;
  /** The top of the band in view: the greatest stuck bottom among the page's sticky elements. */
  bandTop: number;
  /** The control the user tapped; null when it is no longer rendered. */
  control: Edges | null;
  /** The list's first two rows, or fewer when the list has fewer. */
  rows: Edges[];
};

/** The smallest vertical scroll that puts the control and the rows in view, as a delta
 * for `window.scrollBy`: negative to scroll up, 0 when they are in view already. When they
 * do not all fit between `bandTop` and the viewport's bottom, the control lands on `bandTop`
 * and the rows follow as far as they fit; with no control, the first row lands there. */
export function revealDelta({ viewportHeight, bandTop, control, rows }: RevealInput): number {
  const targets = control ? [control, ...rows] : rows;
  const [first] = targets;
  if (!first) return 0;

  const top = Math.min(...targets.map((edges) => edges.top));
  const bottom = Math.max(...targets.map((edges) => edges.bottom));

  if (bottom - top > viewportHeight - bandTop) return first.top - bandTop;
  if (top < bandTop) return top - bandTop;
  if (bottom > viewportHeight) return bottom - viewportHeight;
  return 0;
}
