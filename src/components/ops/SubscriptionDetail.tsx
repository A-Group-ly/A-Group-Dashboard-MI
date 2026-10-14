'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { Card, DemoNotice, EmptyState, Money, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { InvoiceTable, PaymentTable } from './BillingTables';
import { INVOICES, PAYMENTS, customerById, planById, productById, subscriptionById } from '@/lib/subscriptionDemo';

export default function SubscriptionDetail({ id }: { id: string }) {
  const { t } = useApp();
  const s = subscriptionById(id);

  if (!s) {
    return (
      <>
        <PageHeader title={t('err.notFound')} crumbs={[{ href: '/subscriptions', label: t('sub.title') }]} />
        <Card>
          <EmptyState title={t('err.notFound')} body={t('err.notFoundBody')} />
        </Card>
      </>
    );
  }

  const plan = planById(s.planId);
  const product = plan ? productById(plan.productId) : undefined;
  const customer = customerById(s.customerId);
  const invoices = INVOICES.filter((i) => i.subscriptionId === id);
  const payments = PAYMENTS.filter((p) => invoices.some((i) => i.id === p.invoiceId));

  // Timeline built only from recorded dates; later dates first.
  const events: { date: string; label: string }[] = [{ date: s.startDate, label: t('sub.created') }];
  if (s.status === 'trial' && s.nextRenewal) events.push({ date: s.nextRenewal, label: t('sub.trialEnds') });
  if (s.status === 'past_due' && s.nextRenewal) events.push({ date: s.nextRenewal, label: t('sub.missedRenew') });
  if (s.canceledDate) events.push({ date: s.canceledDate, label: t('status.canceled') });
  if (s.status === 'active' && s.nextRenewal) events.push({ date: s.nextRenewal, label: t('col.renewal') });
  events.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader
        title={`${t('sub.detail')} · ${s.id}`}
        subtitle={`${customer?.displayName ?? ''} — ${product?.name ?? ''} / ${plan?.name ?? ''}`}
        crumbs={[{ href: '/subscriptions', label: t('sub.title') }, { label: s.id }]}
      />
      <DemoNotice />

      <Card>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [t('col.customer'), customer ? <Link key="c" href={`/customers/${customer.id}`} className="text-accent-strong hover:underline">{customer.displayName}</Link> : '—'],
            [t('col.product'), product?.name ?? '—'],
            [t('col.plan'), plan?.name ?? '—'],
            [
              t('col.price'),
              plan ? (
                <span key="p">
                  <Money value={plan.price} currency={plan.currency} /> <span className="text-xs text-muted">/ {t(`iv.${plan.interval}`)}</span>
                </span>
              ) : (
                '—'
              ),
            ],
            [t('col.status'), <StatusBadge key="s" status={s.status} />],
            [t('col.start'), <span key="st" dir="ltr" className="tabular-nums">{s.startDate}</span>],
            [t('col.renewal'), <span key="r" dir="ltr" className="tabular-nums">{s.nextRenewal ?? '—'}</span>],
          ].map(([label, value], i) => (
            <div key={i}>
              <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title={t('sub.relatedInv')} flush>
        {invoices.length ? <InvoiceTable invoices={invoices} /> : <EmptyState />}
      </Card>

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
}
