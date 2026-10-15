'use client';

import React, { useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useApiData } from '@/components/providers/useApiData';
import { ApiGate, Card, DemoNotice, Money, PageHeader } from '@/components/ui/primitives';
import MonthlyReport from '@/components/reports/MonthlyReport';
import ScopeBar from '@/components/ScopeBar';
import ExportCsvButton from '@/components/ExportCsvButton';

type Cur = 'LYD' | 'USD';
const CURRENCIES: Cur[] = ['LYD', 'USD'];
const STATUSES = ['active', 'trial', 'past_due', 'paused', 'canceled', 'expired'];
const BUCKETS = [
  { key: 'notDue', label: 'rep.notDue' },
  { key: 'd30', label: 'rep.d30' },
  { key: 'd60', label: 'rep.d60' },
  { key: 'd90', label: 'rep.d90' },
  { key: 'd90p', label: 'rep.d90p' },
] as const;

interface Analytics {
  mrr: Record<Cur, number>;
  arr: Record<Cur, number>;
  totalSubscriptions: number;
  statusCounts: Record<string, number>;
  money: Record<Cur, { invoiced: number; collected: number; outstanding: number }>;
  aging: Record<(typeof BUCKETS)[number]['key'], Record<Cur, number>>;
  perProduct: { id: string; name: string; total: number; active: number; trial: number; mrr: Record<Cur, number> }[];
}

function SimpleTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-ink">
            {head.map((h, i) => (
              <th key={i} scope="col" className={`px-4 py-2.5 text-xs font-semibold text-muted ${i === 0 ? 'text-start' : 'text-end'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-line transition-colors hover:bg-surface-2">
              {r.map((cell, ci) => (
                <td key={ci} className={`px-4 py-3 ${ci === 0 ? 'text-start font-semibold text-ink' : 'text-end'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubscriptionAnalytics() {
  const { t } = useApp();
  const state = useApiData<Analytics>('/api/analytics');
  const dash = <span className="text-muted">—</span>;

  return (
    <ApiGate state={state}>
      {(a) => (
        <>
          <Card title={t('rep.mrrTitle')} hint={t('rep.mrrNote')}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {CURRENCIES.map((cur) => (
                <div key={cur} className="border border-line p-4 transition-colors hover:border-line-strong">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{cur}</div>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted">{t('rep.mrr')}</div>
                      <div className="text-xl font-bold text-ink"><Money value={a.mrr[cur]} currency={cur} /></div>
                    </div>
                    <div>
                      <div className="text-xs text-muted">{t('rep.arr')}</div>
                      <div className="text-xl font-bold text-ink"><Money value={a.arr[cur]} currency={cur} /></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title={t('rep.statusBreakdown')}>
            <ul className="space-y-2">
              {STATUSES.map((s) => (
                <li key={s} className="grid grid-cols-[8rem_1fr_4rem] items-center gap-3 text-xs">
                  <span className="font-semibold text-ink-2">{t(`status.${s}`)}</span>
                  <div className="h-3 bg-surface-2" role="img" aria-label={`${t(`status.${s}`)}: ${a.statusCounts[s] ?? 0}`}>
                    <div className="h-full bg-chart-2 transition-all duration-500" style={{ width: `${a.totalSubscriptions ? ((a.statusCounts[s] ?? 0) / a.totalSubscriptions) * 100 : 0}%` }} />
                  </div>
                  <span className="text-end tabular-nums text-muted">{a.statusCounts[s] ?? 0} / {a.totalSubscriptions}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={t('rep.revenue')} flush>
            <SimpleTable
              head={[t('col.currency'), t('rep.invoiced'), t('rep.collected'), t('rep.outstanding')]}
              rows={CURRENCIES.map((cur) => [cur, <Money key="a" value={a.money[cur].invoiced} currency={cur} />, <Money key="b" value={a.money[cur].collected} currency={cur} />, <Money key="c" value={a.money[cur].outstanding} currency={cur} />])}
            />
          </Card>

          <Card title={t('rep.aging')} flush>
            <SimpleTable
              head={[t('col.status'), 'LYD', 'USD']}
              rows={BUCKETS.map((b) => [t(b.label), a.aging[b.key].LYD ? <Money key="l" value={a.aging[b.key].LYD} currency="LYD" /> : dash, a.aging[b.key].USD ? <Money key="u" value={a.aging[b.key].USD} currency="USD" /> : dash])}
            />
          </Card>

          <Card title={t('rep.perf')} flush>
            <SimpleTable
              head={[t('col.product'), t('col.subs'), t('status.active'), t('status.trial'), 'MRR (LYD)', 'MRR (USD)']}
              rows={a.perProduct.map((x) => [
                x.name,
                <span key="t" className="tabular-nums">{x.total}</span>,
                <span key="a" className="tabular-nums">{x.active}</span>,
                <span key="r" className="tabular-nums">{x.trial}</span>,
                x.mrr.LYD ? <Money key="l" value={x.mrr.LYD} currency="LYD" /> : dash,
                x.mrr.USD ? <Money key="u" value={x.mrr.USD} currency="USD" /> : dash,
              ])}
            />
          </Card>

          <Card title={t('rep.exportTitle')}>
            <p className="mb-3 text-sm text-muted">{t('rep.exportBody')}</p>
            <ExportCsvButton />
          </Card>
        </>
      )}
    </ApiGate>
  );
}

export default function ReportsPage() {
  const { t } = useApp();
  const [tab, setTab] = useState<'monthly' | 'analytics'>('monthly');

  return (
    <>
      <div className="no-print">
        <PageHeader title={t('rep.title')} subtitle={t('rep.sub')} actions={<ExportCsvButton />} />
        <div role="tablist" aria-label={t('rep.title')} className="mb-5 flex gap-1 border-b border-line">
          {(
            [
              ['monthly', t('rep.tabMonthly')],
              ['analytics', t('rep.tabAnalytics')],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              type="button"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors duration-150 ${tab === k ? 'border-accent text-accent-strong' : 'border-transparent text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'monthly' && <ScopeBar showPlatform={false} />}
      </div>
      {tab === 'monthly' ? (
        <MonthlyReport />
      ) : (
        <>
          <DemoNotice />
          <SubscriptionAnalytics />
        </>
      )}
    </>
  );
}
