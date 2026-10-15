'use client';

import React, { useState } from 'react';
import { CurrencyScope, useApp } from '@/components/providers/AppProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { ApiGate, Card, DemoNotice, ErrorState, Money, PageHeader, PageSkeleton } from '@/components/ui/primitives';
import { useAccess } from '@/components/providers/AccessProvider';
import { useApiData } from '@/components/providers/useApiData';
import { Button } from '@/components/ui/forms';
import Tabs, { useRememberedTab } from '@/components/ui/Tabs';
import { BudgetDialog } from '@/components/ops/BillingDialogs';
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

function BudgetsPanel({ tab }: { tab: 'cash' | 'trend' }) {
  const { t, tr, lang, dir, currency } = useApp();
  const { data } = useDashboardData();
  if (!data) return <PageSkeleton />;
  const o = data.overview;
  const fmt = (v: number) => formatCurrency(v, currency);

  // Cumulative net over the period: how cash builds (or burns) bucket by bucket.
  const cumulative = runningTotal(data.series.points.map((p) => p.income - p.expenses));
  const cumulativePrev = runningTotal(data.series.points.map((p) => (p.prevIncome === null ? null : p.prevIncome - (p.prevExpenses ?? 0))));

  return (
    <section aria-label={currency} dir={dir} className="@container min-w-0">
      <header className="mb-4 flex items-baseline justify-between gap-3 border-b-2 border-ink pb-2">
        <h2 dir="ltr" className="font-head text-xl font-bold tracking-wide text-ink">{currency}</h2>
        <span className="text-xs font-semibold text-muted">{t(currency === 'USD' ? 'cur.usd' : 'cur.lyd')}</span>
      </header>

      {tab === 'cash' && <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
        <KpiCard title={tr.kpiAvailableCash} metric={o.availableCash} subtitle={tr.illustrativeEstimate} language={lang} sentimentType="neutral" />
        <KpiCard
          title={tr.kpiRemainingBudget}
          metric={o.remainingBudget}
          subtitle={!data.meta.budgetConfigured ? t('budget.none') : o.budgetOverrun > 0 ? tr.budgetOverrunLabel : data.meta.budgetProrated ? t('budget.prorated') : tr.allocatedCap}
          language={lang}
          sentimentType={o.budgetOverrun > 0 ? 'expense' : 'neutral'}
        />
        <KpiCard title={tr.kpiNetResult} metric={o.netResult} subtitle={tr.vsLastMonth} language={lang} sentimentType="net" />
      </div>}

      <div className={tab === 'cash' ? 'mt-6 space-y-6' : 'space-y-6'}>
        {tab === 'trend' && <Card title={t('bud.cumulative')} hint={t('bud.cumulativeHint')}>
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
        </Card>}
        {tab === 'cash' && <BudgetBurndown
          currentExpenses={o.totalExpenses.current}
          remainingBudget={o.remainingBudget.current}
          upcomingTotal={o.upcomingObligationsTotal}
          budgetOverrun={o.budgetOverrun}
          currency={currency}
          language={lang}
          budgetCap={data.meta.budgetCap}
        />}
        {tab === 'cash' && <Card title={tr.upcomingObligations} hint={tr.dueSoon}>
          <p dir="ltr" className="text-2xl font-bold tabular-nums text-ink">{fmt(o.upcomingObligationsTotal)}</p>
        </Card>}
      </div>
    </section>
  );
}

function BudgetList({ onEdit, reload }: { onEdit: (b: { month: string; currency: string; amount: number }) => void; reload: number }) {
  const { t } = useApp();
  const { can } = useAccess();
  const state = useApiData<{ data: { id: string; month: string; currency: string; amount: number }[] }>(`/api/budgets?r=${reload}`);
  return (
    <Card title={t('bud.listTitle')} hint={t('bud.listHint')} flush>
      <ApiGate state={state}>
        {(d) => (
          <ul className="divide-y divide-line">
            {d.data.length === 0 && <li className="px-5 py-4 text-sm text-muted">{t('budget.none')}</li>}
            {d.data.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-surface-2">
                <span dir="ltr" className="w-20 tabular-nums text-muted">{b.month}</span>
                <span className="text-xs font-semibold text-muted">{b.currency}</span>
                <Money value={b.amount} currency={b.currency} className="ms-auto font-bold text-ink" />
                {can('budgets:write') && (
                  <button type="button" onClick={() => onEdit(b)} className="text-xs font-semibold text-accent-strong hover:underline">{t('act.edit')}</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </ApiGate>
    </Card>
  );
}

export default function BudgetsPage() {
  const { t, tr } = useApp();
  const { can } = useAccess();
  const { all, loading, error, refresh } = useDashboardData();
  const [dialog, setDialog] = useState<null | { month: string; currency: string; amount: number } | 'new'>(null);
  const [reload, setReload] = useState(0);
  const [tab, setTab] = useRememberedTab<'cash' | 'trend' | 'list'>('ag_tab_budgets', ['cash', 'trend', 'list'], 'cash');

  if (loading) return <PageSkeleton />;
  if (!all) return <ErrorState message={error ?? t('err.server')} onRetry={refresh} />;

  return (
    <>
      <PageHeader title={t('bud.title')} subtitle={t('bud.sub')} actions={can('budgets:write') ? <Button onClick={() => setDialog('new')}>+ {t('bud.set')}</Button> : undefined} />
      <ScopeBar />
      <DemoNotice text={tr.demoDataNotice} />
      <p className="mb-4 text-xs text-muted">{t('bud.cashNote')}</p>
      <Tabs
        label={t('bud.title')}
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'cash', label: t('bdtab.cash') },
          { key: 'trend', label: t('bdtab.trend') },
          { key: 'list', label: t('bdtab.list') },
        ]}
      />
      {tab === 'list' ? (
        <BudgetList reload={reload} onEdit={(b) => setDialog(b)} />
      ) : (
        <div dir="ltr" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <CurrencyScope currency="USD"><BudgetsPanel tab={tab} /></CurrencyScope>
          <CurrencyScope currency="LYD"><BudgetsPanel tab={tab} /></CurrencyScope>
        </div>
      )}
      <BudgetDialog
        open={dialog !== null}
        preset={dialog && dialog !== 'new' ? dialog : null}
        onClose={() => setDialog(null)}
        onDone={() => {
          setReload((n) => n + 1);
          refresh();
        }}
      />
    </>
  );
}
