'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { Card, DemoNotice, ErrorState, PageHeader, PageSkeleton } from '@/components/ui/primitives';
import KpiCard from '@/components/KpiCard';
import BudgetBurndown from '@/components/BudgetBurndown';
import ScopeBar from '@/components/ScopeBar';
import LineChart from '@/components/charts/LineChart';
import { shortDate } from '@/components/charts/chartUtils';
import { formatCurrency } from '@/lib/calculations';

/** Running total; a null input stays null (no data for that bucket) and does not reset the total. */
function runningTotal(values: (number | null)[]): (number | null)[] {
  let sum = 0;
  return values.map((v) => {
    if (v === null) return null;
    sum += v;
    return sum;
  });
}

export default function BudgetsPage() {
  const { t, tr, lang, currency } = useApp();
  const { data, loading, error, refresh } = useDashboardData();

  if (loading) return <PageSkeleton />;
  if (!data) return <ErrorState message={error ?? t('err.server')} onRetry={refresh} />;
  const o = data.overview;
  const fmt = (v: number) => formatCurrency(v, currency);

  // Cumulative net over the period: how cash builds (or burns) bucket by bucket.
  const cumulative = runningTotal(data.series.points.map((p) => p.income - p.expenses));
  const cumulativePrev = runningTotal(data.series.points.map((p) => (p.prevIncome === null ? null : p.prevIncome - (p.prevExpenses ?? 0))));

  return (
    <>
      <PageHeader title={t('bud.title')} subtitle={t('bud.sub')} />
      <ScopeBar showPlatform={false} />
      <DemoNotice text={tr.demoDataNotice} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard title={tr.kpiAvailableCash} metric={o.availableCash} subtitle={tr.illustrativeEstimate} language={lang} sentimentType="neutral" />
        <KpiCard
          title={tr.kpiRemainingBudget}
          metric={o.remainingBudget}
          subtitle={!data.meta.budgetConfigured ? t('budget.none') : o.budgetOverrun > 0 ? tr.budgetOverrunLabel : data.meta.budgetProrated ? t('budget.prorated') : tr.allocatedCap}
          language={lang}
          sentimentType={o.budgetOverrun > 0 ? 'expense' : 'neutral'}
        />
        <KpiCard title={tr.kpiNetResult} metric={o.netResult} subtitle={tr.vsLastMonth} language={lang} sentimentType="net" />
      </div>
      <p className="mb-6 mt-3 text-xs text-muted">{t('bud.cashNote')}</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title={t('bud.cumulative')} hint={t('bud.cumulativeHint')}>
            <LineChart
              labels={data.series.points.map((p) => shortDate(p.start, lang, data.series.bucket))}
              series={[
                { key: 'cur', name: t('cmp.current'), color: 'var(--chart-1)', values: cumulative },
                { key: 'prev', name: t('cmp.previous'), color: 'var(--chart-3)', dashed: true, values: cumulativePrev },
              ]}
              format={fmt}
              ariaLabel={`${t('bud.cumulative')} — ${currency}`}
              height={240}
            />
          </Card>
        </div>
        <BudgetBurndown
          currentExpenses={o.totalExpenses.current}
          remainingBudget={o.remainingBudget.current}
          upcomingTotal={o.upcomingObligationsTotal}
          budgetOverrun={o.budgetOverrun}
          currency={currency}
          language={lang}
          budgetCap={data.meta.budgetCap}
        />
      </div>

      <Card title={tr.upcomingObligations} hint={tr.dueSoon}>
        <p dir="ltr" className="text-2xl font-bold tabular-nums text-ink">{fmt(o.upcomingObligationsTotal)}</p>
      </Card>
    </>
  );
}
