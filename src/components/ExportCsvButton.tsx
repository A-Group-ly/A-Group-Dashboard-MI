'use client';

import React, { useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { PLATFORM_BY_CODE } from '@/lib/mapApi';

const CODE_BY_PLATFORM = Object.fromEntries(Object.entries(PLATFORM_BY_CODE).map(([code, label]) => [label, code]));

/**
 * Downloads the transactions of the selected period (and platform) as CSV, built on the server from the same
 * tenant-scoped query as the tables. Both currencies are included; every row keeps its own currency.
 * The server re-checks the "export:csv" permission; the button is hidden for roles without it.
 */
export default function ExportCsvButton() {
  const { t, range, platform } = useApp();
  const { can } = useAccess();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!can('export:csv')) return null;

  const onClick = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const qs = new URLSearchParams({ from: range.from, to: range.to, format: 'csv', sort: 'date', dir: 'desc' });
      if (platform !== 'all' && CODE_BY_PLATFORM[platform]) qs.set('platform', CODE_BY_PLATFORM[platform]);
      const res = await fetch(`/api/transactions?${qs}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('export failed');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `a-group-transactions-${range.from}_${range.to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="border border-ink bg-ink px-3 py-1.5 text-xs font-semibold text-ink-contrast transition-all duration-150 hover:opacity-85 active:scale-95 disabled:opacity-50"
      >
        {t('act.export')}
      </button>
      {failed && <span role="alert" className="text-xs text-bad-ink">{t('err.server')}</span>}
    </span>
  );
}
