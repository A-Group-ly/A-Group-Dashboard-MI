'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import PeriodPicker from '@/components/period/PeriodPicker';
import PlatformFilter from './PlatformFilter';

/**
 * Active filters, always visible: period (with its automatic comparison), currency and platform scope.
 * Currency is changed in the header; it is echoed here as a chip so the scope is never ambiguous.
 */
export default function ScopeBar({ showPlatform = true }: { showPlatform?: boolean }) {
  const { t, tr, currency, platform, setPlatform } = useApp();
  const chip = 'border border-line-strong bg-surface px-2.5 py-1 text-xs font-semibold text-ink-2';

  return (
    <div className="no-print mb-5 space-y-3 border border-line bg-surface px-4 py-3" role="group" aria-label={t('cmp.title')}>
      <PeriodPicker />
      <div className="flex flex-wrap items-center gap-2">
        <span className={chip}>{currency}</span>
        {showPlatform && <PlatformFilter />}
        {showPlatform && platform !== 'all' && (
          <button type="button" onClick={() => setPlatform('all')} className="text-xs font-semibold text-accent-strong transition-colors hover:underline">
            {t('scope.reset')} ({platform === 'all' ? tr.allPlatforms : platform})
          </button>
        )}
      </div>
    </div>
  );
}
