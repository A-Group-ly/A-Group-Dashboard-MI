'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { useApiData } from '@/components/providers/useApiData';
import { useAccess } from '@/components/providers/AccessProvider';
import { Button } from '@/components/ui/forms';
import { NewInvoiceDialog, SubscriptionActionDialog, type SubAction } from './BillingDialogs';
import { ApiGate, Card, DemoNotice, EmptyState, Money, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { InvoiceTable, PaymentTable, type InvoiceRow, type PaymentRowUi } from './BillingTables';
import type { SubRow } from '@/app/(app)/subscriptions/page';

interface Detail {
  subscription: SubRow & { canceledDate: string | null };
  invoices: InvoiceRow[];
  payments: PaymentRowUi[];
}

export default function SubscriptionDetail({ id }: { id: string }) {
  const { t } = useApp();
  const state = useApiData<Detail>(`/api/subscriptions/${encodeURIComponent(id)}`);
  const { can } = useAccess();
  const [action, setAction] = useState<SubAction | null>(null);
  const [invoicing, setInvoicing] = useState(false);

  return (
    <ApiGate state={state}>
      {({ subscription: s, invoices, payments }) => {
        // Timeline built only from recorded dates; later dates first.
        const events: { date: string; label: string }[] = [{ date: s.startDate, label: t('sub.created') }];
        if (s.status === 'trial' && s.nextRenewal) events.push({ date: s.nextRenewal, label: t('sub.trialEnds') });
        if (s.status === 'past_due' && s.nextRenewal) events.push({ date: s.nextRenewal, label: t('sub.missedRenew') });
        if (s.canceledDate) events.push({ date: s.canceledDate, label: t('status.canceled') });
        if (s.status === 'active' && s.nextRenewal) events.push({ date: s.nextRenewal, label: t('col.renewal') });
        events.sort((a, b) => b.date.localeCompare(a.date));

        const facts: [string, React.ReactNode][] = [
          [t('col.customer'), <Link key="c" href={`/customers/${s.customerId}`} className="text-accent-strong hover:underline">{s.customerName}</Link>],
          [t('col.product'), s.productName],
          [t('col.plan'), s.planName],
          [t('col.price'), <span key="p"><Money value={s.price} currency={s.currency} /> <span className="text-xs text-muted">/ {t(`iv.${s.interval}`)}</span></span>],
          [t('col.status'), <StatusBadge key="s" status={s.status} />],
          [t('col.start'), <span key="st" dir="ltr" className="tabular-nums">{s.startDate}</span>],
          [t('col.renewal'), <span key="r" dir="ltr" className="tabular-nums">{s.nextRenewal ?? '—'}</span>],
        ];

        return (
          <>
            <PageHeader
              title={`${t('sub.detail')} · ${s.id}`}
              subtitle={`${s.customerName} — ${s.productName} / ${s.planName}`}
              crumbs={[{ href: '/subscriptions', label: t('sub.title') }, { label: s.id }]}
              actions={
                can('subscriptions:write') || can('invoices:write') ? (
                  <>
                    {can('subscriptions:write') && ['active', 'trial', 'past_due'].includes(s.status) && <Button variant="secondary" onClick={() => setAction('pause')}>{t('sub.pause')}</Button>}
                    {can('subscriptions:write') && s.status === 'paused' && <Button onClick={() => setAction('resume')}>{t('sub.resume')}</Button>}
                    {can('invoices:write') && !['canceled', 'expired'].includes(s.status) && <Button variant="secondary" onClick={() => setInvoicing(true)}>+ {t('sub.newInvoice')}</Button>}
                    {can('subscriptions:write') && ['active', 'trial', 'past_due', 'paused'].includes(s.status) && <Button variant="danger" onClick={() => setAction('cancel')}>{t('sub.cancel')}</Button>}
                  </>
                ) : undefined
              }
            />
            <SubscriptionActionDialog open={action !== null} action={action ?? 'pause'} subscriptionId={s.id} name={s.customerName} onClose={() => setAction(null)} onDone={state.retry} />
            <NewInvoiceDialog
              open={invoicing}
              subscription={{ id: s.id, label: `${s.customerName} — ${s.productName} / ${s.planName}`, price: s.price, currency: s.currency }}
              onClose={() => setInvoicing(false)}
              onDone={state.retry}
            />
            <DemoNotice />

            <Card>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                {facts.map(([label, value], i) => (
                  <div key={i}>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</dt>
                    <dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card title={t('sub.relatedInv')} flush>{invoices.length ? <InvoiceTable invoices={invoices} /> : <EmptyState />}</Card>
            <Card title={t('sub.payments')} flush>
              {payments.length ? <PaymentTable payments={payments} /> : <EmptyState />}
              <p className="border-t border-line px-5 py-3 text-xs text-muted">{t('sub.payNote')}</p>
            </Card>
            <Card title={t('sub.activity')}>
              <ol className="space-y-3 border-s-2 border-line ps-4">
                {events.map((e, i) => (
                  <li key={i}>
                    <div dir="ltr" className="text-[11px] tabular-nums text-muted">{e.date}</div>
                    <div className="text-sm font-semibold text-ink">{e.label}</div>
                  </li>
                ))}
              </ol>
            </Card>
          </>
        );
      }}
    </ApiGate>
  );
}
