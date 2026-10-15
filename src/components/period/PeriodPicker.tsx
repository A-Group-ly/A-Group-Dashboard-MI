'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { GRANULARITIES, formatRange, isIsoDate, type Granularity } from '@/lib/period';
import { controlClass } from '@/components/ui/primitives';

const arrow = 'grid h-8 w-8 place-items-center border border-line-strong bg-surface text-sm text-ink transition-colors hover:border-ink hover:bg-surface-2 active:scale-95';

/** Previous / next period and "Today". For a custom range it shows the range and no arrows. */
export function PeriodNav() {
  const { t, lang, period, range, shift, goToToday } = useApp();
  const isCustom = period.granularity === 'custom';
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('period.label')}>
      {!isCustom && (
        <button type="button" className={arrow} onClick={() => shift(-1)} aria-label={t('period.prev')}>
          <span aria-hidden="true" className="rtl:hidden">‹</span>
          <span aria-hidden="true" className="hidden rtl:inline">›</span>
        </button>
      )}
      <span className="min-w-36 border border-line-strong bg-surface px-3 py-1.5 text-center text-xs font-bold text-ink" aria-live="polite" dir="auto">
        {formatRange(range, lang, isCustom ? undefined : period.granularity)}
      </span>
      {!isCustom && (
        <button type="button" className={arrow} onClick={() => shift(1)} aria-label={t('period.next')}>
          <span aria-hidden="true" className="rtl:hidden">›</span>
          <span aria-hidden="true" className="hidden rtl:inline">‹</span>
        </button>
      )}
      <button
        type="button"
        onClick={goToToday}
        className="h-8 border border-line-strong bg-surface px-3 text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-surface-2 active:scale-95"
      >
        {t('period.today')}
      </button>
    </div>
  );
}

/** Period type (day … custom range) and, for a custom range, its two dates. */
export function PeriodControls() {
  const { t, period, range, setGranularity, setCustomRange } = useApp();
  const isCustom = period.granularity === 'custom';
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{t('period.label')}</span>
        <select aria-label={t('period.label')} value={period.granularity} onChange={(e) => setGranularity(e.target.value as Granularity)} className={`${controlClass} h-9 w-full font-semibold`}>
          {GRANULARITIES.map((g) => (
            <option key={g} value={g}>{t(`period.${g}`)}</option>
          ))}
        </select>
      </label>
      {isCustom && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-muted">
            {t('period.from')}
            <input type="date" value={range.from} max={range.to} onChange={(e) => isIsoDate(e.target.value) && setCustomRange(e.target.value, range.to)} className={`${controlClass} mt-1 h-9 w-full`} />
          </label>
          <label className="block text-xs text-muted">
            {t('period.to')}
            <input type="date" value={range.to} min={range.from} onChange={(e) => isIsoDate(e.target.value) && setCustomRange(range.from, e.target.value)} className={`${controlClass} mt-1 h-9 w-full`} />
          </label>
        </div>
      )}
    </div>
  );
}

/** Both parts together (kept for pages that want the full picker inline). */
export default function PeriodPicker() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <PeriodControls />
      <PeriodNav />
    </div>
  );
}
