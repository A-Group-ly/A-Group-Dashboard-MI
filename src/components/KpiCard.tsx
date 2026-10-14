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
  // Controls context-aware colour: an expense going UP is bad, income going UP is good.
  sentimentType?: 'income' | 'expense' | 'neutral' | 'net';
}

export default function KpiCard({ title, metric, subtitle, language, sentimentType = 'income' }: KpiCardProps) {
  const t = translations[language];

  let good: boolean | null = null; // null = neutral
  if (sentimentType === 'income') good = metric.isIncrease;
  else if (sentimentType === 'expense') good = !metric.isIncrease;
  else if (sentimentType === 'net') good = metric.current > metric.previous;

  const deltaTone = good === null ? 'text-muted' : good ? 'text-ok-ink' : 'text-bad-ink';

  // Never invent a percentage when the comparison month has no data.
  const pctText =
    metric.percentageChange !== null
      ? `[${metric.percentageChange > 0 ? '+' : ''}${metric.percentageChange.toFixed(1)}%]`
      : `[${t.notAvailable}]`;

  const absText = `${metric.absoluteChange >= 0 ? '+' : ''}${formatCurrency(metric.absoluteChange, metric.currency)}`;

  return (
    <div className="flex flex-col justify-between border border-line bg-surface p-5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{title}</span>
          <span className="border border-line px-1.5 py-0.5 text-[10px] font-semibold text-muted">{metric.currency}</span>
        </div>
        <div dir="ltr" className="mt-2 text-start text-2xl font-bold tabular-nums tracking-tight text-ink rtl:text-end">
          {formatCurrency(metric.current, metric.currency)}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <div className="flex items-center gap-2 text-xs">
          <span dir="ltr" className={`font-bold tabular-nums ${deltaTone}`}>
            {pctText}
          </span>
          <span dir="ltr" className="tabular-nums text-muted">
            ({absText})
          </span>
        </div>
        <span className="text-[11px] text-muted">{subtitle}</span>
      </div>
    </div>
  );
}
