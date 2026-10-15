'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { Card, DemoNotice, Money, PageHeader, StatusBadge } from '@/components/ui/primitives';
import ServerTable, { type SCol, type SFilter } from '@/components/ui/ServerTable';
import { Button, apiSend, useErrorText } from '@/components/ui/forms';
import { useToast } from '@/components/providers/ToastProvider';
import CopyButton from '@/components/ui/CopyButton';
import { NewInvoiceDialog, RecordPaymentDialog, VoidInvoiceDialog, type InvoiceLite } from '@/components/ops/BillingDialogs';

interface InvRow extends InvoiceLite {
  customerId: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  status: string;
}
interface Resp {
  data: InvRow[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUSES = ['issued', 'overdue', 'paid', 'void'];

export default function InvoicesPage() {
  const { t } = useApp();
  const { can } = useAccess();
  const [reload, setReload] = useState(0);
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<InvRow | null>(null);
  const [voiding, setVoiding] = useState<InvRow | null>(null);
  const canPay = can('payments:record');
  const canWrite = can('invoices:write');
  const bump = () => setReload((n) => n + 1);
  const toast = useToast();
  const errorText = useErrorText();
  const remind = async (i: InvRow) => {
    const res = await apiSend('POST', `/api/invoices/${i.id}/remind`);
    if (res.ok) toast.success(t('inv.reminded'));
    else toast.error(errorText(res));
  };

  const columns: SCol<InvRow>[] = [
    { key: 'number', header: t('col.invoice'), sortKey: 'number', render: (i) => (<><span dir="ltr" className="font-semibold tabular-nums text-ink">{i.number}</span><CopyButton value={i.number} /></>) },
    { key: 'customer', header: t('col.customer'), sortKey: 'customer', render: (i) => <Link href={`/customers/${i.customerId}`} className="font-semibold text-ink transition-colors hover:text-accent-strong">{i.customerName}</Link> },
    { key: 'total', header: t('col.total'), align: 'end', sortKey: 'total', render: (i) => <Money value={i.total} currency={i.currency} /> },
    { key: 'issue', header: t('col.issue'), sortKey: 'issue', render: (i) => <span dir="ltr" className="tabular-nums text-muted">{i.issueDate}</span> },
    { key: 'due', header: t('col.due'), sortKey: 'due', render: (i) => <span dir="ltr" className="tabular-nums text-muted">{i.dueDate}</span> },
    { key: 'paid', header: t('col.paid'), render: (i) => <span dir="ltr" className="tabular-nums text-muted">{i.paidDate ?? '—'}</span> },
    { key: 'status', header: t('col.status'), sortKey: 'status', render: (i) => <StatusBadge status={i.status} /> },
  ];
  if (canPay || canWrite) {
    columns.push({
      key: 'actions',
      header: t('col.actions'),
      align: 'end',
      render: (i) =>
        i.status === 'issued' || i.status === 'overdue' ? (
          <span className="inline-flex gap-3 text-xs font-semibold">
            {canWrite && i.status === 'overdue' && <button type="button" onClick={() => remind(i)} className="text-warn-ink hover:underline">{t('inv.remind')}</button>}
            {canPay && <button type="button" onClick={() => setPaying(i)} className="text-accent-strong hover:underline">{t('inv.recordPayment')}</button>}
            {canWrite && <button type="button" onClick={() => setVoiding(i)} className="text-bad-ink hover:underline">{t('inv.void')}</button>}
          </span>
        ) : null,
    });
  }
  const filters = (): SFilter[] => [
    { key: 'status', label: t('col.status'), options: STATUSES.map((v) => ({ v, l: t(`status.${v}`) })) },
    { key: 'currency', label: t('col.currency'), options: [{ v: 'USD', l: 'USD' }, { v: 'LYD', l: 'LYD' }] },
  ];

  return (
    <>
      <PageHeader title={t('inv.title')} subtitle={t('inv.sub')} />
      <DemoNotice />
      <Card flush>
        <ServerTable<InvRow, Resp>
          endpoint="/api/invoices"
          columns={columns}
          rowKey={(i) => i.id}
          filters={filters}
          defaultSort={{ key: 'issue', dir: 'desc' }}
          pageSize={25}
          searchPlaceholder={t('inv.searchPh')}
          reloadKey={reload}
          emptyAction={can('invoices:write') ? <Button onClick={() => setCreating(true)}>+ {t('inv.add')}</Button> : undefined}
          exportFilename="a-group-invoices.csv"
          toolbarEnd={canWrite ? <Button onClick={() => setCreating(true)}>+ {t('inv.add')}</Button> : null}
        />
      </Card>
      <NewInvoiceDialog open={creating} onClose={() => setCreating(false)} onDone={bump} />
      <RecordPaymentDialog open={paying !== null} invoice={paying} onClose={() => setPaying(null)} onDone={bump} />
      <VoidInvoiceDialog open={voiding !== null} invoice={voiding} onClose={() => setVoiding(null)} onDone={bump} />
    </>
  );
}
