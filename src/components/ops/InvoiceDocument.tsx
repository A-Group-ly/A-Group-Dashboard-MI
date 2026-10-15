'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { useApiData } from '@/components/providers/useApiData';
import { useToast } from '@/components/providers/ToastProvider';
import { ApiGate, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { Button, apiSend, useErrorText } from '@/components/ui/forms';
import Logo from '@/components/Logo';
import TrackRecent from '@/components/TrackRecent';
import { RecordPaymentDialog, VoidInvoiceDialog } from './BillingDialogs';
import { formatCurrency } from '@/lib/calculations';

interface Detail {
  invoice: { id: string; number: string; customerId: string; currency: 'LYD' | 'USD'; total: number; issueDate: string; dueDate: string; paidDate: string | null; status: string; note: string | null };
  issuer: { name: string; email: string | null; city: string | null; country: string | null };
  customer: { id: string; displayName: string; businessName: string | null; email: string; phone: string | null; city: string | null; country: string | null; type: string };
  subscription: { id: string; interval: string; planName: string; productName: string } | null;
  payments: { id: string; date: string; amount: number; currency: 'LYD' | 'USD'; method: string; status: string }[];
}

/** Printable single-invoice document. The sheet is always black on white (screen and paper); Print / Save as PDF is the browser's. */
export default function InvoiceDocument({ id }: { id: string }) {
  const { t, lang } = useApp();
  const { can } = useAccess();
  const toast = useToast();
  const errorText = useErrorText();
  const state = useApiData<Detail>(`/api/invoices/${encodeURIComponent(id)}`);
  const [dialog, setDialog] = useState<null | 'pay' | 'void'>(null);

  const remind = async () => {
    const res = await apiSend('POST', `/api/invoices/${id}/remind`);
    if (res.ok) toast.success(t('inv.reminded'));
    else toast.error(errorText(res));
  };

  return (
    <ApiGate state={state}>
      {({ invoice: inv, issuer, customer: c, subscription: sub, payments }) => {
        const open = inv.status === 'issued' || inv.status === 'overdue';
        const paid = payments.filter((p) => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0);
        const balance = inv.status === 'paid' || inv.status === 'void' ? 0 : inv.total;
        const fmt = (n: number) => formatCurrency(n, inv.currency);
        const cell = 'py-1.5 align-top';
        return (
          <>
            <TrackRecent kind="invoice" href={`/invoices/${inv.id}`} label={`${inv.number} · ${c.displayName}`} />
            <div className="no-print">
              <PageHeader
                title={`${t('col.invoice')} ${inv.number}`}
                crumbs={[{ href: '/invoices', label: t('inv.title') }, { label: inv.number }]}
                copyTitle={inv.number}
                actions={
                  <>
                    <Button onClick={() => window.print()}>⎙ {t('inv.print')}</Button>
                    {open && can('payments:record') && <Button variant="secondary" onClick={() => setDialog('pay')}>{t('inv.recordPayment')}</Button>}
                    {inv.status === 'overdue' && can('invoices:write') && <Button variant="secondary" onClick={remind}>{t('inv.remind')}</Button>}
                    {open && can('invoices:write') && <Button variant="danger" onClick={() => setDialog('void')}>{t('inv.void')}</Button>}
                  </>
                }
              />
            </div>
            <RecordPaymentDialog open={dialog === 'pay'} invoice={{ id: inv.id, number: inv.number, total: inv.total, currency: inv.currency, customerName: c.displayName }} onClose={() => setDialog(null)} onDone={state.retry} />
            <VoidInvoiceDialog open={dialog === 'void'} invoice={{ id: inv.id, number: inv.number, total: inv.total, currency: inv.currency, customerName: c.displayName }} onClose={() => setDialog(null)} onDone={state.retry} />

            <article
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
              aria-label={`${t('col.invoice')} ${inv.number}`}
              className="print-doc relative mx-auto mb-10 max-w-3xl overflow-hidden border border-[#d4d4d8] bg-white p-6 text-[#212121] shadow-sm sm:p-10"
            >
              {inv.status === 'void' && <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center text-7xl font-black uppercase tracking-widest text-black/10 -rotate-12">{t('status.void')}</div>}

              <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-[#212121] pb-5">
                <div className="flex items-center gap-3">
                  <Logo className="h-12 w-12 text-[#212121]" />
                  <div>
                    <div dir="ltr" className="font-head text-lg font-bold">{issuer.name}</div>
                    <div className="text-xs text-[#5c5c5c]">{[issuer.city, issuer.country].filter(Boolean).join(', ')}</div>
                    {issuer.email && <div dir="ltr" className="text-xs text-[#5c5c5c]">{issuer.email}</div>}
                  </div>
                </div>
                <div className="text-end">
                  <div className="font-head text-2xl font-bold uppercase tracking-wide">{t('inv.document')}</div>
                  <div dir="ltr" className="mt-1 text-sm font-semibold tabular-nums">{inv.number}</div>
                  <div className="mt-2 inline-block"><StatusBadge status={inv.status} /></div>
                </div>
              </header>

              <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <h2 className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#5c5c5c]">{t('inv.billTo')}</h2>
                  <div className="font-semibold" dir="auto">{c.displayName}</div>
                  {c.businessName && c.businessName !== c.displayName && <div className="text-sm" dir="auto">{c.businessName}</div>}
                  <div dir="ltr" className="text-sm text-[#5c5c5c]">{c.email}</div>
                  {c.phone && <div dir="ltr" className="text-sm text-[#5c5c5c]">{c.phone}</div>}
                  <div className="text-sm text-[#5c5c5c]">{[c.city, c.country].filter(Boolean).join(', ')}</div>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 self-start text-sm">
                  <dt className="text-[#5c5c5c]">{t('inv.issueDate')}</dt>
                  <dd dir="ltr" className="text-end font-semibold tabular-nums">{inv.issueDate}</dd>
                  <dt className="text-[#5c5c5c]">{t('inv.dueDate')}</dt>
                  <dd dir="ltr" className="text-end font-semibold tabular-nums">{inv.dueDate}</dd>
                  <dt className="text-[#5c5c5c]">{t('col.paid')}</dt>
                  <dd dir="ltr" className="text-end font-semibold tabular-nums">{inv.paidDate ?? '—'}</dd>
                  <dt className="text-[#5c5c5c]">{t('col.currency')}</dt>
                  <dd dir="ltr" className="text-end font-semibold">{inv.currency}</dd>
                </dl>
              </section>

              <table className="mt-8 w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-[#212121] text-xs text-[#5c5c5c]">
                    <th scope="col" className="py-2 text-start font-semibold">{t('inv.description')}</th>
                    <th scope="col" className="py-2 text-end font-semibold">{t('col.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#e4e4e7]">
                    <td className={cell} dir="auto">
                      {sub ? (
                        <>
                          <div className="font-semibold">{sub.productName} — {sub.planName}</div>
                          <div className="text-xs text-[#5c5c5c]">{t(`iv.${sub.interval}`)} · {sub.id}</div>
                        </>
                      ) : (
                        <div className="font-semibold">{t('inv.oneOffLine')}</div>
                      )}
                      {inv.note && <div className="mt-1 text-xs text-[#5c5c5c]" dir="auto">{inv.note}</div>}
                    </td>
                    <td dir="ltr" className={`${cell} text-end tabular-nums`}>{fmt(inv.total)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td className="pt-4 text-end text-[#5c5c5c]">{t('col.total')}</td>
                    <td dir="ltr" className="pt-4 text-end text-lg font-bold tabular-nums">{fmt(inv.total)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-end text-[#5c5c5c]">{t('inv.paidAmount')}</td>
                    <td dir="ltr" className="py-1 text-end tabular-nums">{fmt(paid)}</td>
                  </tr>
                  <tr className="border-t-2 border-[#212121]">
                    <td className="pt-2 text-end font-bold">{t('inv.balanceDue')}</td>
                    <td dir="ltr" className="pt-2 text-end text-lg font-bold tabular-nums">{fmt(balance)}</td>
                  </tr>
                </tfoot>
              </table>

              {payments.length > 0 && (
                <section className="mt-8">
                  <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#5c5c5c]">{t('cust.payments')}</h2>
                  <table className="w-full border-collapse text-xs">
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b border-[#e4e4e7]">
                          <td dir="ltr" className="py-1.5 tabular-nums">{p.date}</td>
                          <td className="py-1.5 text-[#5c5c5c]">{p.method}</td>
                          <td className="py-1.5"><StatusBadge status={p.status} /></td>
                          <td dir="ltr" className="py-1.5 text-end tabular-nums">{formatCurrency(p.amount, p.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              <footer className="mt-10 border-t border-[#e4e4e7] pt-4 text-center text-[11px] text-[#5c5c5c]">
                {t('inv.simulatedFooter')}
                <div className="no-print mt-2">
                  <Link href={`/customers/${c.id}`} className="font-semibold text-accent-strong hover:underline">{c.displayName} →</Link>
                </div>
              </footer>
            </article>
          </>
        );
      }}
    </ApiGate>
  );
}
