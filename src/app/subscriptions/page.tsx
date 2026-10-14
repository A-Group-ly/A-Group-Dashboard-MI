'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { Card, DemoNotice, Money, PageHeader, StatusBadge } from '@/components/ui/primitives';
import DataTable, { type Column, type FilterDef } from '@/components/ui/DataTable';
import { PRODUCTS, SUBSCRIPTIONS, customerById, planById, productById, type Subscription, type SubStatus } from '@/lib/subscriptionDemo';

const STATUSES: SubStatus[] = ['active', 'trial', 'past_due', 'paused', 'canceled', 'expired'];

export default function SubscriptionsPage() {
  const { t } = useApp();

  const custName = (s: Subscription) => customerById(s.customerId)?.displayName ?? '—';
  const plan = (s: Subscription) => planById(s.planId);
  const product = (s: Subscription) => {
    const p = plan(s);
    return p ? productById(p.productId) : undefined;
  };

  const columns: Column<Subscription>[] = [
    {
      key: 'id',
      header: 'ID',
      sort: (s) => s.id,
      render: (s) => (
        <Link href={`/subscriptions/${s.id}`} dir="ltr" className="font-semibold tabular-nums text-ink hover:text-accent-strong">
          {s.id}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: t('col.customer'),
      sort: custName,
      render: (s) => (
        <Link href={`/customers/${s.customerId}`} className="font-semibold text-ink hover:text-accent-strong">
          {custName(s)}
        </Link>
      ),
    },
    { key: 'product', header: t('col.product'), render: (s) => product(s)?.name ?? '—' },
    { key: 'plan', header: t('col.plan'), render: (s) => plan(s)?.name ?? '—' },
    {
      key: 'price',
      header: t('col.price'),
      align: 'end',
      render: (s) => {
        const p = plan(s);
        return p ? <Money value={p.price} currency={p.currency} /> : '—';
      },
    },
    { key: 'interval', header: t('col.interval'), render: (s) => (plan(s) ? t(`iv.${plan(s)!.interval}`) : '—') },
    { key: 'status', header: t('col.status'), sort: (s) => s.status, render: (s) => <StatusBadge status={s.status} /> },
    { key: 'start', header: t('col.start'), sort: (s) => s.startDate, render: (s) => <span dir="ltr" className="tabular-nums text-muted">{s.startDate}</span> },
    { key: 'renewal', header: t('col.renewal'), sort: (s) => s.nextRenewal, render: (s) => <span dir="ltr" className="tabular-nums text-muted">{s.nextRenewal ?? '—'}</span> },
  ];

  const filters: FilterDef<Subscription>[] = [
    { key: 'status', label: t('col.status'), get: (s) => s.status, options: STATUSES.map((v) => ({ v, l: t(`status.${v}`) })) },
    { key: 'product', label: t('col.product'), get: (s) => product(s)?.id ?? '', options: PRODUCTS.map((p) => ({ v: p.id, l: p.name })) },
    {
      key: 'interval',
      label: t('col.interval'),
      get: (s) => plan(s)?.interval ?? '',
      options: (['monthly', 'quarterly', 'yearly'] as const).map((v) => ({ v, l: t(`iv.${v}`) })),
    },
  ];

  return (
    <>
      <PageHeader title={t('sub.title')} subtitle={t('sub.sub')} />
      <DemoNotice />
      <p className="mb-4 text-xs text-muted">{t('ops.readOnly')}</p>
      <Card flush>
        <DataTable
          rows={SUBSCRIPTIONS}
          columns={columns}
          rowKey={(s) => s.id}
          searchFields={(s) => [s.id, custName(s), plan(s)?.name, product(s)?.name]}
          searchPlaceholder={t('sub.searchPh')}
          filters={filters}
          defaultSort={{ key: 'start', dir: 'desc' }}
        />
      </Card>
    </>
  );
}
