type ApiResult<T> = { data?: T; error?: unknown };

/** Thrown instead of a plain Error when `detail` is a structured object (ADR 022) — a
 * few endpoints answer with `{code, message, config_id}` because the message alone
 * isn't enough to act on (session start names the config that failed, so the caller
 * can render against that row). `.message` is still the same string `formatError`
 * would have produced; shape-aware callers `instanceof`-check and read `.detail`,
 * everyone else keeps catching a plain `Error` with an unchanged message. */
export class ApiDetailError extends Error {
  detail: { code: string; message: string; config_id?: string };

  constructor(detail: { code: string; message: string; config_id?: string }) {
    super(detail.message);
    this.detail = detail;
  }
}

function structuredDetail(
  detail: unknown,
): { code: string; message: string; config_id?: string } | undefined {
  if (typeof detail !== 'object' || detail === null) return undefined;
  const { code, message, config_id } = detail as Record<string, unknown>;
  if (typeof code !== 'string' || typeof message !== 'string') return undefined;
  return typeof config_id === 'string' ? { code, message, config_id } : { code, message };
}

function formatError(error: unknown): string {
  const detail =
    typeof error === 'object' && error !== null && 'detail' in error
      ? (error as { detail?: unknown }).detail
      : undefined;

  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => `${e.loc.join('.')}: ${e.msg}`).join('; ');
  }
  // A few endpoints answer with an object detail because the message alone isn't
  // enough to act on — session start names the config that failed, so the caller can
  // render against that row. Callers that care read `detail` off the response
  // themselves; this keeps the thrown message readable for everyone else.
  if (typeof detail === 'object' && detail !== null && 'message' in detail) {
    const { message } = detail as { message?: unknown };
    if (typeof message === 'string') return message;
  }
  return `An unknown error occurred (${error instanceof Error ? error.message : 'Inspect console for details'})`;
}

function toThrown(error: unknown): Error {
  const detail =
    typeof error === 'object' && error !== null && 'detail' in error
      ? (error as { detail?: unknown }).detail
      : undefined;
  const structured = structuredDetail(detail);
  if (structured) return new ApiDetailError(structured);
  return new Error(formatError(error));
}

export function unwrap<T>({ data, error }: ApiResult<T>): T {
  if (error) throw toThrown(error);
  return data as T;
}

export function unwrapVoid({ error }: ApiResult<unknown>): void {
  if (error) throw toThrown(error);
}
