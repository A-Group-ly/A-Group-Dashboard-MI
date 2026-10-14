'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useTransactions } from '@/components/providers/useTransactions';
import { DemoNotice, ErrorState, PageHeader, PageSkeleton } from '@/components/ui/primitives';
import TransactionsTable from '@/components/TransactionsTable';
import ScopeBar from '@/components/ScopeBar';
import ExportCsvButton from '@/components/ExportCsvButton';

export default function TransactionsPage() {
  const { t, tr, lang, currency, platform } = useApp();
  const tx = useTransactions(200);

  const rows = useMemo(() => (tx.rows ? (platform === 'all' ? tx.rows : tx.rows.filter((r) => r.source === platform)) : []), [tx.rows, platform]);

  return (
    <>
      <PageHeader title={t('nav.transactions')} subtitle={tr.transactionsSubtitle} actions={<ExportCsvButton />} />
      <ScopeBar />
      <DemoNotice text={tr.demoDataNotice} />
      {tx.loading && !tx.rows ? (
        <PageSkeleton />
      ) : tx.errorStatus !== null && !tx.rows ? (
        <ErrorState message={t('err.server')} onRetry={tx.retry} />
      ) : (
        <>
          {tx.total > (tx.rows?.length ?? 0) && (
            <p className="mb-3 text-xs text-warn-ink" role="status">
              {t('tx.truncated')}: {tx.rows?.length} / {tx.total}
            </p>
          )}
          <TransactionsTable transactions={rows} currency={currency} language={lang} pageSize={12} />
        </>
      )}
    </>
  );
}
