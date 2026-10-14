'use client';

import React from 'react';
import { Language, type PaymentChannelBreakdown } from '@/types/dashboard';
import { translations } from '@/lib/translations';
import { formatCurrency } from '@/lib/calculations';

interface PaymentChannelBreakdownProps {
  incomeBreakdown: PaymentChannelBreakdown[];
  expensesBreakdown: PaymentChannelBreakdown[];
  currency: 'LYD' | 'USD';
  language: Language;
}

const LABELS: Record<string, { en: string; ar: string }> = {
  CASH: { en: 'Cash', ar: 'نقدي' },
  LOCAL_CARD: { en: 'Local Card', ar: 'بطاقة محلية' },
  INTERNATIONAL_CARD: { en: 'International Card', ar: 'بطاقة دولية' },
  BANK_TRANSFER: { en: 'Bank Transfer', ar: 'تحويل بنكي' },
  DIGITAL_WALLET: { en: 'Digital Wallet', ar: 'محفظة رقمية' },
  OTHER: { en: 'Other', ar: 'أخرى' },
  NOT_APPLICABLE: { en: 'N/A', ar: 'غير محدد' },
};

export default function PaymentChannelBreakdown({ incomeBreakdown, expensesBreakdown, currency, language }: PaymentChannelBreakdownProps) {
  const t = translations[language];
  const label = (m: string) => (LABELS[m] ? LABELS[m][language] : m);

  const panel = (title: string, data: PaymentChannelBreakdown[], bar: string) => {
    const total = data.reduce((s, i) => s + i.amount, 0);
    return (
      <div className="border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h4 className="font-head text-sm font-bold text-ink">{title}</h4>
          {data.length > 0 && (
            <span dir="ltr" className="text-xs font-bold tabular-nums text-ink">
              {formatCurrency(total, currency)}
            </span>
          )}
        </div>
        {data.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">{t.noPaymentData}</p>
        ) : (
          <ul className="space-y-3">
            {data.map((item) => (
              <li key={item.paymentMethod} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-2">{label(item.paymentMethod)}</span>
                  <span dir="ltr" className="tabular-nums text-muted">
                    {formatCurrency(item.amount, currency)}
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-2" role="img" aria-label={`${label(item.paymentMethod)} ${item.percentage.toFixed(1)}%`}>
                  <div className={`h-full ${bar}`} style={{ width: `${Math.min(item.percentage, 100)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted">
                  <span>
                    {item.transactionCount} {t.transactionCount}
                  </span>
                  <span dir="ltr" className="tabular-nums">{item.percentage.toFixed(1)}%</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {panel(t.incomeByPaymentMethod, incomeBreakdown, 'bg-ink')}
      {panel(t.expensesByPaymentMethod, expensesBreakdown, 'bg-accent')}
    </div>
  );
}
