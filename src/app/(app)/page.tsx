'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { useTransactions } from '@/components/providers/useTransactions';
import { useAccess } from '@/components/providers/AccessProvider';
import { DemoNotice, ErrorState, PageHeader, PageSkeleton } from '@/components/ui/primitives';
import KpiCard from '@/components/KpiCard';
import BudgetBurndown from '@/components/BudgetBurndown';
import TransactionsTable from '@/components/TransactionsTable';
import PaymentChannelBreakdown from '@/components/PaymentChannelBreakdown';
import ScopeBar from '@/components/ScopeBar';
import ComparisonBars from '@/components/charts/ComparisonBars';
import ChartsSection from '@/components/charts/ChartsSection';
import FinancialPosition from '@/components/FinancialPosition';
import DataSourceBanner from '@/components/DataSourceBanner';

export default function OverviewPage() {
  const { currency, platform, lang, tr: t, t: ui } = useApp();
  const { data, loading, error, refresh } = useDashboardData();
  const { can } = useAccess();
  const canSeeTx = can('transactions:view');
  const tx = useTransactions(200, canSeeTx);

  // KPIs are company-wide by design; the platform filter scopes the transactions table.
  const tableRows = useMemo(
    () => (tx.rows ? (platform === 'all' ? tx.rows : tx.rows.filter((r) => r.source === platform)) : []),
    [tx.rows, platform]
  );

  if (loading) return <PageSkeleton />;
  if (!data) return <ErrorState message={error ?? ui('err.server')} onRetry={refresh} />;

  const o = data.overview;
  const scopeText = platform === 'all' ? `${t.allPlatforms} — ${t.companyWideScope}` : `${platform} — ${t.platformScope}`;
  const budgetSubtitle = !data.meta.budgetConfigured ? ui('budget.none') : o.budgetOverrun > 0 ? t.budgetOverrunLabel : data.meta.budgetProrated ? ui('budget.prorated') : t.allocatedCap;

  return (
    <>
      <PageHeader title={t.overview} subtitle={scopeText} />
      <ScopeBar />
      <DataSourceBanner />
      <DemoNotice text={t.demoDataNotice} />

      <FinancialPosition position={data.position} />

      <h2 className="mb-3 font-head text-sm font-bold text-ink">{ui('kpi.title')}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard title={t.kpiIncome} metric={o.totalIncome} subtitle={t.vsLastMonth} language={lang} sentimentType="income" />
        <KpiCard title={t.kpiExpenses} metric={o.totalExpenses} subtitle={t.vsLastMonth} language={lang} sentimentType="expense" />
        <KpiCard title={t.kpiNetResult} metric={o.netResult} subtitle={t.vsLastMonth} language={lang} sentimentType="net" />
        <KpiCard title={t.kpiAvailableCash} metric={o.availableCash} subtitle={t.illustrativeEstimate} language={lang} sentimentType="neutral" />
        <KpiCard title={t.kpiRemainingBudget} metric={o.remainingBudget} subtitle={budgetSubtitle} language={lang} sentimentType={o.budgetOverrun > 0 ? 'expense' : 'neutral'} />
        <KpiCard title={t.kpiCustomerCollections} metric={o.customerCollections} subtitle={t.collectedFromCustomers} language={lang} sentimentType="income" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard title={t.kpiCashCollected} metric={o.cashCollected} subtitle={t.actualReceived} language={lang} sentimentType="income" />
        <KpiCard
          title={t.kpiPendingIncome}
          metric={{ current: o.pendingIncomeTotal, previous: 0, absoluteChange: 0, percentageChange: null, isIncrease: false, currency }}
          subtitle={t.notYetCollected}
          language={lang}
          sentimentType="neutral"
        />
        {o.budgetOverrun > 0 && (
          <KpiCard
            title={t.kpiBudgetOverrun}
            metric={{ current: o.budgetOverrun, previous: 0, absoluteChange: 0, percentageChange: null, isIncrease: true, currency }}
            subtitle={t.overBudget}
            language={lang}
            sentimentType="expense"
          />
        )}
      </div>

      <div className="mt-8">
        <ChartsSection data={data} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PaymentChannelBreakdown incomeBreakdown={o.incomeByPaymentMethod} expensesBreakdown={o.expensesByPaymentMethod} currency={currency} language={lang} />
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

      <h2 className="mb-3 font-head text-sm font-bold text-ink">{ui('cmp.title')}</h2>
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ComparisonBars
          title={ui('cmp.incByPlatform')}
          items={data.breakdown.incomeByPlatform.map((b) => ({ key: b.key, label: lang === 'ar' ? b.labelAr : b.label, current: b.current, previous: b.previous }))}
          currency={currency}
          increaseIs="good"
          currentLabel={ui('cmp.current')}
          previousLabel={ui('cmp.previous')}
        />
        <ComparisonBars
          title={ui('cmp.expByCategory')}
          items={data.breakdown.expensesByCategory.map((b) => ({ key: b.key, label: lang === 'ar' ? b.labelAr : b.label, current: b.current, previous: b.previous }))}
          currency={currency}
          increaseIs="bad"
          currentLabel={ui('cmp.current')}
          previousLabel={ui('cmp.previous')}
        />
      </div>

      {!canSeeTx ? null : tx.loading && !tx.rows ? (
        <PageSkeleton />
      ) : tx.errorStatus !== null && !tx.rows ? (
        <ErrorState message={tx.errorStatus === 403 ? ui('err.forbidden') : ui('err.server')} onRetry={tx.retry} />
      ) : (
        <TransactionsTable transactions={tableRows} currency={currency} language={lang} pageSize={6} />
      )}
    </>
  );
}
