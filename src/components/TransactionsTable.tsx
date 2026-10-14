'use client';

import React, { useMemo } from 'react';
import { Currency, Language, Transaction, PaymentMethod } from '@/types/dashboard';
import { translations } from '@/lib/translations';
import { formatCurrency } from '@/lib/calculations';
import DataTable, { type Column, type FilterDef } from '@/components/ui/DataTable';
import { Badge, type BadgeTone } from '@/components/ui/primitives';

interface TransactionsTableProps {
  transactions: Transaction[];
  currency: Currency;
  language: Language;
  /** Page size; the overview uses a short list, the transactions page a longer one. */
  pageSize?: number;
}

const PAYMENT_LABELS: Record<PaymentMethod, { en: string; ar: string }> = {
  CASH: { en: 'Cash', ar: 'نقدي' },
  LOCAL_CARD: { en: 'Local Card', ar: 'بطاقة محلية' },
  INTERNATIONAL_CARD: { en: 'International Card', ar: 'بطاقة دولية' },
  BANK_TRANSFER: { en: 'Bank Transfer', ar: 'تحويل بنكي' },
  DIGITAL_WALLET: { en: 'Digital Wallet', ar: 'محفظة رقمية' },
  OTHER: { en: 'Other', ar: 'أخرى' },
  NOT_APPLICABLE: { en: 'N/A', ar: 'غير محدد' },
};

const STATUS_TONE: Record<string, BadgeTone> = { paid: 'ok', pending: 'warn', upcoming: 'ink' };

export default function TransactionsTable({ transactions, currency, language, pageSize = 10 }: TransactionsTableProps) {
  const t = translations[language];
  const rows = useMemo(() => transactions.filter((tx) => tx.currency === currency), [transactions, currency]);

  const statusLabel = (s: string) => (s === 'paid' ? t.statusPaid : s === 'upcoming' ? t.statusUpcoming : t.statusPending);
  const pmLabel = (m: PaymentMethod) => PAYMENT_LABELS[m][language];

  const columns: Column<Transaction>[] = [
    {
      key: 'description',
      header: t.colDescription,
      sort: (r) => (language === 'ar' ? r.descriptionAr : r.description),
      render: (r) => <span className="font-semibold text-ink">{language === 'ar' ? r.descriptionAr : r.description}</span>,
    },
    { key: 'source', header: t.colPlatform, sort: (r) => r.source, render: (r) => <Badge tone="neutral">{r.source}</Badge> },
    { key: 'category', header: t.colCategory, render: (r) => <span className="text-muted">{language === 'ar' ? r.categoryAr : r.category}</span> },
    { key: 'date', header: t.colDate, sort: (r) => r.date, render: (r) => <span dir="ltr" className="tabular-nums text-muted">{r.date}</span> },
    { key: 'status', header: t.colStatus, render: (r) => <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{statusLabel(r.status)}</Badge> },
    { key: 'method', header: t.colPaymentMethod, render: (r) => <span className="text-muted">{pmLabel(r.paymentMethod)}</span> },
    {
      key: 'amount',
      header: t.colAmount,
      align: 'end',
      sort: (r) => r.amount,
      render: (r) => (
        <span dir="ltr" className={`font-bold tabular-nums ${r.type === 'outflow' ? 'text-bad-ink' : 'text-ok-ink'}`}>
          {r.type === 'outflow' ? '−' : '+'}
          {formatCurrency(r.amount, r.currency)}
        </span>
      ),
    },
  ];

  const filters: FilterDef<Transaction>[] = [
    {
      key: 'status',
      label: t.colStatus,
      get: (r) => r.status,
      options: [
        { v: 'paid', l: t.statusPaid },
        { v: 'pending', l: t.statusPending },
        { v: 'upcoming', l: t.statusUpcoming },
      ],
    },
    {
      key: 'category',
      label: t.colCategory,
      get: (r) => r.category,
      options: Array.from(new Set(rows.map((r) => r.category))).map((c) => {
        const sample = rows.find((r) => r.category === c)!;
        return { v: c, l: language === 'ar' ? sample.categoryAr : c };
      }),
    },
    {
      key: 'method',
      label: t.colPaymentMethod,
      get: (r) => r.paymentMethod,
      options: Array.from(new Set(rows.map((r) => r.paymentMethod))).map((m) => ({ v: m, l: pmLabel(m) })),
    },
  ];

  return (
    <section className="border border-line bg-surface" aria-labelledby="txn-title">
      <header className="border-b border-line px-5 py-3">
        <h3 id="txn-title" className="font-head text-sm font-bold text-ink">
          {t.transactionsTitle}
        </h3>
        <p className="text-xs text-muted">{t.transactionsSubtitle}</p>
      </header>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        searchFields={(r) => [r.description, r.descriptionAr, r.source, r.category]}
        searchPlaceholder={t.searchPlaceholder}
        filters={filters}
        defaultSort={{ key: 'date', dir: 'desc' }}
        pageSize={pageSize}
        emptyBody={t.noTransactions}
      />
    </section>
  );
}
