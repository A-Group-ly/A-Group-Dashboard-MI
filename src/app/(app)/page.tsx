'use client';

import React from 'react';
import { CurrencyScope, useApp } from '@/components/providers/AppProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { DemoNotice, ErrorState, PageHeader, PageSkeleton } from '@/components/ui/primitives';
import ScopeBar from '@/components/ScopeBar';
import OverviewPanel from '@/components/OverviewPanel';
import DataSourceBanner from '@/components/DataSourceBanner';
import RecentTransactions from '@/components/transactions/RecentTransactions';
import PulseStrip from '@/components/PulseStrip';
import AttentionPanel from '@/components/AttentionPanel';
import { CustomizeButton } from '@/components/ViewsAndCustomize';
import { PLATFORM_BY_CODE } from '@/lib/mapApi';

const CODE_BY_PLATFORM = Object.fromEntries(Object.entries(PLATFORM_BY_CODE).map(([code, label]) => [label, code]));

export default function OverviewPage() {
  const { platform, hidden, tr: t, t: ui } = useApp();
  const { all, loading, error, refresh } = useDashboardData();
  const { can } = useAccess();

  if (loading) return <PageSkeleton />;
  if (!all) return <ErrorState message={error ?? ui('err.server')} onRetry={refresh} />;

  // The figures are company-wide by design; the platform filter scopes the recent-transactions list.
  const scopeText = platform === 'all' ? `${t.allPlatforms} — ${t.companyWideScope}` : `${platform} — ${t.platformScope}`;

  return (
    <>
      <PageHeader title={t.overview} subtitle={scopeText} actions={<CustomizeButton />} />
      <ScopeBar />
      <DataSourceBanner />
      <DemoNotice text={t.demoDataNotice} />

      {platform !== 'all' && <p role="note" className="mb-4 border border-line bg-surface-2 px-3 py-2 text-xs text-ink-2">{ui('scope.filterNote')}</p>}
      {!hidden.includes('pulse') && <PulseStrip />}
      {can('alerts:view') && (!hidden.includes('actions') || !hidden.includes('recent')) && <AttentionPanel showActions={!hidden.includes('actions')} showActivity={!hidden.includes('recent')} />}

      <p className="mb-4 text-xs text-muted">{ui('cur.sideBySide')}</p>
      {/* Physical order is fixed in both languages: USD on the left, LYD on the right. */}
      <div dir="ltr" className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CurrencyScope currency="USD"><OverviewPanel /></CurrencyScope>
        <CurrencyScope currency="LYD"><OverviewPanel /></CurrencyScope>
      </div>

      {can('transactions:view') && <RecentTransactions platformCode={platform === 'all' ? undefined : CODE_BY_PLATFORM[platform]} />}
    </>
  );
}
