/** `cancelTo` is the page a form's Cancel returns to, `returnTo` the page its Create or
 * Save returns to. Neither stands in for the other. */
export type ReturnAddressKey = 'cancelTo' | 'returnTo';

/** The named return address, when it is an app-internal path: it starts with `/` and
 * not with `//`. Null when absent, empty or anything else. */
export function internalReturnTo(
  searchParams: URLSearchParams,
  key: ReturnAddressKey,
): string | null {
  const value = searchParams.get(key);
  if (!value) return null;
  // The parameter is user-editable, and react-router would route a full external URL as
  // an app path, landing on a dead page.
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

/** Search params for opening a form that comes back to `location` under each of `keys`.
 * The location's own search rides inside the value, so an address it already carries
 * survives the round trip. */
export function returnAddressParams(
  location: { pathname: string; search: string },
  ...keys: ReturnAddressKey[]
): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of keys) params.set(key, `${location.pathname}${location.search}`);
  return params;
}
