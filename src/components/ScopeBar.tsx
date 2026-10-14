'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { getPreviousMonth } from '@/lib/month';
import { monthLabel } from '@/lib/format';
import PlatformFilter from './PlatformFilter';

/**
 * Makes the active filters visible (spec: "make the active filters visible") and lets the user
 * narrow by platform. Month and currency are changed in the header; they are echoed here as chips.
 */
export default function ScopeBar() {
  const { t, tr, lang, month, currency, platform, setPlatform } = useApp();
  const chip = 'border border-line-strong bg-surface px-2.5 py-1 text-xs font-semibold text-ink-2';

  return (
    <div className="no-print mb-5 flex flex-wrap items-center gap-2" role="group" aria-label={t('cmp.title')}>
      <span className={chip}>{monthLabel(month, lang)}</span>
      <span className={`${chip} text-muted`}>
        {t('scope.vs')} {monthLabel(getPreviousMonth(month), lang)}
      </span>
      <span className={chip}>{currency}</span>
      <PlatformFilter />
      {platform !== 'all' && (
        <button type="button" onClick={() => setPlatform('all')} className="text-xs font-semibold text-accent-strong hover:underline">
          {t('scope.reset')} ({platform === 'all' ? tr.allPlatforms : platform})
        </button>
      )}
    </div>
  );
}
