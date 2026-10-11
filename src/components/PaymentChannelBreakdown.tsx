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

export default function PaymentChannelBreakdown({
  incomeBreakdown,
  expensesBreakdown,
  currency,
  language,
}: PaymentChannelBreakdownProps) {
  const t = translations[language];

  const paymentMethodLabels: Record<string, { en: string; ar: string }> = {
    CASH: { en: 'Cash', ar: 'نقدي' },
    LOCAL_CARD: { en: 'Local Card', ar: 'بطاقة محلية' },
    INTERNATIONAL_CARD: { en: 'International Card', ar: 'بطاقة دولية' },
    BANK_TRANSFER: { en: 'Bank Transfer', ar: 'تحويل بنكي' },
    DIGITAL_WALLET: { en: 'Digital Wallet', ar: 'محفظة رقمية' },
    OTHER: { en: 'Other', ar: 'أخرى' },
    NOT_APPLICABLE: { en: 'N/A', ar: 'غير محدد' },
  };

  const getLabel = (method: string) => {
    const labels = paymentMethodLabels[method] || { en: method, ar: method };
    return language === 'ar' ? labels.ar : labels.en;
  };

  const renderBreakdown = (
    title: string,
    data: PaymentChannelBreakdown[],
    totalAmount: number,
    isIncome: boolean
  ) => {
    if (data.length === 0) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{title}</h4>
          <p className="text-xs text-slate-500 text-center py-4">{t.noPaymentData}</p>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            {formatCurrency(totalAmount, currency)}
          </span>
        </div>
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.paymentMethod} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {getLabel(item.paymentMethod)}
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {formatCurrency(item.amount, currency)}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isIncome ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>{item.transactionCount} {t.transactionCount}</span>
                <span>{item.percentage.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const totalIncome = incomeBreakdown.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expensesBreakdown.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      {renderBreakdown(
        t.incomeByPaymentMethod,
        incomeBreakdown,
        totalIncome,
        true
      )}
      {renderBreakdown(
        t.expensesByPaymentMethod,
        expensesBreakdown,
        totalExpenses,
        false
      )}
    </div>
  );
}