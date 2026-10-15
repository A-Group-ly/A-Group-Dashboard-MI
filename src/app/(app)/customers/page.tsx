'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { Card, DemoNotice, PageHeader, StatusBadge } from '@/components/ui/primitives';
import ServerTable, { type SCol, type SFilter } from '@/components/ui/ServerTable';
import Copyable from '@/components/ui/Copyable';
import { Button } from '@/components/ui/forms';
import { CustomerDialog, type CustomerLite } from '@/components/ops/CustomerDialogs';

export interface CustomerRow extends CustomerLite {
  type: string;
  businessName: string | null;
  orgName: string | null;
  email: string;
  city: string;
  status: string;
  createdAt: string;
  subscriptionCount: number;
}
interface Resp {
  data: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
  facets: { cities: string[] };
}

const TYPES = ['individual', 'small_business', 'medium_business', 'enterprise', 'public_sector'];

export default function CustomersPage() {
  const { t } = useApp();
  const { can } = useAccess();
  const [reload, setReload] = useState(0);
  const [creating, setCreating] = useState(false);

  const columns: SCol<CustomerRow>[] = [
    {
      key: 'name',
      header: t('col.customer'),
      sortKey: 'name',
      render: (c) => (
        <>
          <Link href={`/customers/${c.id}`} className="font-semibold text-ink transition-colors hover:text-accent-strong">{c.displayName}</Link>
          <div dir="ltr" className="text-[11px] text-muted"><Copyable value={c.id} /></div>
        </>
      ),
    },
    { key: 'type', header: t('col.type'), sortKey: 'type', render: (c) => t(`type.${c.type}`) },
    { key: 'org', header: t('col.org'), render: (c) => c.orgName ?? '—' },
    { key: 'city', header: t('col.city'), sortKey: 'city', render: (c) => c.city },
    { key: 'email', header: t('col.email'), render: (c) => <Copyable value={c.email}><span dir="ltr">{c.email}</span></Copyable> },
    { key: 'subs', header: t('col.subs'), align: 'end', sortKey: 'subs', render: (c) => <span className="tabular-nums">{c.subscriptionCount}</span> },
    { key: 'status', header: t('col.status'), sortKey: 'status', render: (c) => <StatusBadge status={c.status} /> },
    { key: 'created', header: t('col.created'), sortKey: 'created', render: (c) => <span dir="ltr" className="tabular-nums text-muted">{c.createdAt}</span> },
    { key: 'act', header: t('col.actions'), align: 'end', render: (c) => <Link href={`/customers/${c.id}`} className="text-xs font-semibold text-accent-strong hover:underline">{t('act.view')}</Link> },
  ];
  const filters = (resp: Resp | null): SFilter[] => [
    { key: 'type', label: t('col.type'), options: TYPES.map((v) => ({ v, l: t(`type.${v}`) })) },
    { key: 'status', label: t('col.status'), options: [{ v: 'active', l: t('status.active') }, { v: 'inactive', l: t('status.inactive') }] },
    { key: 'city', label: t('col.city'), options: (resp?.facets.cities ?? []).map((v) => ({ v, l: v })) },
  ];

  return (
    <>
      <PageHeader title={t('cust.title')} subtitle={t('cust.sub')} />
      <DemoNotice />
      <Card flush>
        <ServerTable<CustomerRow, Resp>
          endpoint="/api/customers"
          columns={columns}
          rowKey={(c) => c.id}
          filters={filters}
          defaultSort={{ key: 'name', dir: 'asc' }}
          pageSize={25}
          searchPlaceholder={t('cust.searchPh')}
          reloadKey={reload}
          emptyAction={can('customers:write') ? <Button onClick={() => setCreating(true)}>+ {t('cust.add')}</Button> : undefined}
          exportFilename="a-group-customers.csv"
          toolbarEnd={can('customers:write') ? <Button onClick={() => setCreating(true)}>+ {t('cust.add')}</Button> : null}
        />
      </Card>
      <CustomerDialog open={creating} onClose={() => setCreating(false)} onDone={() => setReload((n) => n + 1)} />
    </>
  );
}
