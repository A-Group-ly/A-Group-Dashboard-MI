'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import type { FinancialPositionData } from '@/components/providers/DashboardDataProvider';
import { formatCurrency } from '@/lib/calculations';
import { pctChange } from '@/lib/analytics';
import { formatRange } from '@/lib/period';

/**
 * The first thing on the dashboard: what has been paid, what is still owed, and what is expected by the
 * end of the current month. Figures are per currency (never combined) and come from invoices and payments.
 */
export default function FinancialPosition({ position }: { position: FinancialPositionData }) {
  const { t, lang, currency } = useApp();
  const fmt = (v: number) => formatCurrency(v, currency);
  const change = pctChange(position.paid, position.paidPrevious);
  const paidPlusOpen = position.paid + position.outstanding;
  const paidShare = paidPlusOpen > 0 ? (position.paid / paidPlusOpen) * 100 : 0;
  const monthEndLabel = formatRange({ from: position.monthEnd, to: position.monthEnd }, lang);

  const card = 'group flex flex-col justify-between border border-line bg-surface p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md';
  const label = 'text-[11px] font-bold uppercase tracking-[0.08em] text-muted';
  const big = 'mt-2 text-3xl font-bold tabular-nums tracking-tight text-ink';

  return (
    <section aria-labelledby="pos-title" className="mb-8">
      <h2 id="pos-title" className="mb-3 font-head text-sm font-bold text-ink">{t('pos.title')}</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 1. Total paid */}
        <div className={card}>
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className={label}>{t('pos.paid')}</span>
              <span className="border border-line px-1.5 py-0.5 text-[10px] font-semibold text-muted">{currency}</span>
            </div>
            <div dir="ltr" className={`${big} text-start rtl:text-end`}>{fmt(position.paid)}</div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-xs">
            <span dir="ltr" className={`font-bold tabular-nums ${change === null ? 'text-muted' : change >= 0 ? 'text-ok-ink' : 'text-bad-ink'}`}>
              {change === null ? `[${t('cmp.na')}]` : `[${change > 0 ? '+' : ''}${change.toFixed(1)}%]`}
            </span>
            <span className="text-muted">{t('scope.vs')} <span dir="ltr" className="tabular-nums">{fmt(position.paidPrevious)}</span></span>
            <span className="text-muted">· {position.paidCount} {t('pos.payments')}</span>
          </div>
        </div>

        {/* 2. Outstanding debts / remaining payments */}
        <div className={card}>
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className={label}>{t('pos.outstanding')}</span>
              {position.overdueCount > 0 && (
                <span className="bg-warn px-1.5 py-0.5 text-[10px] font-bold text-black">{position.overdueCount} {t('status.overdue')}</span>
              )}
            </div>
            <div dir="ltr" className={`${big} text-start rtl:text-end`}>{fmt(position.outstanding)}</div>
            <div
              className="mt-3 h-2 w-full bg-surface-2"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(paidShare)}
              aria-label={t('pos.paidShare')}
            >
              <div className="h-full bg-ink transition-all duration-500" style={{ width: `${paidShare}%` }} />
            </div>
            <div className="mt-1 text-[11px] text-muted">{t('pos.paidShare')}: <span dir="ltr" className="tabular-nums">{paidShare.toFixed(0)}%</span></div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
            <div>
              <dt className="text-muted">{t('status.overdue')}</dt>
              <dd dir="ltr" className={`font-bold tabular-nums ${position.overdue > 0 ? 'text-bad-ink' : 'text-ink'}`}>{fmt(position.overdue)}</dd>
            </div>
            <div>
              <dt className="text-muted">{t('pos.notYetDue')}</dt>
              <dd dir="ltr" className="font-bold tabular-nums text-ink">{fmt(position.notYetDue)}</dd>
            </div>
          </dl>
        </div>

        {/* 3. Expected by end of the current month */}
        <div className={card}>
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className={label}>{t('pos.expected')}</span>
              <span className="text-[10px] font-semibold text-muted" dir="auto">{monthEndLabel}</span>
            </div>
            <div dir="ltr" className={`${big} text-start rtl:text-end`}>{fmt(position.expectedByMonthEnd)}</div>
            <p className="mt-1 text-[11px] text-muted">{position.expectedByMonthEndCount} {t('pos.invoices')}</p>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
            <div>
              <dt className="text-muted">{t('pos.dueLater')}</dt>
              <dd dir="ltr" className="font-bold tabular-nums text-ink">{fmt(position.dueLaterThisMonth)}</dd>
            </div>
            <div>
              <dt className="text-muted">{t('pos.payables')} ({position.upcomingPayablesCount})</dt>
              <dd dir="ltr" className="font-bold tabular-nums text-ink">{fmt(position.upcomingPayables)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
