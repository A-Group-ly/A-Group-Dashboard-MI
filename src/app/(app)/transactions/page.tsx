'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { DemoNotice, PageHeader } from '@/components/ui/primitives';
import ScopeBar from '@/components/ScopeBar';
import TransactionsPanel from '@/components/transactions/TransactionsPanel';

export default function TransactionsPage() {
  const { t, tr } = useApp();
  return (
    <>
      <PageHeader title={t('nav.transactions')} subtitle={tr.transactionsSubtitle} />
      <ScopeBar />
      <DemoNotice text={tr.demoDataNotice} />
      <p className="mb-4 text-xs text-muted">{t('cur.sideBySide')}</p>
      <TransactionsPanel />
    </>
  );
}
