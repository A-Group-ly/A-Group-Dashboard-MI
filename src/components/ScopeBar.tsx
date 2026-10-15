'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import PeriodPicker from '@/components/period/PeriodPicker';
import PlatformFilter from './PlatformFilter';
import { SavedViews } from './ViewsAndCustomize';

/**
 * Active filters, always visible: period (with its automatic comparison) and platform scope.
 * Both currencies are always shown side by side, never combined.
 */
export default function ScopeBar({ showPlatform = true }: { showPlatform?: boolean }) {
  const { t, tr, platform, setPlatform } = useApp();

  return (
    <div className="no-print mb-5 space-y-3 border border-line bg-surface px-4 py-3" role="group" aria-label={t('cmp.title')}>
      <PeriodPicker />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SavedViews />
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
