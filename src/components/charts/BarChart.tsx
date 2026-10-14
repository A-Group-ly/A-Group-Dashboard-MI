'use client';

import React, { useId, useState } from 'react';
import { compact, niceMax } from './chartUtils';

export interface BarSeries {
  key: string;
  name: string;
  color: string;
  values: number[];
}

interface Props {
  labels: string[];
  series: BarSeries[];
  format: (v: number) => string;
  ariaLabel: string;
  height?: number;
}

const W = 720;
const PAD = { l: 52, r: 14, t: 12, b: 28 };

/** Responsive grouped bar chart with hover / keyboard readout and a screen-reader table. */
export default function BarChart({ labels, series, format, ariaLabel, height = 260 }: Props) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const n = labels.length;
  const iw = W - PAD.l - PAD.r;
  const ih = height - PAD.t - PAD.b;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const slot = iw / Math.max(n, 1);
  const group = Math.min(slot * 0.78, 56 * series.length);
  const bw = group / series.length;
  const step = Math.max(1, Math.ceil(n / 8));

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === 'Escape') setHover(null);
  };

  return (
    <div className="relative" onKeyDown={onKey}>
      <svg viewBox={`0 0 ${W} ${height}`} className="block h-auto w-full" role="img" aria-labelledby={`${id}-t`} tabIndex={0} onBlur={() => setHover(null)} onMouseLeave={() => setHover(null)}>
        <title id={`${id}-t`}>{ariaLabel}</title>
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (max * i) / 4;
          return (
            <g key={i}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" />
              <text x={PAD.l - 8} y={y(v) + 3.5} textAnchor="end" className="fill-muted text-[10.5px] tabular-nums">{compact(v)}</text>
            </g>
          );
        })}
        {labels.map((l, gi) => {
          const cx = PAD.l + slot * (gi + 0.5);
          return (
            <g key={gi} onMouseEnter={() => setHover(gi)} className="cursor-default">
              <rect x={cx - slot / 2} y={PAD.t} width={slot} height={ih} fill={hover === gi ? 'var(--surface-2)' : 'transparent'} className="transition-colors duration-150" />
              {series.map((s, si) => {
                const h = Math.max((s.values[gi] / max) * ih, s.values[gi] > 0 ? 1.5 : 0);
                return (
                  <rect
                    key={s.key}
                    x={cx - group / 2 + si * bw + 1}
                    y={PAD.t + ih - h}
                    width={Math.max(bw - 2, 1)}
                    height={h}
                    fill={s.color}
                    opacity={hover === null || hover === gi ? 1 : 0.55}
                    className="transition-opacity duration-150"
                  />
                );
              })}
              {gi % step === 0 || gi === n - 1 ? (
                <text x={cx} y={height - 8} textAnchor="middle" className="fill-muted text-[10.5px]">{l}</text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {hover !== null && (
        <div className="pointer-events-none absolute top-1 z-10 min-w-40 border border-line bg-surface px-3 py-2 text-xs shadow-lg" style={{ insetInlineStart: `${Math.min(70, Math.max(2, ((PAD.l + slot * (hover + 0.5)) / W) * 100))}%` }} role="status">
          <div className="mb-1 font-bold text-ink" dir="auto">{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-ink-2"><span className="h-2 w-2" style={{ background: s.color }} aria-hidden="true" />{s.name}</span>
              <b dir="ltr" className="tabular-nums text-ink">{format(s.values[hover])}</b>
            </div>
          ))}
        </div>
      )}

      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr><th scope="col">Period</th>{series.map((s) => <th key={s.key} scope="col">{s.name}</th>)}</tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={i}><th scope="row">{l}</th>{series.map((s) => <td key={s.key}>{format(s.values[i])}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
