/**
 * ADR 024: `returnTo` rides the URL, never router state — state doesn't survive a
 * round trip forwarded through an intermediate page. The param is user-editable
 * (typed, bookmarked, shared), so a value that isn't an app-internal path is treated
 * as absent rather than navigated to: react-router would otherwise try to route a
 * full external URL as an app path and land on a confusing dead page.
 */
export function internalReturnTo(searchParams: URLSearchParams): string | null {
  const value = searchParams.get('returnTo');
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}
