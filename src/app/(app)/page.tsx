'use client';

import React from 'react';
import { CurrencyScope, useApp } from '@/components/providers/AppProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { DemoNotice, ErrorState, PageHeader, PageSkeleton } from '@/components/ui/primitives';
import ScopeBar from '@/components/ScopeBar';
import OverviewPanel, { type OverviewTab } from '@/components/OverviewPanel';
import Tabs, { useRememberedTab } from '@/components/ui/Tabs';
import DataSourceBanner from '@/components/DataSourceBanner';
import RecentTransactions from '@/components/transactions/RecentTransactions';
import PulseStrip from '@/components/PulseStrip';
import AttentionPanel from '@/components/AttentionPanel';
import { CustomizeButton } from '@/components/ViewsAndCustomize';
import { PLATFORM_BY_CODE } from '@/lib/mapApi';

const CODE_BY_PLATFORM = Object.fromEntries(Object.entries(PLATFORM_BY_CODE).map(([code, label]) => [label, code]));

const TABS = ['summary', 'charts', 'breakdown', 'activity'] as const;
type Tab = (typeof TABS)[number];

export default function OverviewPage() {
  const { platform, hidden, tr: t, t: ui } = useApp();
  const { all, loading, error, refresh } = useDashboardData();
  const { can } = useAccess();
  const [saved, setTab] = useRememberedTab<Tab>('ag_tab_overview', TABS, 'summary');

  if (loading) return <PageSkeleton />;
  if (!all) return <ErrorState message={error ?? ui('err.server')} onRetry={refresh} />;

  // The figures are company-wide by design; the platform filter scopes the recent-transactions list.
  const scopeText = platform === 'all' ? `${t.allPlatforms} — ${t.companyWideScope}` : `${platform} — ${t.platformScope}`;
  const seen = (k: string) => !hidden.includes(k as never);
  const showActivity = can('alerts:view') && (seen('actions') || seen('recent'));
  const available: Tab[] = TABS.filter((k) =>
    k === 'summary' ? seen('pulse') || seen('position') || seen('kpis')
    : k === 'charts' ? seen('charts')
    : k === 'breakdown' ? seen('channels') || seen('budget') || seen('comparisons')
    : showActivity || can('transactions:view')
  );
  const tab: Tab = available.includes(saved) ? saved : (available[0] ?? 'summary');
  const panels = (which: OverviewTab) => (
    /* Physical order is fixed in both languages: USD on the left, LYD on the right. */
    <div dir="ltr" className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
      <CurrencyScope currency="USD"><OverviewPanel tab={which} /></CurrencyScope>
      <CurrencyScope currency="LYD"><OverviewPanel tab={which} /></CurrencyScope>
    </div>
  );

  return (
    <>
      <PageHeader title={t.overview} subtitle={scopeText} actions={<CustomizeButton />} />
      <ScopeBar />
      <DataSourceBanner />
      <DemoNotice text={t.demoDataNotice} />

      <Tabs
        label={t.overview}
        value={tab}
        onChange={setTab}
        tabs={available.map((k) => ({ key: k, label: ui(`ovtab.${k}`) }))}
      />

      {tab === 'summary' && (
        <>
          {platform !== 'all' && <p role="note" className="mb-4 border border-line bg-surface-2 px-3 py-2 text-xs text-ink-2">{ui('scope.filterNote')}</p>}
          {seen('pulse') && <PulseStrip />}
          <p className="mb-4 text-xs text-muted">{ui('cur.sideBySide')}</p>
          {panels('summary')}
        </>
      )}
      {tab === 'charts' && panels('charts')}
      {tab === 'breakdown' && panels('breakdown')}
      {tab === 'activity' && (
        <>
          {showActivity && <AttentionPanel showActions={seen('actions')} showActivity={seen('recent')} />}
          {can('transactions:view') && <RecentTransactions platformCode={platform === 'all' ? undefined : CODE_BY_PLATFORM[platform]} />}
        </>
      )}
    </>
  );
}
