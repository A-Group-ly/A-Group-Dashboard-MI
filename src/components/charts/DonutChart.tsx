'use client';

import React, { useId, useState } from 'react';
import { SLICE_COLORS } from './chartUtils';

export interface Slice {
  key: string;
  label: string;
  value: number;
}

interface Props {
  title: string;
  slices: Slice[];
  format: (v: number) => string;
  emptyText: string;
  totalLabel: string;
}

/** Pie/donut with a legend that doubles as the accessible data list. Hovering either highlights the slice. */
export default function DonutChart({ title, slices, format, emptyText, totalLabel }: Props) {
  const id = useId();
  const [hover, setHover] = useState<string | null>(null);
  const data = slices.filter((s) => s.value > 0);
  const total = data.reduce((s, x) => s + x.value, 0);

  const R = 62;
  const C = 2 * Math.PI * R;
  // Start offset of each slice along the circle (computed without mutation).
  const offsets = data.map((_, i) => (data.slice(0, i).reduce((s, x) => s + x.value, 0) / (total || 1)) * C);

  return (
    <div className="border border-line bg-surface p-5">
      <h3 id={`${id}-h`} className="mb-4 font-head text-sm font-bold text-ink">{title}</h3>
      {total === 0 ? (
        <p className="py-8 text-center text-xs text-muted">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-6">
          <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0 -rotate-90" role="img" aria-labelledby={`${id}-h`}>
            <circle cx="80" cy="80" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="22" />
            {data.map((s, i) => {
              const len = (s.value / total) * C;
              return (
                <circle
                  key={s.key}
                  cx="80"
                  cy="80"
                  r={R}
                  fill="none"
                  stroke={SLICE_COLORS[i % SLICE_COLORS.length]}
                  strokeWidth={hover === s.key ? 26 : 22}
                  strokeDasharray={`${Math.max(len - 1.5, 0)} ${C - Math.max(len - 1.5, 0)}`}
                  strokeDashoffset={-offsets[i]}
                  opacity={hover === null || hover === s.key ? 1 : 0.4}
                  className="cursor-default transition-all duration-150"
                  onMouseEnter={() => setHover(s.key)}
                  onMouseLeave={() => setHover(null)}
                >
                  <title>{`${s.label}: ${format(s.value)} (${((s.value / total) * 100).toFixed(1)}%)`}</title>
                </circle>
              );
            })}
            <g className="rotate-90 origin-center">
              <text x="80" y="76" textAnchor="middle" className="fill-muted text-[9px]">{totalLabel}</text>
              <text x="80" y="92" textAnchor="middle" className="fill-ink text-[11px] font-bold tabular-nums">{format(total)}</text>
            </g>
          </svg>

          <ul className="min-w-44 flex-1 space-y-1.5 text-xs">
            {data.map((s, i) => (
              <li
                key={s.key}
                onMouseEnter={() => setHover(s.key)}
                onMouseLeave={() => setHover(null)}
                className={`flex items-center justify-between gap-3 px-2 py-1 transition-colors ${hover === s.key ? 'bg-surface-2' : ''}`}
              >
                <span className="flex min-w-0 items-center gap-2 text-ink-2">
                  <span className="h-2.5 w-2.5 shrink-0" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} aria-hidden="true" />
                  <span className="truncate" dir="auto">{s.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-ink">
                  <b dir="ltr">{((s.value / total) * 100).toFixed(1)}%</b>
                  <span dir="ltr" className="ms-2 text-muted">{format(s.value)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
