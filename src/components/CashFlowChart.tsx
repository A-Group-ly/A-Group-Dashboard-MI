'use client';

import React from 'react';
import { Currency, Language, Transaction } from '@/types/dashboard';
import { translations } from '@/lib/translations';
import { formatCurrency } from '@/lib/calculations';

interface CashFlowChartProps {
  transactions: Transaction[];
  currency: Currency;
  language: Language;
  selectedMonth: string;
}

export default function CashFlowChart({ transactions, currency, language, selectedMonth }: CashFlowChartProps) {
  const t = translations[language];

  // Calculate previous month from selected month
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const prevDate = new Date(year, month - 2, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const months = [prevMonthStr, selectedMonth];
  
  // Generate labels dynamically
  const monthLabels: Record<string, { en: string; ar: string }> = {};
  months.forEach(m => {
    const [y, mo] = m.split('-');
    const date = new Date(parseInt(y), parseInt(mo) - 1, 1);
    monthLabels[m] = {
      en: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      ar: date.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }),
    };
  });

  const chartData = months.map((m) => {
    const list = transactions.filter((t) => t.month === m && t.currency === currency);
    const income = list.filter((t) => t.type === 'inflow' && t.status !== 'upcoming').reduce((sum, t) => sum + t.amount, 0);
    const expenses = list.filter((t) => t.type === 'outflow' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
    return { month: m, label: monthLabels[m][language], income, expenses };
  });

  const maxVal = Math.max(...chartData.flatMap((d) => [d.income, d.expenses]), 100);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t.cashFlowTitle}
          </h3>
          <p className="text-xs text-slate-500">{t.cashFlowSubtitle}</p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-500"></span>
            <span className="text-slate-600 dark:text-slate-300">{t.income}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-rose-500"></span>
            <span className="text-slate-600 dark:text-slate-300">{t.expenses}</span>
          </div>
        </div>
      </div>

      {/* Bar Presentation */}
      <div className="space-y-6 pt-2">
        {chartData.map((item) => {
          const incomePct = maxVal > 0 ? (item.income / maxVal) * 100 : 0;
          const expensesPct = maxVal > 0 ? (item.expenses / maxVal) * 100 : 0;

          return (
            <div key={item.month} className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{item.label}</span>
                <span className="font-mono text-slate-400">
                  {formatCurrency(item.income - item.expenses, currency)} (Net)
                </span>
              </div>

              {/* Inflow bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-6 rounded-md overflow-hidden p-0.5">
                  {item.income > 0 && (
                    <div
                      className="bg-emerald-500 h-full rounded-xs transition-all duration-500 flex items-center justify-end px-2"
                      style={{ width: `${Math.max(incomePct, 8)}%` }}
                    >
                      <span className="text-[10px] font-mono font-bold text-white leading-none">
                        {formatCurrency(item.income, currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Outflow bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-6 rounded-md overflow-hidden p-0.5">
                  {item.expenses > 0 && (
                    <div
                      className="bg-rose-500 h-full rounded-xs transition-all duration-500 flex items-center justify-end px-2"
                      style={{ width: `${Math.max(expensesPct, 8)}%` }}
                    >
                      <span className="text-[10px] font-mono font-bold text-white leading-none">
                        {formatCurrency(item.expenses, currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}