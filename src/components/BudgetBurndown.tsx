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
  /** Budget cap actually in force; falls back to the demo cap when not supplied. */
  budgetCap?: number;
}

export default function BudgetBurndown({
  currentExpenses,
  remainingBudget,
  upcomingTotal,
  budgetOverrun,
  currency,
  language,
  budgetCap,
}: BudgetBurndownProps) {
  const t = translations[language];
  const cap = budgetCap && budgetCap > 0 ? budgetCap : MONTHLY_BUDGET_CAP[currency];
  const rawPercent = cap > 0 ? (currentExpenses / cap) * 100 : 0;
  const usedPercent = Math.min(100, Math.round(rawPercent));
  const isOverrun = budgetOverrun > 0;
  const near = !isOverrun && rawPercent >= 80;

  const barTone = isOverrun ? 'bg-bad' : near ? 'bg-warn' : 'bg-ink';

  return (
    <section className="flex h-full flex-col justify-between border border-line bg-surface p-5" aria-labelledby="budget-title">
      <div>
        <h3 id="budget-title" className="mb-1 font-head text-sm font-bold text-ink">
          {t.budgetTitle}
        </h3>
        <p className="mb-4 text-xs text-muted">{t.allocatedCap}</p>

        <div className="space-y-2">
          <div className="flex flex-wrap justify-between gap-2 text-xs">
            <span className="text-muted">
              {t.budgetUsed}: <span className="tabular-nums">{rawPercent.toFixed(0)}%</span>
            </span>
            <span dir="ltr" className="font-semibold tabular-nums text-ink">
              {formatCurrency(currentExpenses, currency)} / {formatCurrency(cap, currency)}
            </span>
          </div>
          <div
            className="h-2.5 w-full bg-surface-2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={usedPercent}
            aria-label={t.budgetUsed}
          >
            <div className={`h-full ${barTone}`} style={{ width: `${usedPercent}%` }} />
          </div>
        </div>

        <div className="mt-4 border border-line bg-surface-2 p-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{t.kpiRemainingBudget}</div>
          <div dir="ltr" className={`text-lg font-bold tabular-nums ${isOverrun ? 'text-bad-ink' : 'text-ink'}`}>
            {formatCurrency(remainingBudget, currency)}
          </div>
          {isOverrun && (
            <div className="mt-1 text-[11px] font-semibold text-bad-ink">
              {t.budgetOverrunLabel}: <span dir="ltr" className="tabular-nums">{formatCurrency(budgetOverrun, currency)}</span>
            </div>
          )}
          {near && <div className="mt-1 text-[11px] font-semibold text-warn-ink">≥ 80%</div>}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <div>
          <div className="text-xs font-bold text-ink">{t.upcomingObligations}</div>
          <div className="text-[11px] text-muted">{t.dueSoon}</div>
        </div>
        <div dir="ltr" className="text-sm font-bold tabular-nums text-ink">
          {formatCurrency(upcomingTotal, currency)}
        </div>
      </div>
    </section>
  );
}
