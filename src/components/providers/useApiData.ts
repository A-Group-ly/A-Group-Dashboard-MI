'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDashboardData } from './DashboardDataProvider';
import { fetchRetry } from '@/lib/fetchRetry';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  /** HTTP status of the last failure (401 / 403 / 404 / 5xx) or 0 for a network error. */
  errorStatus: number | null;
  retry: () => void;
}

/**
 * Fetch JSON from an authenticated API route.
 * - cancels the request when the URL changes or the component unmounts
 * - keeps the last valid data while refreshing (no blank flash, no zeros on failure)
 * - refetches when the global refresh status succeeds (click or auto-refresh), so pages stay in step
 */
/** Last good answer per URL, kept for the session: going back to a page paints at once, then refreshes quietly. */
const memo = new Map<string, unknown>();

export function useApiData<T>(url: string | null): ApiState<T> {
  const { version } = useDashboardData();
  const [state, setState] = useState<{ url: string | null; data: T | null; errorStatus: number | null; loading: boolean }>(() => ({
    url,
    data: url && memo.has(url) ? (memo.get(url) as T) : null,
    errorStatus: null,
    loading: !(url && memo.has(url)),
  }));
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const remembered = memo.has(url) ? (memo.get(url) as T) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mark loading for the new request
    setState((s) => (s.url === url && s.data !== null ? { ...s, errorStatus: null } : { url, data: remembered, errorStatus: null, loading: remembered === null }));
    // After a change or a manual refresh the server's short cache is skipped.
    const target = nonce > 0 || version > 0 ? `${url}${url.includes('?') ? '&' : '?'}fresh=1` : url;
    fetchRetry(target, { signal: controller.signal, cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw Object.assign(new Error('http'), { status: res.status });
        const body = (await res.json()) as T;
        memo.set(url, body);
        setState({ url, data: body, errorStatus: null, loading: false });
      })
      .catch((e: { name?: string; status?: number }) => {
        if (e?.name === 'AbortError') return;
        setState((s) => ({ url, data: s.url === url ? s.data : null, errorStatus: e?.status ?? 0, loading: false }));
      });
    return () => controller.abort();
    // `version` is intentionally a dependency: a successful global refresh refetches page data too.
  }, [url, nonce, version]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  return {
    data: state.url === url ? state.data : null,
    loading: state.loading || (url !== null && state.url !== url && state.errorStatus === null),
    errorStatus: state.url === url ? state.errorStatus : null,
    retry,
  };
}
