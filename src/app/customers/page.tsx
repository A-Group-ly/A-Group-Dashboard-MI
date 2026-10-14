'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { Card, DemoNotice, PageHeader, StatusBadge } from '@/components/ui/primitives';
import DataTable, { type Column, type FilterDef } from '@/components/ui/DataTable';
import { CUSTOMERS, SUBSCRIPTIONS, orgById, type Customer, type CustomerType } from '@/lib/subscriptionDemo';

const TYPES: CustomerType[] = ['individual', 'small_business', 'medium_business', 'enterprise', 'public_sector'];

export default function CustomersPage() {
  const { t } = useApp();
  const cities = Array.from(new Set(CUSTOMERS.map((c) => c.city))).sort();
  const subCount = (c: Customer) => SUBSCRIPTIONS.filter((s) => s.customerId === c.id).length;

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: t('col.customer'),
      sort: (c) => c.displayName,
      render: (c) => (
        <>
          <Link href={`/customers/${c.id}`} className="font-semibold text-ink hover:text-accent-strong">
            {c.displayName}
          </Link>
          <div dir="ltr" className="text-[11px] text-muted">{c.id}</div>
        </>
      ),
    },
    { key: 'type', header: t('col.type'), sort: (c) => c.type, render: (c) => t(`type.${c.type}`) },
    { key: 'org', header: t('col.org'), render: (c) => orgById(c.orgId)?.name ?? '—' },
    { key: 'city', header: t('col.city'), sort: (c) => c.city, render: (c) => c.city },
    { key: 'email', header: t('col.email'), render: (c) => <span dir="ltr">{c.email}</span> },
    { key: 'subs', header: t('col.subs'), align: 'end', sort: subCount, render: (c) => <span className="tabular-nums">{subCount(c)}</span> },
    { key: 'status', header: t('col.status'), render: (c) => <StatusBadge status={c.status} /> },
    { key: 'created', header: t('col.created'), sort: (c) => c.createdAt, render: (c) => <span dir="ltr" className="tabular-nums text-muted">{c.createdAt}</span> },
    {
      key: 'act',
      header: t('col.actions'),
      align: 'end',
      render: (c) => (
        <Link href={`/customers/${c.id}`} className="text-xs font-semibold text-accent-strong hover:underline">
          {t('act.view')}
        </Link>
      ),
    },
  ];

  const filters: FilterDef<Customer>[] = [
    { key: 'type', label: t('col.type'), get: (c) => c.type, options: TYPES.map((v) => ({ v, l: t(`type.${v}`) })) },
    { key: 'status', label: t('col.status'), get: (c) => c.status, options: [{ v: 'active', l: t('status.active') }, { v: 'inactive', l: t('status.inactive') }] },
    { key: 'city', label: t('col.city'), get: (c) => c.city, options: cities.map((v) => ({ v, l: v })) },
  ];

  return (
    <>
      <PageHeader title={t('cust.title')} subtitle={t('cust.sub')} />
      <DemoNotice />
      <p className="mb-4 text-xs text-muted">{t('ops.readOnly')}</p>
      <Card flush>
        <DataTable
          rows={CUSTOMERS}
          columns={columns}
          rowKey={(c) => c.id}
          searchFields={(c) => [c.displayName, c.id, c.email, c.businessName]}
          searchPlaceholder={t('cust.searchPh')}
          filters={filters}
          defaultSort={{ key: 'name', dir: 'asc' }}
        />
      </Card>
    </>
  );
}
