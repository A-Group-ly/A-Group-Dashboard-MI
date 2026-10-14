'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { DemoNotice, PageHeader, PageSkeleton } from '@/components/ui/primitives';
import KpiCard from '@/components/KpiCard';
import CashFlowChart from '@/components/CashFlowChart';
import BudgetBurndown from '@/components/BudgetBurndown';
import TransactionsTable from '@/components/TransactionsTable';
import PaymentChannelBreakdown from '@/components/PaymentChannelBreakdown';
import PlatformFilter from '@/components/PlatformFilter';
import DataSourceBanner from '@/components/DataSourceBanner';

export default function OverviewPage() {
  const { currency, month, platform, lang, tr: t } = useApp();
  const { overview, transactions, ready } = useDashboardData();

  // KPIs are company-wide by design; the platform filter scopes the chart and table.
  const scoped = useMemo(
    () => (platform === 'all' ? transactions : transactions.filter((tx) => tx.source === platform)),
    [transactions, platform]
  );
  const monthTx = useMemo(() => scoped.filter((tx) => tx.month === month), [scoped, month]);

  if (!ready) return <PageSkeleton />;

  const scopeText =
    platform === 'all' ? `${t.allPlatforms} — ${t.companyWideScope}` : `${platform} — ${t.platformScope}`;

  return (
    <>
      <PageHeader title={t.overview} subtitle={scopeText} actions={<PlatformFilter />} />
      <DataSourceBanner />
      <DemoNotice text={t.demoDataNotice} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard title={t.kpiIncome} metric={overview.totalIncome} subtitle={t.vsLastMonth} language={lang} sentimentType="income" />
        <KpiCard title={t.kpiExpenses} metric={overview.totalExpenses} subtitle={t.vsLastMonth} language={lang} sentimentType="expense" />
        <KpiCard title={t.kpiNetResult} metric={overview.netResult} subtitle={t.vsLastMonth} language={lang} sentimentType="net" />
        <KpiCard title={t.kpiAvailableCash} metric={overview.availableCash} subtitle={t.illustrativeEstimate} language={lang} sentimentType="neutral" />
        <KpiCard
          title={t.kpiRemainingBudget}
          metric={overview.remainingBudget}
          subtitle={overview.budgetOverrun > 0 ? t.budgetOverrunLabel : t.allocatedCap}
          language={lang}
          sentimentType={overview.budgetOverrun > 0 ? 'expense' : 'neutral'}
        />
        <KpiCard title={t.kpiCustomerCollections} metric={overview.customerCollections} subtitle={t.collectedFromCustomers} language={lang} sentimentType="income" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard title={t.kpiCashCollected} metric={overview.cashCollected} subtitle={t.actualReceived} language={lang} sentimentType="income" />
        <KpiCard
          title={t.kpiPendingIncome}
          metric={{ current: overview.pendingIncomeTotal, previous: 0, absoluteChange: 0, percentageChange: null, isIncrease: false, currency }}
          subtitle={t.notYetCollected}
          language={lang}
          sentimentType="neutral"
        />
        {overview.budgetOverrun > 0 && (
          <KpiCard
            title={t.kpiBudgetOverrun}
            metric={{ current: overview.budgetOverrun, previous: 0, absoluteChange: 0, percentageChange: null, isIncrease: true, currency }}
            subtitle={t.overBudget}
            language={lang}
            sentimentType="expense"
          />
        )}
      </div>

      <h2 className="mb-3 mt-8 font-head text-sm font-bold text-ink">{t.paymentChannelBreakdown}</h2>
      <PaymentChannelBreakdown
        incomeBreakdown={overview.incomeByPaymentMethod}
        expensesBreakdown={overview.expensesByPaymentMethod}
        currency={currency}
        language={lang}
      />

      <div className="my-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CashFlowChart transactions={scoped} currency={currency} language={lang} selectedMonth={month} />
        </div>
        <BudgetBurndown
          currentExpenses={overview.totalExpenses.current}
          remainingBudget={overview.remainingBudget.current}
          upcomingTotal={overview.upcomingObligationsTotal}
          budgetOverrun={overview.budgetOverrun}
          currency={currency}
          language={lang}
          budgetCap={overview.totalExpenses.current + overview.remainingBudget.current}
        />
      </div>

      <TransactionsTable transactions={monthTx} currency={currency} language={lang} pageSize={6} />
    </>
  );
}
