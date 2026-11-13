import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasEarlierPage } from 'src/lib/historyIndex';

/** The way a form leaves for `target`, an app path, with `state` as a one-shot arrival
 * result for the page there. With an earlier page in Flashy's history (`hasEarlierPage()`),
 * it steps back one entry to the form's opener, then replaces that entry with `target` and
 * `state` when the opener's address differs from `target` or `state` is given; otherwise it
 * replaces the form's own entry with `target` and `state`. The promise settles once `target` is current. */
export function useLeaveForm(): (target: string, state?: Record<string, unknown>) => Promise<void> {
  const navigate = useNavigate();
  return useCallback(
    async (target: string, state?: Record<string, unknown>) => {
      if (!hasEarlierPage()) {
        await navigate(target, { replace: true, state });
        return;
      }
      await navigate(-1);
      const openerAddress = `${window.location.pathname}${window.location.search}`;
      if (openerAddress !== target || state !== undefined) {
        await navigate(target, { replace: true, state });
      }
    },
    [navigate],
  );
}
