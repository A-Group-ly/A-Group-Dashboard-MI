'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { useApiData } from '@/components/providers/useApiData';
import { ApiGate, Card, DemoNotice, Money, PageHeader, StatusBadge } from '@/components/ui/primitives';
import DataTable, { type Column, type FilterDef } from '@/components/ui/DataTable';

export interface SubRow {
  id: string;
  customerId: string;
  customerName: string;
  planName: string;
  productId: string;
  productName: string;
  status: string;
  startDate: string;
  nextRenewal: string | null;
  price: number;
  currency: string;
  interval: string;
}

const STATUSES = ['active', 'trial', 'past_due', 'paused', 'canceled', 'expired'];

export default function SubscriptionsPage() {
  const { t } = useApp();
  const state = useApiData<{ data: SubRow[] }>('/api/subscriptions');

  return (
    <>
      <PageHeader title={t('sub.title')} subtitle={t('sub.sub')} />
      <DemoNotice />
      <p className="mb-4 text-xs text-muted">{t('ops.readOnly')}</p>
      <ApiGate state={state}>
        {(d) => {
          const products = Array.from(new Map(d.data.map((s) => [s.productId, s.productName])).entries());
          const columns: Column<SubRow>[] = [
            { key: 'id', header: 'ID', sort: (s) => s.id, render: (s) => <Link href={`/subscriptions/${s.id}`} dir="ltr" className="font-semibold tabular-nums text-ink transition-colors hover:text-accent-strong">{s.id}</Link> },
            { key: 'customer', header: t('col.customer'), sort: (s) => s.customerName, render: (s) => <Link href={`/customers/${s.customerId}`} className="font-semibold text-ink transition-colors hover:text-accent-strong">{s.customerName}</Link> },
            { key: 'product', header: t('col.product'), render: (s) => s.productName },
            { key: 'plan', header: t('col.plan'), render: (s) => s.planName },
            { key: 'price', header: t('col.price'), align: 'end', render: (s) => <Money value={s.price} currency={s.currency} /> },
            { key: 'interval', header: t('col.interval'), render: (s) => t(`iv.${s.interval}`) },
            { key: 'status', header: t('col.status'), sort: (s) => s.status, render: (s) => <StatusBadge status={s.status} /> },
            { key: 'start', header: t('col.start'), sort: (s) => s.startDate, render: (s) => <span dir="ltr" className="tabular-nums text-muted">{s.startDate}</span> },
            { key: 'renewal', header: t('col.renewal'), sort: (s) => s.nextRenewal, render: (s) => <span dir="ltr" className="tabular-nums text-muted">{s.nextRenewal ?? '—'}</span> },
          ];
          const filters: FilterDef<SubRow>[] = [
            { key: 'status', label: t('col.status'), get: (s) => s.status, options: STATUSES.map((v) => ({ v, l: t(`status.${v}`) })) },
            { key: 'product', label: t('col.product'), get: (s) => s.productId, options: products.map(([v, l]) => ({ v, l })) },
            { key: 'interval', label: t('col.interval'), get: (s) => s.interval, options: ['monthly', 'quarterly', 'yearly'].map((v) => ({ v, l: t(`iv.${v}`) })) },
          ];
          return (
            <Card flush>
              <DataTable rows={d.data} columns={columns} rowKey={(s) => s.id} searchFields={(s) => [s.id, s.customerName, s.planName, s.productName]} searchPlaceholder={t('sub.searchPh')} filters={filters} defaultSort={{ key: 'start', dir: 'desc' }} />
            </Card>
          );
        }}
      </ApiGate>
    </>
  );
}
