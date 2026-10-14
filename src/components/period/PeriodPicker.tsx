'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { GRANULARITIES, formatRange, isIsoDate, type Granularity } from '@/lib/period';
import { controlClass } from '@/components/ui/primitives';

/**
 * Period filter: day / week / month / quarter / half-year / custom range.
 * Every choice has an automatic comparison period (shown under the picker) that drives all deltas.
 */
export default function PeriodPicker() {
  const { t, lang, period, range, previous, setGranularity, setCustomRange, shift, goToToday } = useApp();
  const isCustom = period.granularity === 'custom';
  const arrow = 'grid h-8 w-8 place-items-center border border-line-strong bg-surface text-sm text-ink transition-colors hover:border-ink hover:bg-surface-2 active:scale-95';

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('period.label')}>
      <select
        aria-label={t('period.label')}
        value={period.granularity}
        onChange={(e) => setGranularity(e.target.value as Granularity)}
        className={`${controlClass} h-8 font-semibold`}
      >
        {GRANULARITIES.map((g) => (
          <option key={g} value={g}>
            {t(`period.${g}`)}
          </option>
        ))}
      </select>

      {isCustom ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            {t('period.from')}
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => isIsoDate(e.target.value) && setCustomRange(e.target.value, range.to)}
              className={`${controlClass} h-8`}
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            {t('period.to')}
            <input
              type="date"
              value={range.to}
              min={range.from}
              onChange={(e) => isIsoDate(e.target.value) && setCustomRange(range.from, e.target.value)}
              className={`${controlClass} h-8`}
            />
          </label>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button type="button" className={arrow} onClick={() => shift(-1)} aria-label={t('period.prev')}>
            <span aria-hidden="true" className="rtl:hidden">‹</span>
            <span aria-hidden="true" className="hidden rtl:inline">›</span>
          </button>
          <span className="min-w-36 border border-line-strong bg-surface px-3 py-1.5 text-center text-xs font-bold text-ink" aria-live="polite" dir="auto">
            {formatRange(range, lang, period.granularity)}
          </span>
          <button type="button" className={arrow} onClick={() => shift(1)} aria-label={t('period.next')}>
            <span aria-hidden="true" className="rtl:hidden">›</span>
            <span aria-hidden="true" className="hidden rtl:inline">‹</span>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={goToToday}
        className="h-8 border border-line-strong bg-surface px-3 text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-surface-2 active:scale-95"
      >
        {t('period.today')}
      </button>

      <span className="text-xs text-muted" dir="auto">
        {t('scope.vs')} {formatRange(previous, lang, isCustom ? undefined : period.granularity)}
      </span>
    </div>
  );
}
