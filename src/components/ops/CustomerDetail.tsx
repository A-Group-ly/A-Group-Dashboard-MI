'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { Card, DemoNotice, EmptyState, Money, PageHeader, StatusBadge } from '@/components/ui/primitives';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { InvoiceTable, PaymentTable } from './BillingTables';
import {
  INVOICES,
  PAYMENTS,
  SUBSCRIPTIONS,
  customerById,
  orgById,
  planById,
  productById,
  type Cur,
  type Subscription,
} from '@/lib/subscriptionDemo';

type Tab = 'overview' | 'contact' | 'subs' | 'invoices' | 'payments';

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

export default function CustomerDetail({ id }: { id: string }) {
  const { t } = useApp();
  const [tab, setTab] = useState<Tab>('overview');
  const c = customerById(id);

  if (!c) {
    return (
      <>
        <PageHeader title={t('err.notFound')} crumbs={[{ href: '/customers', label: t('cust.title') }]} />
        <Card>
          <EmptyState title={t('err.notFound')} body={t('err.notFoundBody')} />
        </Card>
      </>
    );
  }

  const subs = SUBSCRIPTIONS.filter((s) => s.customerId === id);
  const invoices = INVOICES.filter((i) => i.customerId === id);
  const payments = PAYMENTS.filter((p) => p.customerId === id);

  // Currencies stay separate: one line per currency, only when non-zero.
  const totals = (['LYD', 'USD'] as Cur[])
    .map((cur) => ({
      cur,
      invoiced: invoices.filter((i) => i.currency === cur && i.status !== 'draft' && i.status !== 'void').reduce((s, i) => s + i.total, 0),
      collected: payments.filter((p) => p.currency === cur && p.status === 'succeeded').reduce((s, p) => s + p.amount, 0),
    }))
    .filter((x) => x.invoiced > 0 || x.collected > 0);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('cust.overview') },
    { key: 'contact', label: t('cust.contact') },
    { key: 'subs', label: t('cust.subs') },
    { key: 'invoices', label: t('cust.invoices') },
    { key: 'payments', label: t('cust.payments') },
  ];

  const subColumns: Column<Subscription>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (s) => (
        <Link href={`/subscriptions/${s.id}`} dir="ltr" className="font-semibold tabular-nums hover:text-accent-strong">
          {s.id}
        </Link>
      ),
    },
    { key: 'product', header: t('col.product'), render: (s) => productById(planById(s.planId)?.productId ?? '')?.name ?? '—' },
    { key: 'plan', header: t('col.plan'), render: (s) => planById(s.planId)?.name ?? '—' },
    {
      key: 'price',
      header: t('col.price'),
      align: 'end',
      render: (s) => {
        const p = planById(s.planId);
        return p ? <Money value={p.price} currency={p.currency} /> : '—';
      },
    },
    { key: 'status', header: t('col.status'), render: (s) => <StatusBadge status={s.status} /> },
    { key: 'renewal', header: t('col.renewal'), render: (s) => <span dir="ltr" className="tabular-nums text-muted">{s.nextRenewal ?? '—'}</span> },
  ];

  return (
    <>
      <PageHeader
        title={c.displayName}
        subtitle={`${t(`type.${c.type}`)} · ${c.city}, ${c.country}`}
        crumbs={[{ href: '/customers', label: t('cust.title') }, { label: c.id }]}
      />
      <DemoNotice />

      <div role="tablist" aria-label={c.displayName} className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((x) => (
          <button
            key={x.key}
            role="tab"
            type="button"
            aria-selected={tab === x.key}
            onClick={() => setTab(x.key)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === x.key ? 'border-accent text-accent-strong' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <Card>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Fact label={t('col.type')}>{t(`type.${c.type}`)}</Fact>
            <Fact label={t('col.org')}>{orgById(c.orgId)?.name ?? '—'}</Fact>
            <Fact label={t('col.status')}>
              <StatusBadge status={c.status} />
            </Fact>
            <Fact label={t('col.created')}>
              <span dir="ltr" className="tabular-nums">{c.createdAt}</span>
            </Fact>
            <Fact label={t('cust.totalInv')}>
              {totals.length ? totals.map((x) => <div key={x.cur}><Money value={x.invoiced} currency={x.cur} /></div>) : '—'}
            </Fact>
            <Fact label={t('cust.totalPaid')}>
              {totals.length ? totals.map((x) => <div key={x.cur}><Money value={x.collected} currency={x.cur} /></div>) : '—'}
            </Fact>
            <div className="sm:col-span-2 lg:col-span-3">
              <Fact label={t('col.notes')}>{c.notes ?? '—'}</Fact>
            </div>
          </dl>
        </Card>
      )}

      {tab === 'contact' && (
        <Card>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Fact label={t('col.email')}><span dir="ltr">{c.email}</span></Fact>
            <Fact label={t('col.phone')}><span dir="ltr">{c.phone ?? '—'}</span></Fact>
            <Fact label={t('cust.business')}>{c.businessName ?? '—'}</Fact>
            <Fact label={t('col.city')}>{c.city}</Fact>
            <Fact label={t('col.country')}>{c.country}</Fact>
          </dl>
        </Card>
      )}

      {tab === 'subs' && (
        <Card flush>
          {subs.length ? <DataTable rows={subs} columns={subColumns} rowKey={(s) => s.id} /> : <EmptyState body={t('cust.noSubs')} />}
        </Card>
      )}

      {tab === 'invoices' && <Card flush>{invoices.length ? <InvoiceTable invoices={invoices} /> : <EmptyState />}</Card>}
      {tab === 'payments' && (
        <Card flush>
          {payments.length ? <PaymentTable payments={payments} /> : <EmptyState />}
          <p className="border-t border-line px-5 py-3 text-xs text-muted">{t('sub.payNote')}</p>
        </Card>
      )}
    </>
  );
}
