'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { FinancialOverview } from '@/types/dashboard';
import type { BreakdownItem, PlatformSummary, SeriesPoint } from '@/lib/server/finance';
import type { Range } from '@/lib/period';
import { useApp, useCurrencyScope } from './AppProvider';
import { PLATFORM_BY_CODE } from '@/lib/mapApi';
import { fetchRetry } from '@/lib/fetchRetry';
import type { Currency } from '@/types/dashboard';

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

export interface MonthSpendingData {
  monthStart: string;
  monthEnd: string;
  spentToDate: number;
  spentCount: number;
  scheduledToMonthEnd: number;
  scheduledCount: number;
  projected: number;
  budgetCap: number;
  budgetConfigured: boolean;
}

export interface OverviewBundle {
  range: Range;
  previousRange: Range;
  overview: FinancialOverview;
  meta: { openingBalance: number; budgetCap: number; budgetConfigured: boolean; budgetProrated: boolean };
  series: { bucket: 'day' | 'week' | 'month'; points: SeriesPoint[] };
  breakdown: { expensesByCategory: BreakdownItem[]; incomeByPlatform: BreakdownItem[] };
  position: FinancialPositionData;
  spending: MonthSpendingData;
  platforms: PlatformSummary[];
}

type ByCurrency = Record<Currency, OverviewBundle>;
export interface PulseData {
  customers: number;
  activeCustomers: number;
  newCustomers: number;
  subscriptions: { active: number; trial: number; pastDue: number; paused: number };
  mrr: Record<Currency, number>;
}

interface Loaded {
  key: string;
  currencies: ByCurrency;
  pulse: PulseData;
}

interface DashboardState {
  /** Both currencies, side by side. */
  all: ByCurrency | null;
  /** Headline counters (customers, subscriptions, MRR). */
  pulse: PulseData | null;
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

const Ctx = createContext<DashboardState | null>(null);

/** What consumers see: the state plus the data of the enclosing <CurrencyScope> currency (LYD outside any scope). */
export interface DashboardDataValue extends DashboardState {
  data: OverviewBundle | null;
}

class HttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const { range, previous, refreshSeconds, platform } = useApp();
  const platformCode = platform === 'all' ? '' : (Object.entries(PLATFORM_BY_CODE).find(([, label]) => label === platform)?.[0] ?? '');
  const key = `${range.from}|${range.to}|${platformCode}`;

  const [data, setData] = useState<Loaded | null>(null);
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
      });
      if (platformCode) qs.set('platform', platformCode);
      const res = await fetchRetry(`/api/overview?${qs}`, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) throw new HttpError(res.status);
      const body = await res.json();
      if (id !== requestId.current) return;
      const now = Date.now();
      setData({ key, currencies: body.currencies, pulse: body.pulse });
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
  }, [range.from, range.to, previous.from, previous.to, platformCode, key]);

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
  const usable = data && data.key === key ? data.currencies : null;
  const pulse = data && data.key === key ? data.pulse : null;

  const value = useMemo<DashboardState>(
    () => ({
      all: usable,
      pulse,
      loading: usable === null && status !== 'error',
      status,
      errorStatus,
      error,
      lastSuccessAt,
      lastAttemptAt,
      version,
      refresh: () => void load(),
    }),
    [usable, pulse, status, errorStatus, error, lastSuccessAt, lastAttemptAt, version, load]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboardData(): DashboardDataValue {
  const ctx = useContext(Ctx);
  const scope = useCurrencyScope();
  if (!ctx) throw new Error('useDashboardData must be used inside <DashboardDataProvider>');
  return { ...ctx, data: ctx.all ? ctx.all[scope] : null };
}
