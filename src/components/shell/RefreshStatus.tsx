'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Interactive freshness indicator. The timestamp only moves after a *successful* fetch;
 * the last attempt is tracked separately and shown in the tooltip.
 */
export default function RefreshStatus() {
  const { t, refreshSeconds, dataSource } = useApp();
  const { source, fellBack, status, lastSuccessAt, lastAttemptAt, refresh } = useDashboardData();

  // `now` lives in state so rendering stays pure; it is refreshed on a timer.
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const staleMs = refreshSeconds > 0 ? Math.max(refreshSeconds * 3000, 90000) : 600000;
  const stale = lastSuccessAt !== null && now > 0 && now - lastSuccessAt > staleMs;
  const busy = status === 'loading' || status === 'refreshing';

  if (dataSource === 'demo') {
    return (
      <span className="border border-header-line px-2.5 py-1 text-xs text-header-ink/80" title={t('ref.demo')}>
        {t('ref.demo')}
      </span>
    );
  }

  let label: string;
  let tone = 'text-header-ink';
  if (busy) {
    label = t('ref.refreshing');
  } else if (status === 'error') {
    label = t('ref.failed');
    tone = 'text-warn';
  } else if (fellBack) {
    label = t('ref.demoFallback');
    tone = 'text-warn';
  } else if (stale) {
    label = t('ref.outdated');
    tone = 'text-warn';
  } else if (source === 'live' && lastSuccessAt) {
    label = `${t('ref.updated')} ${formatTime(lastSuccessAt)}`;
  } else {
    label = t('ref.refreshing');
  }

  const tooltip = [
    t('ref.hint'),
    lastSuccessAt ? `${t('ref.lastOk')}: ${formatTime(lastSuccessAt)}` : null,
    lastAttemptAt ? `${t('ref.lastTry')}: ${formatTime(lastAttemptAt)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={busy}
      aria-busy={busy}
      aria-label={`${label}. ${t('ref.hint')}`}
      title={tooltip}
      className={`inline-flex items-center gap-2 border border-header-line px-2.5 py-1 text-xs hover:bg-white/10 disabled:cursor-wait ${tone}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={busy ? 'animate-spin' : ''}
      >
        <path d="M21 12a9 9 0 1 1-2.6-6.4" />
        <path d="M21 3v6h-6" />
      </svg>
      <span aria-live="polite" dir="auto">
        {label}
      </span>
    </button>
  );
}
