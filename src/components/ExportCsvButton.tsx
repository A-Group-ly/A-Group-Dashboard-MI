'use client';

import React, { useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { mapApiTransaction, type ApiTransaction } from '@/lib/mapApi';
import { downloadCsv, transactionsToCsv } from '@/lib/csv';

/**
 * Exports exactly what the filters select (period, currency, platform). The server re-checks the
 * "export:csv" permission and the tenant on the request; the button is hidden for roles without it.
 */
export default function ExportCsvButton() {
  const { t, range, currency, platform } = useApp();
  const { can } = useAccess();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!can('export:csv')) return null;

  const onClick = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const qs = new URLSearchParams({ from: range.from, to: range.to, currency, limit: '200' });
      const res = await fetch(`/api/transactions?${qs}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('export failed');
      const body = (await res.json()) as { data: ApiTransaction[] };
      const rows = body.data.map(mapApiTransaction).filter((tx) => platform === 'all' || tx.source === platform);
      downloadCsv(`a-group-transactions-${range.from}_${range.to}-${currency}.csv`, transactionsToCsv(rows));
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
