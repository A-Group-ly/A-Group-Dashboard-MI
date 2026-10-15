'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import type { OverviewBundle } from '@/components/providers/DashboardDataProvider';
import { formatCurrency } from '@/lib/calculations';
import LineChart from './LineChart';
import BarChart from './BarChart';
import DonutChart from './DonutChart';
import { shortDate } from './chartUtils';

type Tab = 'trend' | 'compare' | 'mix';

const PM_LABELS: Record<string, { en: string; ar: string }> = {
  CASH: { en: 'Cash', ar: 'نقدي' },
  LOCAL_CARD: { en: 'Local Card', ar: 'بطاقة محلية' },
  INTERNATIONAL_CARD: { en: 'International Card', ar: 'بطاقة دولية' },
  BANK_TRANSFER: { en: 'Bank Transfer', ar: 'تحويل بنكي' },
  DIGITAL_WALLET: { en: 'Digital Wallet', ar: 'محفظة رقمية' },
  OTHER: { en: 'Other', ar: 'أخرى' },
  NOT_APPLICABLE: { en: 'N/A', ar: 'غير محدد' },
};

/**
 * One place for every visualisation: Trend (line), Compare (bars) and Mix (pie/donut).
 * Same data, same filters, same legend colours (income = ink, expenses = coral, previous period = muted/dashed).
 */
export default function ChartsSection({ data }: { data: OverviewBundle }) {
  const { t, tr, lang, currency } = useApp();
  const [tab, setTab] = useState<Tab>('trend');
  const fmt = (v: number) => formatCurrency(v, currency);

  const o = data.overview;
  const { points, bucket } = data.series;

  const labels = useMemo(() => points.map((p) => shortDate(p.start, lang, bucket)), [points, lang, bucket]);

  const trendSeries = useMemo(
    () => [
      { key: 'inc', name: tr.income, color: 'var(--chart-2)', values: points.map((p) => p.income) },
      { key: 'exp', name: tr.expenses, color: 'var(--chart-1)', values: points.map((p) => p.expenses) },
      { key: 'pinc', name: `${tr.income} · ${t('cmp.previous')}`, color: 'var(--chart-3)', dashed: true, values: points.map((p) => p.prevIncome) },
      { key: 'pexp', name: `${tr.expenses} · ${t('cmp.previous')}`, color: 'var(--chart-5)', dashed: true, values: points.map((p) => p.prevExpenses) },
    ],
    [points, tr, t]
  );

  const compareLabels = [tr.kpiIncome, tr.kpiExpenses, tr.kpiNetResult, tr.kpiCashCollected];
  const compareSeries = [
    { key: 'cur', name: t('cmp.current'), color: 'var(--chart-1)', values: [o.totalIncome.current, o.totalExpenses.current, Math.max(o.netResult.current, 0), o.cashCollected.current] },
    { key: 'prev', name: t('cmp.previous'), color: 'var(--chart-3)', values: [o.totalIncome.previous, o.totalExpenses.previous, Math.max(o.netResult.previous, 0), o.cashCollected.previous] },
  ];

  const pm = (m: string) => PM_LABELS[m]?.[lang] ?? m;
  const tabs: [Tab, string][] = [
    ['trend', t('chart.trend')],
    ['compare', t('chart.compare')],
    ['mix', t('chart.mix')],
  ];

  return (
    <section className="mb-6 border border-line bg-surface" aria-labelledby="charts-title">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <h2 id="charts-title" className="font-head text-sm font-bold text-ink">{t('chart.title')}</h2>
        <div role="tablist" aria-label={t('chart.title')} className="ms-auto flex border border-line-strong">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              role="tab"
              type="button"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 ${tab === k ? 'bg-ink text-ink-contrast' : 'text-ink-2 hover:bg-surface-2'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="p-5">
        {tab === 'trend' && (
          <>
            <p className="mb-3 text-xs text-muted">{t('chart.trendHint')}</p>
            <LineChart labels={labels} series={trendSeries} format={fmt} ariaLabel={`${t('chart.trend')} — ${currency}`} />
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2">
              {trendSeries.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-5" style={{ background: s.color, borderTop: s.dashed ? `2px dashed ${s.color}` : undefined, height: s.dashed ? 0 : 3 }} aria-hidden="true" />
                  {s.name}
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === 'compare' && (
          <>
            <p className="mb-3 text-xs text-muted">{t('chart.compareHint')}</p>
            <BarChart labels={compareLabels} series={compareSeries} format={fmt} ariaLabel={`${t('chart.compare')} — ${currency}`} />
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2">
              {compareSeries.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5" style={{ background: s.color }} aria-hidden="true" />{s.name}</li>
              ))}
            </ul>
          </>
        )}

        {tab === 'mix' && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <DonutChart title={t('cmp.expByCategory')} totalLabel={tr.expenses} format={fmt} emptyText={t('f.empty')} slices={data.breakdown.expensesByCategory.map((b) => ({ key: b.key, label: lang === 'ar' ? b.labelAr : b.label, value: b.current }))} />
            <DonutChart title={t('cmp.incByPlatform')} totalLabel={tr.income} format={fmt} emptyText={t('f.empty')} slices={data.breakdown.incomeByPlatform.map((b) => ({ key: b.key, label: b.label, value: b.current }))} />
            <DonutChart title={tr.incomeByPaymentMethod} totalLabel={tr.income} format={fmt} emptyText={tr.noPaymentData} slices={o.incomeByPaymentMethod.map((b) => ({ key: b.paymentMethod, label: pm(b.paymentMethod), value: b.amount }))} />
            <DonutChart title={tr.expensesByPaymentMethod} totalLabel={tr.expenses} format={fmt} emptyText={tr.noPaymentData} slices={o.expensesByPaymentMethod.map((b) => ({ key: b.paymentMethod, label: pm(b.paymentMethod), value: b.amount }))} />
          </div>
        )}
      </div>
    </section>
  );
}
