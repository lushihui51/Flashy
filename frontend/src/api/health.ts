import { client } from 'src/api/client';
import { CONNECTION_FAILED_MESSAGE, unwrap } from 'src/api/unwrap';

/** Must exceed the backend's `DB_CONNECT_TIMEOUT_SECONDS * 1000`, so a silent database
 * answers 503 before the probe gives up (ADR 063, task 020 MD-1); a source-scan test in
 * `tests/api_tests/test_health.py` guards the ordering. */
export const HEALTH_PROBE_TIMEOUT_MS = 8_000;

/** The health probe (ADR 063). A timeout rejects with a plain `Error`, never an
 * `ApiError`, so it reads as can't connect. No `AbortSignal`: under jsdom, Node's
 * `Request` rejects jsdom's `AbortSignal`. */
export async function readHealth(): Promise<{ [key: string]: string }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(CONNECTION_FAILED_MESSAGE)), HEALTH_PROBE_TIMEOUT_MS);
  });
  try {
    return unwrap(await Promise.race([client.GET('/api/health'), timeout]));
  } finally {
    clearTimeout(timer);
  }
}
