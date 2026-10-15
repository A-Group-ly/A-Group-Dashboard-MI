'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { pctChange, type ComparisonItem } from '@/lib/analytics';
import { formatCurrency } from '@/lib/calculations';
import type { Currency } from '@/types/dashboard';

interface Props {
  title: string;
  items: ComparisonItem[];
  currency: Currency;
  /** Whether an increase is good (income) or bad (expenses); drives the change colour. */
  increaseIs: 'good' | 'bad';
  currentLabel: string;
  previousLabel: string;
  /** Highlight one row (e.g. the platform in scope). */
  highlightKey?: string;
}

/**
 * Horizontal grouped bars: this month vs last month per category.
 * - one shared scale so lengths are comparable
 * - the change is shown as text ([+12%]), never colour alone
 * - each row is a labelled image for screen readers
 */
export default function ComparisonBars({ title, items, currency, increaseIs, currentLabel, previousLabel, highlightKey }: Props) {
  const { t } = useApp();
  const max = Math.max(1, ...items.flatMap((i) => [i.current, i.previous]));

  return (
    <section className="border border-line bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-head text-sm font-bold text-ink">{title}</h3>
        <div className="flex items-center gap-4 text-xs text-ink-2">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 bg-chart-1" aria-hidden="true" />
            {currentLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 bg-chart-3" aria-hidden="true" />
            {previousLabel}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted">{t('f.empty')}</p>
      ) : (
        <ul className="space-y-4">
          {items.map((it) => {
            const change = pctChange(it.current, it.previous);
            const up = it.current >= it.previous;
            const good = change === null || change === 0 ? null : increaseIs === 'good' ? up : !up;
            const tone = good === null ? 'text-muted' : good ? 'text-ok-ink' : 'text-bad-ink';
            return (
              <li
                key={it.key}
                className={highlightKey === it.key ? 'bg-accent-soft/50' : ''}
                role="img"
                aria-label={`${it.label}: ${currentLabel} ${formatCurrency(it.current, currency)}, ${previousLabel} ${formatCurrency(it.previous, currency)}`}
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
                  <span className="min-w-0 break-words font-semibold text-ink" title={it.label}>
                    {it.label}
                  </span>
                  <span dir="ltr" className={`shrink-0 font-bold tabular-nums ${tone}`}>
                    {change === null ? `[${t('cmp.na')}]` : `[${change > 0 ? '+' : ''}${change.toFixed(1)}%]`}
                  </span>
                </div>
                {[
                  { v: it.current, cls: 'bg-chart-1' },
                  { v: it.previous, cls: 'bg-chart-3' },
                ].map((bar, i) => (
                  <div key={i} className="mb-1 flex items-center gap-3">
                    <div className="h-2.5 flex-1 bg-surface-2">
                      {bar.v > 0 && <div className={`h-full ${bar.cls}`} style={{ width: `${Math.max((bar.v / max) * 100, 1)}%` }} />}
                    </div>
                    <span dir="ltr" className="w-28 shrink-0 text-end text-[11px] tabular-nums text-ink-2">
                      {formatCurrency(bar.v, currency)}
                    </span>
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
