/**
 * New practice's selection as it rides the URL (ADR 061): one `config=<id>` param per
 * selected deck configuration, in the order they were ticked. Pure helpers over
 * `URLSearchParams` — the page owns the `setSearchParams(…, { replace: true })`.
 */

const PARAM = 'config';

/** The `config` params, de-duplicated, first occurrence first (MD-8). */
export function readSelectedConfigIds(searchParams: URLSearchParams): string[] {
  return [...new Set(searchParams.getAll(PARAM))];
}

/** A copy of `searchParams` whose `config` params are exactly `ids`, in order; every
 * other param untouched. */
export function withSelectedConfigIds(
  searchParams: URLSearchParams,
  ids: readonly string[],
): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  params.delete(PARAM);
  for (const id of ids) params.append(PARAM, id);
  return params;
}

/** Makes `configId` its deck's one selection (MD-1): drops every id in `deckConfigIds`,
 * then appends `configId`. */
export function selectConfig(
  selectedIds: readonly string[],
  deckConfigIds: readonly string[],
  configId: string,
): string[] {
  const dropped = new Set(deckConfigIds);
  dropped.add(configId);
  return [...selectedIds.filter((id) => !dropped.has(id)), configId];
}

/** One tap on a checkbox (MD-1): removes `configId` if selected, otherwise `selectConfig`. */
export function toggleConfig(
  selectedIds: readonly string[],
  deckConfigIds: readonly string[],
  configId: string,
): string[] {
  return selectedIds.includes(configId)
    ? selectedIds.filter((id) => id !== configId)
    : selectConfig(selectedIds, deckConfigIds, configId);
}
