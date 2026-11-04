import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type ViewParams = {
  /** The page's search params as the URL holds them now. */
  params: URLSearchParams;
  /** Writes `next` as the page's search params without moving the page. */
  setParams: (next: URLSearchParams) => void;
};

/** The one way a page reads and writes its own URL search params. A write replaces the
 * current history entry, so it adds no step to going back. */
export function useViewParams(): ViewParams {
  const [params, setSearchParams] = useSearchParams();
  const setParams = useCallback(
    (next: URLSearchParams) => {
      setSearchParams(next, { replace: true, preventScrollReset: true });
    },
    [setSearchParams],
  );
  return { params, setParams };
}
