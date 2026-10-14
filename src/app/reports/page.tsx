'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, DemoNotice, Money, PageHeader } from '@/components/ui/primitives';
import ExportCsvButton from '@/components/ExportCsvButton';
import {
  PRODUCTS,
  SUBSCRIPTIONS,
  agingBuckets,
  invoicedAndCollected,
  mrrByCurrency,
  monthlyNormalized,
  planById,
  type AgingBucket,
  type Cur,
  type SubStatus,
} from '@/lib/subscriptionDemo';

const CURRENCIES: Cur[] = ['LYD', 'USD'];
const STATUSES: SubStatus[] = ['active', 'trial', 'past_due', 'paused', 'canceled', 'expired'];
const BUCKETS: { key: AgingBucket; label: string }[] = [
  { key: 'notDue', label: 'rep.notDue' },
  { key: 'd30', label: 'rep.d30' },
  { key: 'd60', label: 'rep.d60' },
  { key: 'd90', label: 'rep.d90' },
  { key: 'd90p', label: 'rep.d90p' },
];

function SimpleTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-ink">
            {head.map((h, i) => (
              <th key={i} scope="col" className={`px-4 py-2.5 text-xs font-semibold text-muted ${i === 0 ? 'text-start' : 'text-end'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-line">
              {r.map((cell, ci) => (
                <td key={ci} className={`px-4 py-3 ${ci === 0 ? 'text-start font-semibold text-ink' : 'text-end'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useApp();
  const mrr = mrrByCurrency();
  const aging = agingBuckets();
  const money = invoicedAndCollected();
  const statusCount = (s: SubStatus) => SUBSCRIPTIONS.filter((x) => x.status === s).length;
  const total = SUBSCRIPTIONS.length;

  const perf = PRODUCTS.map((p) => {
    const subs = SUBSCRIPTIONS.filter((s) => planById(s.planId)?.productId === p.id);
    const m: Record<Cur, number> = { LYD: 0, USD: 0 };
    for (const s of subs) {
      const pl = planById(s.planId);
      if (s.status === 'active' && pl) m[pl.currency] += monthlyNormalized(pl.price, pl.interval);
    }
    return { p, total: subs.length, active: subs.filter((s) => s.status === 'active').length, trial: subs.filter((s) => s.status === 'trial').length, m };
  });

  const dash = <span className="text-muted">—</span>;

  return (
    <>
      <PageHeader title={t('rep.title')} subtitle={t('rep.sub')} actions={<ExportCsvButton />} />
      <DemoNotice />

      <Card title={t('rep.mrrTitle')} hint={t('rep.mrrNote')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CURRENCIES.map((cur) => (
            <div key={cur} className="border border-line p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{cur}</div>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted">{t('rep.mrr')}</div>
                  <div className="text-xl font-bold text-ink"><Money value={mrr[cur]} currency={cur} /></div>
                </div>
                <div>
                  <div className="text-xs text-muted">{t('rep.arr')}</div>
                  <div className="text-xl font-bold text-ink"><Money value={mrr[cur] * 12} currency={cur} /></div>
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
              <div className="h-3 bg-surface-2" role="img" aria-label={`${t(`status.${s}`)}: ${statusCount(s)}`}>
                <div className="h-full bg-ink" style={{ width: `${(statusCount(s) / total) * 100}%` }} />
              </div>
              <span className="text-end tabular-nums text-muted">{statusCount(s)} / {total}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t('rep.revenue')} flush>
        <SimpleTable
          head={[t('col.currency'), t('rep.invoiced'), t('rep.collected'), t('rep.outstanding')]}
          rows={CURRENCIES.map((cur) => [
            cur,
            <Money key="a" value={money[cur].invoiced} currency={cur} />,
            <Money key="b" value={money[cur].collected} currency={cur} />,
            <Money key="c" value={money[cur].outstanding} currency={cur} />,
          ])}
        />
      </Card>

      <Card title={t('rep.aging')} flush>
        <SimpleTable
          head={[t('col.status'), 'LYD', 'USD']}
          rows={BUCKETS.map((b) => [
            t(b.label),
            aging[b.key].LYD ? <Money key="l" value={aging[b.key].LYD} currency="LYD" /> : dash,
            aging[b.key].USD ? <Money key="u" value={aging[b.key].USD} currency="USD" /> : dash,
          ])}
        />
      </Card>

      <Card title={t('rep.perf')} flush>
        <SimpleTable
          head={[t('col.product'), t('col.subs'), t('status.active'), t('status.trial'), 'MRR (LYD)', 'MRR (USD)']}
          rows={perf.map((x) => [
            x.p.name,
            <span key="t" className="tabular-nums">{x.total}</span>,
            <span key="a" className="tabular-nums">{x.active}</span>,
            <span key="r" className="tabular-nums">{x.trial}</span>,
            x.m.LYD ? <Money key="l" value={x.m.LYD} currency="LYD" /> : dash,
            x.m.USD ? <Money key="u" value={x.m.USD} currency="USD" /> : dash,
          ])}
        />
      </Card>

      <Card title={t('rep.exportTitle')}>
        <p className="mb-3 text-sm text-muted">{t('rep.exportBody')}</p>
        <ExportCsvButton />
      </Card>
    </>
  );
}
