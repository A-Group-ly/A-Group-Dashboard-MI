'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, DemoNotice, PageHeader, StatusBadge } from '@/components/ui/primitives';
import DataTable, { type Column, type FilterDef } from '@/components/ui/DataTable';
import { CUSTOMERS, ORGS, type Org } from '@/lib/subscriptionDemo';

export default function OrganizationsPage() {
  const { t } = useApp();

  const columns: Column<Org>[] = [
    {
      key: 'name',
      header: t('col.name'),
      sort: (o) => o.name,
      render: (o) => (
        <>
          <div className="font-semibold text-ink">{o.name}</div>
          <div dir="ltr" className="text-[11px] text-muted">{o.id}</div>
        </>
      ),
    },
    { key: 'kind', header: t('org.kind'), render: (o) => <StatusBadge status={o.kind} /> },
    { key: 'industry', header: t('col.industry'), sort: (o) => o.industry, render: (o) => o.industry },
    { key: 'city', header: t('col.city'), render: (o) => `${o.city}, ${o.country}` },
    {
      key: 'customers',
      header: t('org.relatedCustomers'),
      align: 'end',
      sort: (o) => CUSTOMERS.filter((c) => c.orgId === o.id).length,
      render: (o) => <span className="tabular-nums">{CUSTOMERS.filter((c) => c.orgId === o.id).length}</span>,
    },
    { key: 'created', header: t('col.created'), sort: (o) => o.createdAt, render: (o) => <span dir="ltr" className="tabular-nums text-muted">{o.createdAt}</span> },
    { key: 'status', header: t('col.status'), render: (o) => <StatusBadge status={o.status} /> },
  ];

  const filters: FilterDef<Org>[] = [
    { key: 'status', label: t('col.status'), get: (o) => o.status, options: [{ v: 'active', l: t('status.active') }, { v: 'inactive', l: t('status.inactive') }] },
    { key: 'kind', label: t('org.kind'), get: (o) => o.kind, options: [{ v: 'external', l: t('status.external') }, { v: 'internal', l: t('status.internal') }] },
  ];

  return (
    <>
      <PageHeader title={t('org.title')} subtitle={t('org.sub')} />
      <DemoNotice />
      <p className="mb-4 text-xs text-muted">{t('ops.readOnly')}</p>
      <Card flush>
        <DataTable
          rows={ORGS}
          columns={columns}
          rowKey={(o) => o.id}
          searchFields={(o) => [o.name, o.id, o.industry, o.city]}
          searchPlaceholder={t('org.searchPh')}
          filters={filters}
        />
      </Card>
    </>
  );
}
