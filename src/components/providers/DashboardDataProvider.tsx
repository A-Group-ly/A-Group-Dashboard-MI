'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { FinancialOverview } from '@/types/dashboard';
import type { BreakdownItem, SeriesPoint } from '@/lib/server/finance';
import type { Range } from '@/lib/period';
import { useApp } from './AppProvider';

export type DataStatus = 'loading' | 'refreshing' | 'ok' | 'error';

export interface FinancialPositionData {
  currency: 'LYD' | 'USD';
  paid: number;
  paidPrevious: number;
  paidCount: number;
  outstanding: number;
  outstandingCount: number;
  overdue: number;
  overdueCount: number;
  notYetDue: number;
  expectedByMonthEnd: number;
  expectedByMonthEndCount: number;
  dueLaterThisMonth: number;
  monthEnd: string;
  upcomingPayables: number;
  upcomingPayablesCount: number;
}

export interface OverviewBundle {
  key: string;
  range: Range;
  previousRange: Range;
  overview: FinancialOverview;
  meta: { openingBalance: number; budgetCap: number; budgetConfigured: boolean; budgetProrated: boolean };
  series: { bucket: 'day' | 'week' | 'month'; points: SeriesPoint[] };
  breakdown: { expensesByCategory: BreakdownItem[]; incomeByPlatform: BreakdownItem[] };
  position: FinancialPositionData;
}

interface DashboardDataValue {
  data: OverviewBundle | null;
  /** True while there is nothing to show yet for the current scope. */
  loading: boolean;
  status: DataStatus;
  /** HTTP status of the last failure (401 / 403 / 5xx), if any. */
  errorStatus: number | null;
  error: string | null;
  lastSuccessAt: number | null;
  lastAttemptAt: number | null;
  /** Incremented after every successful refresh so other hooks can refetch in step. */
  version: number;
  refresh: () => void;
}

const Ctx = createContext<DashboardDataValue | null>(null);

class HttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const { range, previous, currency, refreshSeconds } = useApp();
  const key = `${range.from}|${range.to}|${currency}`;

  const [data, setData] = useState<OverviewBundle | null>(null);
  const [status, setStatus] = useState<DataStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [lastSuccessAt, setLastSuccessAt] = useState<number | null>(null);
  const [lastAttemptAt, setLastAttemptAt] = useState<number | null>(null);
  const [version, setVersion] = useState(0);

  const inFlight = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const lastSuccessRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    // A request for this scope is already running: never stack another one.
    if (inFlight.current && !inFlight.current.signal.aborted) return;
    const controller = new AbortController();
    inFlight.current = controller;
    const id = ++requestId.current;

    setStatus((s) => (s === 'ok' || s === 'error' ? 'refreshing' : s));
    setLastAttemptAt(Date.now());

    try {
      const qs = new URLSearchParams({
        from: range.from,
        to: range.to,
        prevFrom: previous.from,
        prevTo: previous.to,
        currency,
      });
      const res = await fetch(`/api/overview?${qs}`, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) throw new HttpError(res.status);
      const body = await res.json();
      if (id !== requestId.current) return;
      const now = Date.now();
      setData({ key, ...body });
      lastSuccessRef.current = now;
      setLastSuccessAt(now);
      setError(null);
      setErrorStatus(null);
      setStatus('ok');
      setVersion((v) => v + 1);
    } catch (e) {
      if (controller.signal.aborted || id !== requestId.current) return;
      setErrorStatus(e instanceof HttpError ? e.status : null);
      setError(e instanceof HttpError ? `Request failed (${e.status})` : 'Network error');
      setStatus('error');
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, [range.from, range.to, previous.from, previous.to, currency, key]);

  // Scope change: cancel the old request and load for the new scope.
  useEffect(() => {
    inFlight.current?.abort();
    inFlight.current = null;
    requestId.current += 1;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset visible status for the new scope
    setStatus('loading');
    void load();
    return () => {
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [load]);

  // Automatic refresh: paused while the tab is hidden, catches up when it becomes visible.
  useEffect(() => {
    if (refreshSeconds <= 0) return;
    const ms = refreshSeconds * 1000;
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, ms);
    const onVisible = () => {
      if (!document.hidden && (!lastSuccessRef.current || Date.now() - lastSuccessRef.current > ms)) void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshSeconds, load]);

  // Only data that belongs to the current scope is shown; stale scope data is never presented as current.
  const usable = data && data.key === key ? data : null;

  const value = useMemo<DashboardDataValue>(
    () => ({
      data: usable,
      loading: usable === null && status !== 'error',
      status,
      errorStatus,
      error,
      lastSuccessAt,
      lastAttemptAt,
      version,
      refresh: () => void load(),
    }),
    [usable, status, errorStatus, error, lastSuccessAt, lastAttemptAt, version, load]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboardData(): DashboardDataValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDashboardData must be used inside <DashboardDataProvider>');
  return ctx;
}
