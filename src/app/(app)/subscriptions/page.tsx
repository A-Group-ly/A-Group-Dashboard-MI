'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { Card, DemoNotice, Money, PageHeader, StatusBadge } from '@/components/ui/primitives';
import ServerTable, { type SCol, type SFilter } from '@/components/ui/ServerTable';
import { Button } from '@/components/ui/forms';
import { NewSubscriptionDialog, PlanDialog } from '@/components/ops/BillingDialogs';

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
interface Resp {
  data: SubRow[];
  total: number;
  page: number;
  pageSize: number;
  facets: { products: { id: string; name: string }[] };
}

const STATUSES = ['active', 'trial', 'past_due', 'paused', 'canceled', 'expired'];

export default function SubscriptionsPage() {
  const { t } = useApp();
  const { can } = useAccess();
  const [reload, setReload] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newPlan, setNewPlan] = useState(false);

  const columns: SCol<SubRow>[] = [
    { key: 'id', header: 'ID', sortKey: 'id', render: (s) => <Link href={`/subscriptions/${s.id}`} dir="ltr" className="font-semibold tabular-nums text-ink transition-colors hover:text-accent-strong">{s.id}</Link> },
    { key: 'customer', header: t('col.customer'), sortKey: 'customer', render: (s) => <Link href={`/customers/${s.customerId}`} className="font-semibold text-ink transition-colors hover:text-accent-strong">{s.customerName}</Link> },
    { key: 'product', header: t('col.product'), render: (s) => s.productName },
    { key: 'plan', header: t('col.plan'), render: (s) => s.planName },
    { key: 'price', header: t('col.price'), align: 'end', sortKey: 'price', render: (s) => <Money value={s.price} currency={s.currency} /> },
    { key: 'interval', header: t('col.interval'), render: (s) => t(`iv.${s.interval}`) },
    { key: 'status', header: t('col.status'), sortKey: 'status', render: (s) => <StatusBadge status={s.status} /> },
    { key: 'start', header: t('col.start'), sortKey: 'start', render: (s) => <span dir="ltr" className="tabular-nums text-muted">{s.startDate}</span> },
    { key: 'renewal', header: t('col.renewal'), sortKey: 'renewal', render: (s) => <span dir="ltr" className="tabular-nums text-muted">{s.nextRenewal ?? '—'}</span> },
  ];
  const filters = (resp: Resp | null): SFilter[] => [
    { key: 'status', label: t('col.status'), options: STATUSES.map((v) => ({ v, l: t(`status.${v}`) })) },
    { key: 'productId', label: t('col.product'), options: (resp?.facets.products ?? []).map((p) => ({ v: p.id, l: p.name })) },
    { key: 'interval', label: t('col.interval'), options: ['weekly', 'monthly', 'quarterly', 'yearly'].map((v) => ({ v, l: t(`iv.${v}`) })) },
    { key: 'currency', label: t('col.currency'), options: [{ v: 'USD', l: 'USD' }, { v: 'LYD', l: 'LYD' }] },
  ];

  return (
    <>
      <PageHeader title={t('sub.title')} subtitle={t('sub.sub')} />
      <DemoNotice />
      <Card flush>
        <ServerTable<SubRow, Resp>
          endpoint="/api/subscriptions"
          columns={columns}
          rowKey={(s) => s.id}
          filters={filters}
          defaultSort={{ key: 'start', dir: 'desc' }}
          pageSize={25}
          searchPlaceholder={t('sub.searchPh')}
          reloadKey={reload}
          rowHref={(s) => `/subscriptions/${s.id}`}
          emptyAction={can('subscriptions:write') ? <Button onClick={() => setCreating(true)}>+ {t('sub.add')}</Button> : undefined}
          exportFilename="a-group-subscriptions.csv"
          toolbarEnd={
            <>
              {can('plans:write') && <Button variant="secondary" onClick={() => setNewPlan(true)}>+ {t('plan.add')}</Button>}
              {can('subscriptions:write') && <Button onClick={() => setCreating(true)}>+ {t('sub.add')}</Button>}
            </>
          }
        />
      </Card>
      <NewSubscriptionDialog open={creating} onClose={() => setCreating(false)} onDone={() => setReload((n) => n + 1)} />
      <PlanDialog open={newPlan} onClose={() => setNewPlan(false)} onDone={() => setReload((n) => n + 1)} />
    </>
  );
}
