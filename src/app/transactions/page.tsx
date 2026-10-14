'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { DemoNotice, PageHeader, PageSkeleton } from '@/components/ui/primitives';
import TransactionsTable from '@/components/TransactionsTable';
import PlatformFilter from '@/components/PlatformFilter';
import DataSourceBanner from '@/components/DataSourceBanner';
import ExportCsvButton from '@/components/ExportCsvButton';

export default function TransactionsPage() {
  const { t, tr, lang, currency, month, platform } = useApp();
  const { transactions, ready } = useDashboardData();

  const rows = useMemo(
    () => transactions.filter((tx) => tx.month === month && (platform === 'all' || tx.source === platform)),
    [transactions, month, platform]
  );

  if (!ready) return <PageSkeleton />;

  return (
    <>
      <PageHeader
        title={t('nav.transactions')}
        subtitle={tr.transactionsSubtitle}
        actions={
          <>
            <PlatformFilter />
            <ExportCsvButton />
          </>
        }
      />
      <DataSourceBanner />
      <DemoNotice text={tr.demoDataNotice} />
      <TransactionsTable transactions={rows} currency={currency} language={lang} pageSize={12} />
    </>
  );
}
