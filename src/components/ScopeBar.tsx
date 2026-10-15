'use client';

import React from 'react';
import { useApp, type CurrencyView } from '@/components/providers/AppProvider';
import { PeriodControls, PeriodNav } from '@/components/period/PeriodPicker';
import FilterPopover, { FilterField } from '@/components/ui/FilterPopover';
import { controlClass } from '@/components/ui/primitives';
import { formatRange } from '@/lib/period';
import PlatformFilter from './PlatformFilter';
import { SavedViews } from './ViewsAndCustomize';

/** USD / LYD / Both. Currencies are never added together; "Both" shows them side by side. */
export function CurrencyToggle() {
  const { t, currencyView, setCurrencyView } = useApp();
  const opts: [CurrencyView, string][] = [
    ['both', t('cur.both')],
    ['USD', 'USD'],
    ['LYD', 'LYD'],
  ];
  return (
    <div role="group" aria-label={t('cur.view')} className="inline-flex border border-line-strong">
      {opts.map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={currencyView === v}
          onClick={() => setCurrencyView(v)}
          className={`px-3 py-1.5 text-xs font-semibold transition-colors ${currencyView === v ? 'bg-ink text-ink-contrast' : 'bg-surface text-ink-2 hover:bg-surface-2'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * One compact bar: period navigation, a Filters button (period type, platform, saved views), and the currency toggle.
 * Everything else lives in the Filters panel, so the page starts with content instead of controls.
 */
export default function ScopeBar({ showPlatform = true, showCurrency = true }: { showPlatform?: boolean; showCurrency?: boolean }) {
  const { t, lang, period, previous, platform, setPlatform, setGranularity, goToToday } = useApp();
  const active = (showPlatform && platform !== 'all' ? 1 : 0) + (period.granularity !== 'month' ? 1 : 0);
  const reset = () => {
    setPlatform('all');
    setGranularity('month');
    goToToday();
  };

  return (
    <div className="no-print mb-5 border border-line bg-surface px-4 py-3" role="group" aria-label={t('cmp.title')}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <PeriodNav />
        <FilterPopover count={active} onReset={reset} width={380}>
          <PeriodControls />
          {showPlatform && (
            <FilterField label={t('flt.platform')}>
              <PlatformFilter />
            </FilterField>
          )}
          <FilterField label={t('view.apply')}>
            <SavedViews />
          </FilterField>
        </FilterPopover>
        {showCurrency && <CurrencyToggle />}
        <span className="text-xs text-muted" dir="auto">
          {t('scope.vs')} {formatRange(previous, lang, period.granularity === 'custom' ? undefined : period.granularity)}
        </span>
      </div>
      {(active > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" aria-label={t('flt.active')}>
          {period.granularity !== 'month' && <span className="border border-line-strong bg-surface-2 px-2 py-0.5 font-semibold text-ink-2">{t(`period.${period.granularity}`)}</span>}
          {showPlatform && platform !== 'all' && (
            <button type="button" onClick={() => setPlatform('all')} className="border border-line-strong bg-surface-2 px-2 py-0.5 font-semibold text-ink-2 hover:border-ink">
              {platform} ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export { controlClass };
