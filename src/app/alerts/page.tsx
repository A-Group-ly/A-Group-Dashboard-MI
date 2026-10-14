'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { Badge, Card, DemoNotice, EmptyState, Money, PageHeader, PageSkeleton, type BadgeTone } from '@/components/ui/primitives';
import DataTable, { type Column, type FilterDef } from '@/components/ui/DataTable';
import {
  DEMO_TODAY,
  INVOICES,
  PAYMENTS,
  SUBSCRIPTIONS,
  customerById,
  daysUntil,
  planById,
} from '@/lib/subscriptionDemo';

type Severity = 'high' | 'medium' | 'low';
type AlertType = 'overdueInvoice' | 'failedPayment' | 'pastDueSub' | 'renewalDue' | 'budgetNear' | 'budgetOver';

interface AlertItem {
  id: string;
  severity: Severity;
  type: AlertType;
  date: string;
  title: string;
  detail: React.ReactNode;
  href?: string;
}

const SEV_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
const SEV_TONE: Record<Severity, BadgeTone> = { high: 'bad', medium: 'warn', low: 'ink' };

export default function AlertsPage() {
  const { t, currency, month } = useApp();
  const { overview, ready } = useDashboardData();

  const alerts = useMemo<AlertItem[]>(() => {
    const out: AlertItem[] = [];
    for (const i of INVOICES) {
      if (i.status === 'overdue') {
        out.push({
          id: `inv-${i.id}`,
          severity: 'high',
          type: 'overdueInvoice',
          date: i.dueDate,
          title: `${t('alert.overdueInvoice')} · ${i.number}`,
          detail: (
            <>
              {customerById(i.customerId)?.displayName} · <Money value={i.total} currency={i.currency} />
            </>
          ),
          href: `/customers/${i.customerId}`,
        });
      }
    }
    for (const p of PAYMENTS) {
      if (p.status === 'failed') {
        out.push({
          id: `pay-${p.id}`,
          severity: 'high',
          type: 'failedPayment',
          date: p.date,
          title: `${t('alert.failedPayment')} · ${p.invoiceNumber}`,
          detail: (
            <>
              {customerById(p.customerId)?.displayName} · <Money value={p.amount} currency={p.currency} />
            </>
          ),
          href: `/customers/${p.customerId}`,
        });
      }
    }
    for (const s of SUBSCRIPTIONS) {
      const cust = customerById(s.customerId)?.displayName;
      if (s.status === 'past_due') {
        out.push({
          id: `sub-${s.id}`,
          severity: 'medium',
          type: 'pastDueSub',
          date: s.nextRenewal ?? s.startDate,
          title: `${t('alert.pastDueSub')} · ${s.id}`,
          detail: `${cust} · ${planById(s.planId)?.name ?? ''}`,
          href: `/subscriptions/${s.id}`,
        });
      }
      if (s.status === 'active' && s.nextRenewal) {
        const d = daysUntil(s.nextRenewal);
        if (d >= 0 && d <= 15) {
          out.push({
            id: `ren-${s.id}`,
            severity: 'low',
            type: 'renewalDue',
            date: s.nextRenewal,
            title: `${t('alert.renewalDue')} · ${s.id}`,
            detail: `${cust} · ${planById(s.planId)?.name ?? ''} · ${d}d`,
            href: `/subscriptions/${s.id}`,
          });
        }
      }
    }
    // Budget rule uses the finance data for the selected month/currency.
    const spent = overview.totalExpenses.current;
    const cap = spent + overview.remainingBudget.current;
    if (cap > 0) {
      const pct = (spent / cap) * 100;
      if (pct >= 80) {
        out.push({
          id: 'budget',
          severity: pct > 100 ? 'high' : 'medium',
          type: pct > 100 ? 'budgetOver' : 'budgetNear',
          date: `${month}-01`,
          title: `${pct > 100 ? t('alert.budgetOver') : t('alert.budgetNear')} · ${currency}`,
          detail: `${pct.toFixed(0)}%`,
          href: '/budgets',
        });
      }
    }
    return out.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || b.date.localeCompare(a.date));
  }, [t, overview, month, currency]);

  const activity = useMemo(() => {
    const ev: { date: string; text: string; href: string }[] = [];
    for (const s of SUBSCRIPTIONS) {
      const name = customerById(s.customerId)?.displayName ?? '';
      ev.push({ date: s.startDate, text: `${t('sub.created')} · ${s.id} · ${name}`, href: `/subscriptions/${s.id}` });
      if (s.canceledDate) ev.push({ date: s.canceledDate, text: `${t('status.canceled')} · ${s.id} · ${name}`, href: `/subscriptions/${s.id}` });
    }
    for (const i of INVOICES) {
      if (i.status === 'draft' || i.status === 'void') continue;
      ev.push({ date: i.issueDate, text: `${t('col.invoice')} ${i.number} · ${t(`status.${i.status}`)}`, href: `/customers/${i.customerId}` });
    }
    for (const p of PAYMENTS) {
      ev.push({ date: p.date, text: `${t('cust.payments')} ${p.invoiceNumber} · ${t(`status.${p.status}`)}`, href: `/customers/${p.customerId}` });
    }
    return ev.filter((e) => e.date <= DEMO_TODAY).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
  }, [t]);

  if (!ready) return <PageSkeleton />;

  const columns: Column<AlertItem>[] = [
    {
      key: 'severity',
      header: t('col.status'),
      sort: (a) => SEV_ORDER[a.severity],
      render: (a) => <Badge tone={SEV_TONE[a.severity]}>{t(`alert.sev${a.severity[0].toUpperCase()}${a.severity.slice(1)}`)}</Badge>,
    },
    {
      key: 'title',
      header: t('alert.open'),
      render: (a) => (
        <>
          <div className="font-semibold text-ink">{a.title}</div>
          <div className="text-xs text-muted">{a.detail}</div>
        </>
      ),
    },
    { key: 'date', header: t('alert.age'), sort: (a) => a.date, render: (a) => <span dir="ltr" className="tabular-nums text-muted">{a.date}</span> },
    {
      key: 'link',
      header: '',
      align: 'end',
      render: (a) =>
        a.href ? (
          <Link href={a.href} className="text-xs font-semibold text-accent-strong hover:underline">
            {t('act.view')}
          </Link>
        ) : null,
    },
  ];

  const filters: FilterDef<AlertItem>[] = [
    {
      key: 'severity',
      label: t('col.status'),
      get: (a) => a.severity,
      options: (['high', 'medium', 'low'] as Severity[]).map((s) => ({ v: s, l: t(`alert.sev${s[0].toUpperCase()}${s.slice(1)}`) })),
    },
  ];

  return (
    <>
      <PageHeader title={t('alert.title')} subtitle={t('alert.sub')} />
      <DemoNotice />

      <Card title={t('alert.open')} hint={`${alerts.length}`} flush>
        {alerts.length ? (
          <DataTable rows={alerts} columns={columns} rowKey={(a) => a.id} filters={filters} pageSize={8} />
        ) : (
          <EmptyState title={t('alert.none')} />
        )}
      </Card>

      <Card title={t('alert.rules')}>
        <p className="text-xs leading-relaxed text-muted">{t('alert.rulesBody')}</p>
      </Card>

      <Card title={t('alert.activity')}>
        <ul className="divide-y divide-line">
          {activity.map((e, i) => (
            <li key={i} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
              <span dir="ltr" className="w-24 shrink-0 text-xs tabular-nums text-muted">{e.date}</span>
              <Link href={e.href} className="min-w-0 flex-1 text-ink hover:text-accent-strong">
                {e.text}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
