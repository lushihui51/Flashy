export const CONNECTION_FAILED_MESSAGE =
  "Couldn't reach Flashy. Check your connection and try again.";
export const SERVER_TROUBLE_MESSAGE =
  'Flashy is having trouble right now. Try again in a moment.';

const UNKNOWN_ERROR_MESSAGE = 'An unknown error occurred (Inspect console for details)';

type ApiResult<T> = { data?: T; error?: unknown; response: Response };

/** Thrown for every non-ok response (ADR 065): `status` is the HTTP status, so callers
 * can tell a 404 from an outage without matching message text. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Thrown instead of a bare ApiError when `detail` is a structured object (ADR 022) — a
 * few endpoints answer with `{code, message, config_id}` because the message alone
 * isn't enough to act on (session start names the config that failed, so the caller
 * can render against that row). It extends `ApiError`, so it carries `status` too;
 * `.message` is `detail.message`. Shape-aware callers `instanceof`-check and read
 * `.detail`, everyone else reads the message. */
export class ApiDetailError extends ApiError {
  detail: { code: string; message: string; config_id?: string };

  constructor(status: number, detail: { code: string; message: string; config_id?: string }) {
    super(status, detail.message);
    this.detail = detail;
  }
}

function detailOf(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'detail' in error
    ? (error as { detail?: unknown }).detail
    : undefined;
}

function structuredDetail(
  detail: unknown,
): { code: string; message: string; config_id?: string } | undefined {
  if (typeof detail !== 'object' || detail === null) return undefined;
  const { code, message, config_id } = detail as Record<string, unknown>;
  if (typeof code !== 'string' || typeof message !== 'string') return undefined;
  return typeof config_id === 'string' ? { code, message, config_id } : { code, message };
}

/** The readable text of a usable `detail`, or `undefined` when there is none. */
function formatError(error: unknown): string | undefined {
  const detail = detailOf(error);

  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => `${e.loc.join('.')}: ${e.msg}`).join('; ');
  }
  // A few endpoints answer with an object detail because the message alone isn't
  // enough to act on — session start names the config that failed, so the caller can
  // render against that row. Shape-aware callers catch `ApiDetailError` (ADR 022).
  if (typeof detail === 'object' && detail !== null && 'message' in detail) {
    const { message } = detail as { message?: unknown };
    if (typeof message === 'string') return message;
  }
  return undefined;
}

function toThrown(status: number, error: unknown): ApiError {
  const structured = structuredDetail(detailOf(error));
  if (structured) return new ApiDetailError(status, structured);
  const text = formatError(error);
  if (text !== undefined) return new ApiError(status, text);
  return new ApiError(status, status >= 500 ? SERVER_TROUBLE_MESSAGE : UNKNOWN_ERROR_MESSAGE);
}

// ADR 065: failure is decided by `response.ok` alone. openapi-fetch reports an
// empty-body failure as `error: ""` or `error: undefined`, so `error` decides nothing.
export function unwrap<T>({ data, error, response }: ApiResult<T>): T {
  if (!response.ok) throw toThrown(response.status, error);
  return data as T;
}

export function unwrapVoid({ error, response }: ApiResult<unknown>): void {
  if (!response.ok) throw toThrown(response.status, error);
}

/** The one 404 test (ADR 065). */
export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
