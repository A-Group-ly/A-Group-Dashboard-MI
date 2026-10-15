'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { PageSkeleton } from '@/components/ui/primitives';
import KpiCard from '@/components/KpiCard';
import BudgetBurndown from '@/components/BudgetBurndown';
import PaymentChannelBreakdown from '@/components/PaymentChannelBreakdown';
import ComparisonBars from '@/components/charts/ComparisonBars';
import dynamic from 'next/dynamic';
import FinancialPosition from '@/components/FinancialPosition';

/**
 * Everything for ONE currency (the enclosing <CurrencyScope>). The overview renders two of these side by
 * side: USD on the left, LYD on the right. Amounts are never combined across currencies.
 */
// Charts are the heaviest part of the page: load their code only when the Charts tab is opened.
const ChartsSection = dynamic(() => import('@/components/charts/ChartsSection'), { loading: () => <div className="skeleton h-72" /> });

export type OverviewTab = 'summary' | 'charts' | 'breakdown';

export default function OverviewPanel({ tab = 'summary' }: { tab?: OverviewTab }) {
  const { currency, lang, dir, hidden, tr: t, t: ui } = useApp();
  const show = (k: string) => !hidden.includes(k as never);
  const inTab = (t: OverviewTab) => tab === t;
  const { data } = useDashboardData();
  if (!data) return <PageSkeleton />;
  const o = data.overview;
  const name = ui(currency === 'USD' ? 'cur.usd' : 'cur.lyd');
  const budgetSubtitle = !data.meta.budgetConfigured ? ui('budget.none') : o.budgetOverrun > 0 ? t.budgetOverrunLabel : data.meta.budgetProrated ? ui('budget.prorated') : t.allocatedCap;

  return (
    <section aria-label={`${currency} — ${name}`} dir={dir} className="@container min-w-0">
      <header className="mb-4 flex items-baseline justify-between gap-3 border-b-2 border-ink pb-2">
        <h2 dir="ltr" className="font-head text-xl font-bold tracking-wide text-ink">{currency}</h2>
        <span className="text-xs font-semibold text-muted">{name}</span>
      </header>

      {inTab('summary') && show('position') && <FinancialPosition position={data.position} spending={data.spending} />}

      {inTab('summary') && show('kpis') && <h3 className="mb-3 font-head text-sm font-bold text-ink">{ui('kpi.title')}</h3>}
      {inTab('summary') && show('kpis') && <div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @3xl:grid-cols-4">
        <KpiCard title={t.kpiIncome} metric={o.totalIncome} subtitle={t.vsLastMonth} language={lang} sentimentType="income" />
        <KpiCard title={t.kpiExpenses} metric={o.totalExpenses} subtitle={t.vsLastMonth} language={lang} sentimentType="expense" />
        <KpiCard title={t.kpiNetResult} metric={o.netResult} subtitle={t.vsLastMonth} language={lang} sentimentType="net" />
        <KpiCard title={t.kpiAvailableCash} metric={o.availableCash} subtitle={t.illustrativeEstimate} language={lang} sentimentType="neutral" />
        <KpiCard title={t.kpiRemainingBudget} metric={o.remainingBudget} subtitle={budgetSubtitle} language={lang} sentimentType={o.budgetOverrun > 0 ? 'expense' : 'neutral'} />
        <KpiCard title={t.kpiCustomerCollections} metric={o.customerCollections} subtitle={t.collectedFromCustomers} language={lang} sentimentType="income" />
        <KpiCard title={t.kpiCashCollected} metric={o.cashCollected} subtitle={t.actualReceived} language={lang} sentimentType="income" />
        <KpiCard
          title={t.kpiPendingIncome}
          metric={{ current: o.pendingIncomeTotal, previous: 0, absoluteChange: 0, percentageChange: null, isIncrease: false, currency }}
          subtitle={t.notYetCollected}
          language={lang}
          sentimentType="neutral"
        />
      </div>}

      {inTab('charts') && show('charts') && (
        <div>
          <ChartsSection data={data} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 @3xl:grid-cols-2 [&>*]:min-w-0">
        {inTab('breakdown') && show('channels') && <PaymentChannelBreakdown incomeBreakdown={o.incomeByPaymentMethod} expensesBreakdown={o.expensesByPaymentMethod} currency={currency} language={lang} />}
        {inTab('breakdown') && show('budget') && <BudgetBurndown
          currentExpenses={o.totalExpenses.current}
          remainingBudget={o.remainingBudget.current}
          upcomingTotal={o.upcomingObligationsTotal}
          budgetOverrun={o.budgetOverrun}
          currency={currency}
          language={lang}
          budgetCap={data.meta.budgetCap}
        />}
        {inTab('breakdown') && show('comparisons') && <ComparisonBars
          title={ui('cmp.incByPlatform')}
          items={data.breakdown.incomeByPlatform.map((b) => ({ key: b.key, label: lang === 'ar' ? b.labelAr : b.label, current: b.current, previous: b.previous }))}
          currency={currency}
          increaseIs="good"
          currentLabel={ui('cmp.current')}
          previousLabel={ui('cmp.previous')}
        />}
        {inTab('breakdown') && show('comparisons') && <ComparisonBars
          title={ui('cmp.expByCategory')}
          items={data.breakdown.expensesByCategory.map((b) => ({ key: b.key, label: lang === 'ar' ? b.labelAr : b.label, current: b.current, previous: b.previous }))}
          currency={currency}
          increaseIs="bad"
          currentLabel={ui('cmp.current')}
          previousLabel={ui('cmp.previous')}
        />}
      </div>
    </section>
  );
}
