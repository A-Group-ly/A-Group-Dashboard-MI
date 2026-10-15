'use client';

import React, { useId, useRef, useState } from 'react';
import { compact, niceMax } from './chartUtils';

export interface LineSeries {
  key: string;
  name: string;
  color: string;
  values: (number | null)[];
  dashed?: boolean;
}

interface Props {
  labels: string[];
  series: LineSeries[];
  format: (v: number) => string;
  ariaLabel: string;
  height?: number;
}

const W = 720;
const PAD = { l: 52, r: 14, t: 12, b: 28 };

/**
 * Responsive SVG line chart. Hover or use the arrow keys to read exact values; the same numbers are
 * available as text for screen readers.
 */
export default function LineChart({ labels, series, format, ariaLabel, height = 260 }: Props) {
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const n = labels.length;
  const iw = W - PAD.l - PAD.r;
  const ih = height - PAD.t - PAD.b;

  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values.map((v) => v ?? 0))));
  const x = (i: number) => PAD.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => PAD.t + ih - (v / max) * ih;

  const step = Math.max(1, Math.ceil(n / 7));

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - r.left) / r.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === 'Escape') setHover(null);
  };

  const tipLeft = hover === null ? 0 : (x(hover) / W) * 100;

  return (
    <div ref={wrap} className="relative" onKeyDown={onKey}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="block h-auto w-full touch-pan-y"
        role="img"
        aria-labelledby={`${id}-t`}
        tabIndex={0}
        onBlur={() => setHover(null)}
        onMouseLeave={() => setHover(null)}
      >
        <title id={`${id}-t`}>{ariaLabel}</title>
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (max * i) / 4;
          return (
            <g key={i}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" strokeWidth="1" />
              <text x={PAD.l - 8} y={y(v) + 3.5} textAnchor="end" className="fill-muted text-[10.5px] tabular-nums">
                {compact(v)}
              </text>
            </g>
          );
        })}
        {labels.map((l, i) =>
          i % step === 0 || i === n - 1 ? (
            <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className="fill-muted text-[10.5px]">
              {l}
            </text>
          ) : null
        )}

        {series.map((s) => {
          const pts = s.values.map((v, i) => (v === null ? null : ([x(i), y(v)] as const)));
          const segs: string[] = [];
          let cur = '';
          pts.forEach((p) => {
            if (!p) {
              if (cur) segs.push(cur);
              cur = '';
            } else cur += `${cur ? ' L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
          });
          if (cur) segs.push(cur);
          return (
            <g key={s.key}>
              {segs.map((d, i) => (
                <path key={i} d={d} fill="none" stroke={s.color} strokeWidth={s.dashed ? 1.6 : 2.4} strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" strokeLinecap="round" opacity={s.dashed ? 0.75 : 1} />
              ))}
              {!s.dashed &&
                pts.map((p, i) => (p ? <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 4.5 : n > 40 ? 0 : 2.6} fill={s.color} className="transition-all duration-150" /> : null))}
            </g>
          );
        })}

        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="var(--muted)" strokeWidth="1" strokeDasharray="3 3" />}
        <rect x={PAD.l} y={PAD.t} width={iw} height={ih} fill="transparent" onMouseMove={onMove} onTouchMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const rel = (e.touches[0].clientX - r.left) / r.width;
          setHover(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))));
        }} />
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-1 z-10 min-w-40 border border-line bg-surface px-3 py-2 text-xs shadow-lg"
          style={{ left: `${tipLeft}%`, transform: tipLeft > 65 ? 'translateX(-105%)' : 'translateX(8%)' }}
          role="status"
        >
          <div className="mb-1 font-bold text-ink" dir="auto">{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-ink-2">
                <span className="h-2 w-2" style={{ background: s.color, opacity: s.dashed ? 0.6 : 1 }} aria-hidden="true" />
                {s.name}
              </span>
              <b dir="ltr" className="tabular-nums text-ink">{s.values[hover] === null ? '—' : format(s.values[hover] as number)}</b>
            </div>
          ))}
        </div>
      )}

      {/* Text alternative for assistive technology */}
      <div className="sr-only">
      <table>
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {series.map((s) => (
              <th key={s.key} scope="col">{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={i}>
              <th scope="row">{l}</th>
              {series.map((s) => (
                <td key={s.key}>{s.values[i] === null ? '' : format(s.values[i] as number)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
