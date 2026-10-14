'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { FinancialOverview, Transaction } from '@/types/dashboard';
import { INITIAL_TRANSACTIONS } from '@/lib/demoData';
import { computeFinancialOverview } from '@/lib/calculations';
import { getPreviousMonth } from '@/lib/month';
import { mapApiTransaction, type ApiTransaction } from '@/lib/mapApi';
import { useApp } from './AppProvider';

export type DataSource = 'live' | 'demo';
export type DataStatus = 'loading' | 'refreshing' | 'ok' | 'error';

interface LiveBundle {
  key: string; // "<month>|<currency>" the bundle belongs to
  overview: FinancialOverview;
  transactions: Transaction[]; // selected month + previous month
}

interface DashboardDataValue {
  overview: FinancialOverview;
  /** Selected + previous month (the cash-flow chart needs both). */
  transactions: Transaction[];
  source: DataSource;
  /** True when the user asked for live data but the database could not be reached. */
  fellBack: boolean;
  /** False while the first live response for the current scope is pending (show a skeleton). */
  ready: boolean;
  status: DataStatus;
  lastSuccessAt: number | null;
  lastAttemptAt: number | null;
  error: string | null;
  refresh: () => void;
}

const DashboardDataContext = createContext<DashboardDataValue | null>(null);

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`${url.split('?')[0]} responded ${res.status}`);
  return (await res.json()) as T;
}

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const { month, currency, dataSource, refreshSeconds } = useApp();
  const key = `${month}|${currency}`;

  const [bundle, setBundle] = useState<LiveBundle | null>(null);
  const [status, setStatus] = useState<DataStatus>('loading');
  const [lastSuccessAt, setLastSuccessAt] = useState<number | null>(null);
  const [lastAttemptAt, setLastAttemptAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const lastSuccessRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (dataSource === 'demo') return;
    // A request for this same scope is already running: do not stack another one.
    if (inFlight.current && !inFlight.current.signal.aborted) {
      return;
    }
    const controller = new AbortController();
    inFlight.current = controller;
    const id = ++requestId.current;
    const prev = getPreviousMonth(month);
    const q = `currency=${currency}&limit=100`;

    setStatus((s) => (s === 'ok' || s === 'error' ? 'refreshing' : s));
    setLastAttemptAt(Date.now());

    try {
      const [dash, cur, prv] = await Promise.all([
        fetchJson<{ overview: FinancialOverview }>(`/api/dashboard?month=${month}&currency=${currency}`, controller.signal),
        fetchJson<{ data: ApiTransaction[] }>(`/api/transactions?month=${month}&${q}`, controller.signal),
        fetchJson<{ data: ApiTransaction[] }>(`/api/transactions?month=${prev}&${q}`, controller.signal),
      ]);
      if (id !== requestId.current) return;
      const now = Date.now();
      setBundle({
        key,
        overview: dash.overview,
        transactions: [...cur.data, ...prv.data].map(mapApiTransaction),
      });
      lastSuccessRef.current = now;
      setLastSuccessAt(now);
      setError(null);
      setStatus('ok');
    } catch (e) {
      if (controller.signal.aborted || id !== requestId.current) return;
      setError(e instanceof Error ? e.message : 'Request failed');
      setStatus('error');
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, [dataSource, month, currency, key]);

  // Scope change (month / currency / source): cancel the old request and load again.
  useEffect(() => {
    inFlight.current?.abort();
    inFlight.current = null;
    requestId.current += 1;
    if (dataSource === 'demo') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset visible status for the new scope
    setStatus('loading');
    void load();
    return () => {
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [load, dataSource]);

  // Automatic refresh: paused while the tab is hidden, catches up when it becomes visible.
  useEffect(() => {
    if (dataSource === 'demo' || refreshSeconds <= 0) return;
    const ms = refreshSeconds * 1000;
    const tick = () => {
      if (!document.hidden) void load();
    };
    const timer = window.setInterval(tick, ms);
    const onVisible = () => {
      if (!document.hidden && (!lastSuccessRef.current || Date.now() - lastSuccessRef.current > ms)) void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [dataSource, refreshSeconds, load]);

  const demoTransactions = useMemo(() => INITIAL_TRANSACTIONS.filter((t) => t.currency === currency), [currency]);
  const demoOverview = useMemo(
    () => computeFinancialOverview(demoTransactions, month, currency),
    [demoTransactions, month, currency]
  );

  // Live data is used only if it belongs to the current scope. If the database never answered
  // for this scope, the labelled demo set is shown (never silently): `fellBack` drives the label.
  const useLive = dataSource === 'auto' && bundle !== null && bundle.key === key;
  const waitingForLive = dataSource === 'auto' && !useLive && status === 'loading';

  const value = useMemo<DashboardDataValue>(
    () => ({
      overview: useLive ? bundle!.overview : demoOverview,
      transactions: useLive ? bundle!.transactions : demoTransactions,
      source: useLive ? 'live' : 'demo',
      fellBack: dataSource === 'auto' && !useLive && !waitingForLive,
      ready: !waitingForLive,
      status: dataSource === 'demo' ? 'ok' : status,
      lastSuccessAt: useLive ? lastSuccessAt : null,
      lastAttemptAt: dataSource === 'demo' ? null : lastAttemptAt,
      error: dataSource === 'demo' ? null : error,
      refresh: () => void load(),
    }),
    [useLive, bundle, demoOverview, demoTransactions, dataSource, waitingForLive, status, lastSuccessAt, lastAttemptAt, error, load]
  );

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData(): DashboardDataValue {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) throw new Error('useDashboardData must be used inside <DashboardDataProvider>');
  return ctx;
}
