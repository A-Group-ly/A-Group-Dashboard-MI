'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { Money, StatusBadge } from '@/components/ui/primitives';
import DataTable, { type Column } from '@/components/ui/DataTable';

export interface InvoiceRow {
  id: string;
  number: string;
  total: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: string;
}

export interface PaymentRowUi {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
}

export function InvoiceTable({ invoices }: { invoices: InvoiceRow[] }) {
  const { t } = useApp();
  const columns: Column<InvoiceRow>[] = [
    { key: 'number', header: t('col.invoice'), sort: (i) => i.number, render: (i) => <span dir="ltr" className="font-semibold tabular-nums">{i.number}</span> },
    { key: 'issue', header: t('col.issue'), sort: (i) => i.issueDate, render: (i) => <span dir="ltr" className="tabular-nums text-muted">{i.issueDate}</span> },
    { key: 'due', header: t('col.due'), sort: (i) => i.dueDate, render: (i) => <span dir="ltr" className="tabular-nums text-muted">{i.dueDate}</span> },
    { key: 'total', header: t('col.total'), align: 'end', sort: (i) => i.total, render: (i) => <Money value={i.total} currency={i.currency} /> },
    {
      key: 'balance',
      header: t('col.balance'),
      align: 'end',
      render: (i) => (i.status === 'paid' ? <Money value={0} currency={i.currency} /> : i.status === 'draft' || i.status === 'void' ? '—' : <Money value={i.total} currency={i.currency} />),
    },
    { key: 'status', header: t('col.status'), render: (i) => <StatusBadge status={i.status} /> },
  ];
  return <DataTable rows={invoices} columns={columns} rowKey={(i) => i.id} defaultSort={{ key: 'issue', dir: 'desc' }} />;
}

export function PaymentTable({ payments }: { payments: PaymentRowUi[] }) {
  const { t } = useApp();
  const columns: Column<PaymentRowUi>[] = [
    { key: 'invoice', header: t('col.invoice'), render: (p) => <span dir="ltr" className="tabular-nums">{p.invoiceNumber}</span> },
    { key: 'date', header: t('col.date'), sort: (p) => p.date, render: (p) => <span dir="ltr" className="tabular-nums text-muted">{p.date}</span> },
    { key: 'amount', header: t('col.amount'), align: 'end', render: (p) => <Money value={p.amount} currency={p.currency} /> },
    { key: 'method', header: t('col.method'), render: (p) => <span dir="ltr" className="text-muted">{p.method}</span> },
    { key: 'status', header: t('col.status'), render: (p) => <StatusBadge status={p.status} /> },
  ];
  return <DataTable rows={payments} columns={columns} rowKey={(p) => p.id} defaultSort={{ key: 'date', dir: 'desc' }} />;
}
