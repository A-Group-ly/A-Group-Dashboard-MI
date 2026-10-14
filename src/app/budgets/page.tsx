'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { Card, DemoNotice, PageHeader, PageSkeleton } from '@/components/ui/primitives';
import KpiCard from '@/components/KpiCard';
import CashFlowChart from '@/components/CashFlowChart';
import BudgetBurndown from '@/components/BudgetBurndown';
import DataSourceBanner from '@/components/DataSourceBanner';

export default function BudgetsPage() {
  const { t, tr, lang, currency, month } = useApp();
  const { overview, transactions, ready } = useDashboardData();

  if (!ready) return <PageSkeleton />;

  return (
    <>
      <PageHeader title={t('bud.title')} subtitle={t('bud.sub')} />
      <DataSourceBanner />
      <DemoNotice text={tr.demoDataNotice} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard title={tr.kpiAvailableCash} metric={overview.availableCash} subtitle={tr.illustrativeEstimate} language={lang} sentimentType="neutral" />
        <KpiCard
          title={tr.kpiRemainingBudget}
          metric={overview.remainingBudget}
          subtitle={overview.budgetOverrun > 0 ? tr.budgetOverrunLabel : tr.allocatedCap}
          language={lang}
          sentimentType={overview.budgetOverrun > 0 ? 'expense' : 'neutral'}
        />
        <KpiCard title={tr.kpiNetResult} metric={overview.netResult} subtitle={tr.vsLastMonth} language={lang} sentimentType="net" />
      </div>
      <p className="mb-6 mt-3 text-xs text-muted">{t('bud.cashNote')}</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CashFlowChart transactions={transactions} currency={currency} language={lang} selectedMonth={month} />
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

      <Card title={tr.upcomingObligations} hint={tr.dueSoon}>
        <p dir="ltr" className="text-2xl font-bold tabular-nums text-ink">
          {new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(overview.upcomingObligationsTotal)} {currency}
        </p>
      </Card>
    </>
  );
}
