'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { downloadCsv, transactionsToCsv } from '@/lib/csv';

/** Exports the selected month + currency (and platform scope) exactly as shown in the table. */
export default function ExportCsvButton() {
  const { t, month, currency, platform } = useApp();
  const { transactions } = useDashboardData();

  const onClick = () => {
    const rows = transactions.filter(
      (tx) => tx.month === month && tx.currency === currency && (platform === 'all' || tx.source === platform)
    );
    downloadCsv(`a-group-transactions-${month}-${currency}.csv`, transactionsToCsv(rows));
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-ink bg-ink px-3 py-1.5 text-xs font-semibold text-ink-contrast hover:opacity-85"
    >
      {t('act.export')}
    </button>
  );
}
