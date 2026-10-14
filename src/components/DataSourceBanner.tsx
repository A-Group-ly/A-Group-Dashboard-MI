'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { Badge } from '@/components/ui/primitives';

/**
 * Always tells the user where the numbers come from, and never hides a failed refresh.
 * (Spec: no silent fall-back to hard-coded figures, stale data must be disclosed.)
 */
export default function DataSourceBanner() {
  const { t, lang } = useApp();
  const { source, fellBack, status, error } = useDashboardData();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
      {source === 'live' ? (
        <Badge tone="ok">{t('ref.live')} · {lang === 'ar' ? 'سجلات تجريبية مُهيّأة' : 'seeded demo records'}</Badge>
      ) : (
        <Badge tone="warn">{fellBack ? t('ref.demoFallback') : t('ref.demo')}</Badge>
      )}
      {status === 'error' && error && (
        <span role="status" className="text-bad-ink">
          {t('ref.failed')} — {source === 'live' ? (lang === 'ar' ? 'تُعرض آخر بيانات صالحة' : 'showing the last valid data') : error}
        </span>
      )}
    </div>
  );
}
