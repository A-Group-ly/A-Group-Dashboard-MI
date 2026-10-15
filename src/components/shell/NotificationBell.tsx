'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { useAnchoredPopover } from '@/components/ui/useAnchoredPopover';

interface Counts {
  overdueInvoices: number;
  failedPayments: number;
  pastDueSubscriptions: number;
  renewalsSoon: number;
  high: number;
  total: number;
}

/** Bell with the number of items that need attention; the menu summarises them and links to the alerts page. */
export default function NotificationBell() {
  const { t } = useApp();
  const { can } = useAccess();
  const { version } = useDashboardData();
  const allowed = can('alerts:view');
  const [counts, setCounts] = useState<Counts | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useAnchoredPopover(open, trigger, 304);

  useEffect(() => {
    if (!allowed) return;
    const c = new AbortController();
    fetch('/api/alerts/count', { signal: c.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCounts(d as Counts))
      .catch(() => {});
    return () => c.abort();
  }, [allowed, version]);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  if (!allowed) return null;
  const rows: [string, number, boolean][] = counts
    ? [
        [t('alert.overdueInvoice'), counts.overdueInvoices, true],
        [t('alert.failedPayment'), counts.failedPayments, true],
        [t('alert.pastDueSub'), counts.pastDueSubscriptions, false],
        [t('alert.renewalDue'), counts.renewalsSoon, false],
      ]
    : [];

  return (
    <div ref={ref} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('bell.title')}${counts ? `: ${counts.high}` : ''}`}
        className="relative border border-header-line px-2.5 py-1 text-sm transition-colors duration-150 hover:bg-white/10 active:scale-95"
      >
        <span aria-hidden="true">🔔</span>
        {counts && counts.high > 0 && (
          <span className="absolute -end-1.5 -top-1.5 grid min-w-[18px] place-items-center rounded-full bg-bad-ink px-1 text-[10px] font-bold leading-[18px] text-white">{counts.high > 99 ? '99+' : counts.high}</span>
        )}
      </button>
      {open && (
        <div role="menu" style={pop} className="z-50 border border-line bg-surface text-ink shadow-lg">
          <div className="border-b border-line px-4 py-2.5 text-sm font-semibold">{t('bell.title')}</div>
          <ul className="divide-y divide-line">
            {rows.map(([label, n, high]) => (
              <li key={label} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-ink-2">{label}</span>
                <span dir="ltr" className={`min-w-[2rem] text-end font-bold tabular-nums ${n > 0 && high ? 'text-bad-ink' : 'text-ink'}`}>{n.toLocaleString('en-US')}</span>
              </li>
            ))}
            {!counts && <li className="px-4 py-3 text-xs text-muted">…</li>}
          </ul>
          <Link href="/alerts" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-2.5 text-xs font-semibold text-accent-strong hover:bg-surface-2">
            {t('bell.viewAll')} →
          </Link>
        </div>
      )}
    </div>
  );
}
