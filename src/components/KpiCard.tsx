'use client';

import React from 'react';
import { MetricSummary, Language } from '@/types/dashboard';
import { formatCurrency } from '@/lib/calculations';
import { translations } from '@/lib/translations';

interface KpiCardProps {
  title: string;
  metric: MetricSummary;
  subtitle: string;
  language: Language;
  // Type controls context-aware colors: an expense going UP is bad (red), income going UP is good (green)
  sentimentType?: 'income' | 'expense' | 'neutral' | 'net';
}

export default function KpiCard({
  title,
  metric,
  subtitle,
  language,
  sentimentType = 'income',
}: KpiCardProps) {
  const t = translations[language];

  // Contextual color computation
  const isPositiveChange = metric.isIncrease;
  let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

  if (sentimentType === 'income') {
    badgeColor = isPositiveChange
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800';
  } else if (sentimentType === 'expense') {
    // If expenses increased, that is undesirable (red/rose)
    badgeColor = isPositiveChange
      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
  } else if (sentimentType === 'net') {
    // For net result: improvement (less negative or more positive) is good
    // We check if the change improves the net position
    const currentNet = metric.current;
    const previousNet = metric.previous;
    const isImprovement = currentNet > previousNet;
    badgeColor = isImprovement
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800';
  }

  const pctText =
    metric.percentageChange !== null
      ? `${metric.percentageChange > 0 ? '+' : ''}${metric.percentageChange.toFixed(1)}%`
      : t.notAvailable;

  const absText = `${metric.absoluteChange >= 0 ? '+' : ''}${formatCurrency(metric.absoluteChange, metric.currency)}`;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {metric.currency}
          </span>
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white mt-1">
          {formatCurrency(metric.current, metric.currency)}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {pctText}
          </span>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            ({absText})
          </span>
        </div>
        <span className="text-[11px] text-slate-400 text-end truncate">
          {subtitle}
        </span>
      </div>
    </div>
  );
}