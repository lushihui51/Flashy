type ApiResult<T> = { data?: T; error?: unknown };

function formatError(error: unknown): string {
  const detail =
    typeof error === 'object' && error !== null && 'detail' in error
      ? (error as { detail?: unknown }).detail
      : undefined;

  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => `${e.loc.join('.')}: ${e.msg}`).join('; ');
  }
  return `An unknown error occurred (${error instanceof Error ? error.message : 'Inspect console for details'})`;
}

export function unwrap<T>({ data, error }: ApiResult<T>): T {
  if (error) throw new Error(formatError(error));
  return data as T;
}

export function unwrapVoid({ error }: ApiResult<unknown>): void {
  if (error) throw new Error(formatError(error));
}
