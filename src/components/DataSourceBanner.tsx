'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { Badge } from '@/components/ui/primitives';

/**
 * Tells the user where the numbers come from and never hides a failed refresh:
 * on failure the last valid data stays on screen with a visible warning.
 */
export default function DataSourceBanner() {
  const { t, lang } = useApp();
  const { status, error, data } = useDashboardData();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
      <Badge tone="ok">{t('ref.live')} · {lang === 'ar' ? 'سجلات تجريبية مُهيّأة' : 'seeded demo records'}</Badge>
      {status === 'error' && (
        <span role="status" className="text-bad-ink">
          {t('ref.failed')} — {data ? (lang === 'ar' ? 'تُعرض آخر بيانات صالحة' : 'showing the last valid data') : error}
        </span>
      )}
    </div>
  );
}
