'use client';

import React from 'react';
import { Currency, Language, Transaction } from '@/types/dashboard';
import { translations } from '@/lib/translations';
import { formatCurrency } from '@/lib/calculations';
import { getPreviousMonth } from '@/lib/month';

interface CashFlowChartProps {
  transactions: Transaction[];
  currency: Currency;
  language: Language;
  selectedMonth: string;
}

export default function CashFlowChart({ transactions, currency, language, selectedMonth }: CashFlowChartProps) {
  const t = translations[language];
  const months = [getPreviousMonth(selectedMonth), selectedMonth];
  const locale = language === 'ar' ? 'ar-LY-u-nu-latn' : 'en-GB';

  const chartData = months.map((m) => {
    const list = transactions.filter((tx) => tx.month === m && tx.currency === currency);
    const income = list.filter((tx) => tx.type === 'inflow' && tx.status !== 'upcoming').reduce((s, tx) => s + tx.amount, 0);
    const expenses = list.filter((tx) => tx.type === 'outflow' && tx.status === 'paid').reduce((s, tx) => s + tx.amount, 0);
    const label = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${m}-01T00:00:00Z`));
    return { month: m, label, income, expenses };
  });

  const maxVal = Math.max(...chartData.flatMap((d) => [d.income, d.expenses]), 1);

  return (
    <section className="border border-line bg-surface p-5" aria-labelledby="cashflow-title">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="cashflow-title" className="font-head text-sm font-bold text-ink">
            {t.cashFlowTitle}
          </h3>
          <p className="text-xs text-muted">{t.cashFlowSubtitle}</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-ink-2">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 bg-ink" aria-hidden="true" />
            {t.income}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 bg-accent" aria-hidden="true" />
            {t.expenses}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {chartData.map((item) => {
          const incomePct = (item.income / maxVal) * 100;
          const expensesPct = (item.expenses / maxVal) * 100;
          return (
            <div key={item.month} className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-ink-2">
                <span>{item.label}</span>
                <span dir="ltr" className="tabular-nums text-muted">
                  {formatCurrency(item.income - item.expenses, currency)} (Net)
                </span>
              </div>
              {[
                { label: t.income, value: item.income, pct: incomePct, bar: 'bg-ink' },
                { label: t.expenses, value: item.expenses, pct: expensesPct, bar: 'bg-accent' },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-[11px] text-muted">{row.label}</span>
                  <div
                    className="h-6 flex-1 bg-surface-2"
                    role="img"
                    aria-label={`${row.label} ${item.label}: ${formatCurrency(row.value, currency)}`}
                  >
                    {row.value > 0 && <div className={`h-full ${row.bar}`} style={{ width: `${Math.max(row.pct, 1)}%` }} />}
                  </div>
                  <span dir="ltr" className="w-32 shrink-0 text-end text-xs font-semibold tabular-nums text-ink">
                    {formatCurrency(row.value, currency)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
