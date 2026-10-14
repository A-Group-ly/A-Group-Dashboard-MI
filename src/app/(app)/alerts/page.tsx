'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { useApiData } from '@/components/providers/useApiData';
import { ApiGate, Badge, Card, DemoNotice, EmptyState, Money, PageHeader, type BadgeTone } from '@/components/ui/primitives';
import DataTable, { type Column, type FilterDef } from '@/components/ui/DataTable';

type Severity = 'high' | 'medium' | 'low';

interface AlertItem {
  id: string;
  severity: Severity;
  type: string;
  date: string;
  label: string;
  customerName: string | null;
  amount: number | null;
  currency: string | null;
  detail: string | null;
  href: string | null;
}

interface ActivityItem {
  date: string;
  kind: string;
  ref: string;
  customerName: string | null;
  status: string | null;
  href: string;
}

const SEV_TONE: Record<Severity, BadgeTone> = { high: 'bad', medium: 'warn', low: 'ink' };
const sevKey = (s: Severity) => `alert.sev${s[0].toUpperCase()}${s.slice(1)}`;

export default function AlertsPage() {
  const { t, range, previous, currency } = useApp();
  const qs = new URLSearchParams({ from: range.from, to: range.to, prevFrom: previous.from, prevTo: previous.to, currency });
  const state = useApiData<{ alerts: AlertItem[]; activity: ActivityItem[] }>(`/api/alerts?${qs}`);

  const columns: Column<AlertItem>[] = [
    { key: 'severity', header: t('col.status'), sort: (a) => ['high', 'medium', 'low'].indexOf(a.severity), render: (a) => <Badge tone={SEV_TONE[a.severity]}>{t(sevKey(a.severity))}</Badge> },
    {
      key: 'title',
      header: t('alert.open'),
      render: (a) => (
        <>
          <div className="font-semibold text-ink">{t(`alert.${a.type}`)} · <span dir="ltr">{a.label}</span></div>
          <div className="text-xs text-muted">
            {a.customerName}
            {a.amount !== null && a.currency && <> {a.customerName ? '· ' : ''}<Money value={a.amount} currency={a.currency} /></>}
            {a.detail && <> {a.customerName || a.amount !== null ? '· ' : ''}<span dir="auto">{a.detail}</span></>}
          </div>
        </>
      ),
    },
    { key: 'date', header: t('alert.age'), sort: (a) => a.date, render: (a) => <span dir="ltr" className="tabular-nums text-muted">{a.date}</span> },
    { key: 'link', header: '', align: 'end', render: (a) => (a.href ? <Link href={a.href} className="text-xs font-semibold text-accent-strong hover:underline">{t('act.view')}</Link> : null) },
  ];
  const filters: FilterDef<AlertItem>[] = [
    { key: 'severity', label: t('col.status'), get: (a) => a.severity, options: (['high', 'medium', 'low'] as Severity[]).map((s) => ({ v: s, l: t(sevKey(s)) })) },
  ];

  return (
    <>
      <PageHeader title={t('alert.title')} subtitle={t('alert.sub')} />
      <DemoNotice />
      <ApiGate state={state}>
        {(d) => (
          <>
            <Card title={t('alert.open')} hint={`${d.alerts.length}`} flush>
              {d.alerts.length ? <DataTable rows={d.alerts} columns={columns} rowKey={(a) => a.id} filters={filters} pageSize={8} defaultSort={{ key: 'severity', dir: 'asc' }} /> : <EmptyState title={t('alert.none')} />}
            </Card>

            <Card title={t('alert.rules')}>
              <p className="text-xs leading-relaxed text-muted">{t('alert.rulesBody')}</p>
            </Card>

            <Card title={t('alert.activity')}>
              <ul className="divide-y divide-line">
                {d.activity.map((e, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                    <span dir="ltr" className="w-24 shrink-0 text-xs tabular-nums text-muted">{e.date}</span>
                    <Link href={e.href} className="min-w-0 flex-1 text-ink transition-colors hover:text-accent-strong">
                      {t(`act.${e.kind}`)} · <span dir="ltr">{e.ref}</span>
                      {e.customerName && ` · ${e.customerName}`}
                      {e.status && ` · ${t(`status.${e.status}`)}`}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </ApiGate>
    </>
  );
}
