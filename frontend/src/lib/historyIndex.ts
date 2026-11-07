/** Whether the browser's history holds a page in Flashy before the current one. False
 * under a router that does not keep its position in the browser's history, such as
 * `MemoryRouter`. */
export function hasEarlierPage(): boolean {
  // The router keeps its position in the browser's history here: a push adds 1, and a
  // replace or a reload keeps it, so 0 is a page opened by its address (ADR 099).
  const index: unknown = window.history.state?.idx;
  return typeof index === 'number' && index > 0;
}
