'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { useApiData } from '@/components/providers/useApiData';
import { ApiGate, Card, DemoNotice, PageHeader, StatusBadge } from '@/components/ui/primitives';
import DataTable, { type Column, type FilterDef } from '@/components/ui/DataTable';

export interface CustomerRow {
  id: string;
  type: string;
  displayName: string;
  businessName: string | null;
  orgName: string | null;
  email: string;
  city: string;
  status: string;
  createdAt: string;
  subscriptionCount: number;
}

const TYPES = ['individual', 'small_business', 'medium_business', 'enterprise', 'public_sector'];

export default function CustomersPage() {
  const { t } = useApp();
  const state = useApiData<{ data: CustomerRow[] }>('/api/customers');

  return (
    <>
      <PageHeader title={t('cust.title')} subtitle={t('cust.sub')} />
      <DemoNotice />
      <p className="mb-4 text-xs text-muted">{t('ops.readOnly')}</p>
      <ApiGate state={state}>
        {(d) => {
          const cities = Array.from(new Set(d.data.map((c) => c.city).filter(Boolean))).sort();
          const columns: Column<CustomerRow>[] = [
            {
              key: 'name',
              header: t('col.customer'),
              sort: (c) => c.displayName,
              render: (c) => (
                <>
                  <Link href={`/customers/${c.id}`} className="font-semibold text-ink transition-colors hover:text-accent-strong">{c.displayName}</Link>
                  <div dir="ltr" className="text-[11px] text-muted">{c.id}</div>
                </>
              ),
            },
            { key: 'type', header: t('col.type'), sort: (c) => c.type, render: (c) => t(`type.${c.type}`) },
            { key: 'org', header: t('col.org'), render: (c) => c.orgName ?? '—' },
            { key: 'city', header: t('col.city'), sort: (c) => c.city, render: (c) => c.city },
            { key: 'email', header: t('col.email'), render: (c) => <span dir="ltr">{c.email}</span> },
            { key: 'subs', header: t('col.subs'), align: 'end', sort: (c) => c.subscriptionCount, render: (c) => <span className="tabular-nums">{c.subscriptionCount}</span> },
            { key: 'status', header: t('col.status'), render: (c) => <StatusBadge status={c.status} /> },
            { key: 'created', header: t('col.created'), sort: (c) => c.createdAt, render: (c) => <span dir="ltr" className="tabular-nums text-muted">{c.createdAt}</span> },
            { key: 'act', header: t('col.actions'), align: 'end', render: (c) => <Link href={`/customers/${c.id}`} className="text-xs font-semibold text-accent-strong hover:underline">{t('act.view')}</Link> },
          ];
          const filters: FilterDef<CustomerRow>[] = [
            { key: 'type', label: t('col.type'), get: (c) => c.type, options: TYPES.map((v) => ({ v, l: t(`type.${v}`) })) },
            { key: 'status', label: t('col.status'), get: (c) => c.status, options: [{ v: 'active', l: t('status.active') }, { v: 'inactive', l: t('status.inactive') }] },
            { key: 'city', label: t('col.city'), get: (c) => c.city, options: cities.map((v) => ({ v, l: v })) },
          ];
          return (
            <Card flush>
              <DataTable rows={d.data} columns={columns} rowKey={(c) => c.id} searchFields={(c) => [c.displayName, c.id, c.email, c.businessName]} searchPlaceholder={t('cust.searchPh')} filters={filters} defaultSort={{ key: 'name', dir: 'asc' }} />
            </Card>
          );
        }}
      </ApiGate>
    </>
  );
}
