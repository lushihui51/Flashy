import { useEffect, useRef, useSyncExternalStore } from 'react';
import { onlineManager, useQuery, useQueryClient } from '@tanstack/react-query';
import { readHealth } from 'src/api/health';
import { ApiError } from 'src/api/unwrap';

export type ConnectionStatus = 'online' | 'offline' | 'unreachable' | 'server_trouble';

export const HEALTH_POLL_HEALTHY_MS = 30_000;
export const HEALTH_POLL_FAILING_MS = 5_000;

/** The app's connection state (ADR 062, ADR 063). Only `AppShell` calls this, which is
 * what makes the `['health']` query shell-owned. Offline comes from `onlineManager`,
 * which this never sets; server health comes from the polled probe, never from
 * watching other requests. */
export function useConnectionStatus(): ConnectionStatus {
  const isOnline = useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );

  const health = useQuery({
    queryKey: ['health'],
    queryFn: readHealth,
    retry: false,
    refetchInterval: (query) =>
      query.state.status === 'error' ? HEALTH_POLL_FAILING_MS : HEALTH_POLL_HEALTHY_MS,
  });

  // Recovery (ADR 063): when the probe goes from failing to healthy, rerun every active
  // query that failed, once. Mutations are never touched.
  const queryClient = useQueryClient();
  const previousStatus = useRef(health.status);
  useEffect(() => {
    if (previousStatus.current === 'error' && health.status === 'success') {
      void queryClient.refetchQueries({
        type: 'active',
        predicate: (query) => query.state.status === 'error',
      });
    }
    previousStatus.current = health.status;
  }, [health.status, queryClient]);

  if (!isOnline) return 'offline';
  if (health.status === 'error') {
    return health.error instanceof ApiError ? 'server_trouble' : 'unreachable';
  }
  return 'online';
}
