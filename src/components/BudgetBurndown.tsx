'use client';

import React from 'react';
import { Currency, Language } from '@/types/dashboard';
import { translations } from '@/lib/translations';
import { formatCurrency } from '@/lib/calculations';
import { MONTHLY_BUDGET_CAP } from '@/lib/demoData';

interface BudgetBurndownProps {
  currentExpenses: number;
  remainingBudget: number;
  upcomingTotal: number;
  budgetOverrun: number;
  currency: Currency;
  language: Language;
}

export default function BudgetBurndown({
  currentExpenses,
  remainingBudget,
  upcomingTotal,
  budgetOverrun,
  currency,
  language,
}: BudgetBurndownProps) {
  const t = translations[language];
  const cap = MONTHLY_BUDGET_CAP[currency];
  const usedPercent = Math.min(100, Math.round((currentExpenses / cap) * 100));
  const isOverrun = budgetOverrun > 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          {t.budgetTitle}
        </h3>
        <p className="text-xs text-slate-500 mb-4">{t.allocatedCap}</p>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">{t.budgetUsed}: {usedPercent}%</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {formatCurrency(currentExpenses, currency)} / {formatCurrency(cap, currency)}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isOverrun ? 'bg-rose-500' : usedPercent > 85 ? 'bg-amber-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.min(usedPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Remaining Budget display */}
        <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">
            {t.kpiRemainingBudget}
          </div>
          <div className={`text-lg font-bold font-mono ${isOverrun ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
            {formatCurrency(remainingBudget, currency)}
          </div>
          {isOverrun && (
            <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
              {t.budgetOverrunLabel}: {formatCurrency(budgetOverrun, currency)}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Obligations Notice */}
      <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t.upcomingObligations}
              </div>
              <div className="text-[11px] text-slate-400">{t.dueSoon}</div>
            </div>
          </div>
          <div className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(upcomingTotal, currency)}
          </div>
        </div>
      </div>
    </div>
  );
}