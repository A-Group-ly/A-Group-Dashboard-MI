'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { formatCurrency } from '@/lib/calculations';

/** Headline counters: customers, subscriptions and monthly recurring revenue (each currency on its own). */
export default function PulseStrip() {
  const { t } = useApp();
  const { pulse } = useDashboardData();
  const { can } = useAccess();
  if (!pulse) return null;
  const card = 'flex flex-col justify-between border border-line bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md';
  const label = 'text-[11px] font-bold uppercase tracking-[0.08em] text-muted';
  const num = (n: number) => n.toLocaleString('en-US');
  const wrap = (href: string, ok: boolean, body: React.ReactNode) => (ok ? <Link href={href} className="block">{body}</Link> : <>{body}</>);

  return (
    <section aria-label={t('pulse.title')} className="mb-6">
      <h2 className="mb-3 font-head text-sm font-bold text-ink">{t('pulse.title')}</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {wrap('/customers', can('customers:view'), (
          <div className={card}>
            <span className={label}>{t('pulse.customers')}</span>
            <div dir="ltr" className="mt-1 text-2xl font-bold tabular-nums text-ink">{num(pulse.customers)}</div>
            <div className="mt-1 text-[11px] text-muted"><span dir="ltr" className="font-semibold tabular-nums text-ok-ink">+{num(pulse.newCustomers)}</span> {t('pulse.newInPeriod')} · <span dir="ltr" className="tabular-nums">{num(pulse.activeCustomers)}</span> {t('status.active')}</div>
          </div>
        ))}
        {wrap('/subscriptions', can('subscriptions:view'), (
          <div className={card}>
            <span className={label}>{t('pulse.activeSubs')}</span>
            <div dir="ltr" className="mt-1 text-2xl font-bold tabular-nums text-ink">{num(pulse.subscriptions.active)}</div>
            <div className="mt-1 text-[11px] text-muted">
              <span dir="ltr" className="tabular-nums">{num(pulse.subscriptions.trial)}</span> {t('status.trial')} · <span dir="ltr" className={`tabular-nums ${pulse.subscriptions.pastDue ? 'font-semibold text-bad-ink' : ''}`}>{num(pulse.subscriptions.pastDue)}</span> {t('status.past_due')}
            </div>
          </div>
        ))}
        <div className={`${card} col-span-2`}>
          <span className={label}>{t('pulse.mrr')}</span>
          <div className="mt-1 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-semibold text-muted">USD</div>
              <div dir="ltr" className="text-xl font-bold tabular-nums text-ink">{formatCurrency(pulse.mrr.USD, 'USD')}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-muted">LYD</div>
              <div dir="ltr" className="text-xl font-bold tabular-nums text-ink">{formatCurrency(pulse.mrr.LYD, 'LYD')}</div>
            </div>
          </div>
          <div className="mt-1 text-[11px] text-muted">{t('pulse.mrrHint')}</div>
        </div>
      </div>
    </section>
  );
}
