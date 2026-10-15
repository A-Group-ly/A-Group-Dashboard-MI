'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { useApiData } from '@/components/providers/useApiData';
import { PLATFORM_BY_CODE, type ApiTransaction } from '@/lib/mapApi';
import { formatCurrency } from '@/lib/calculations';
import { Badge, Card, EmptyState, ErrorState, type BadgeTone } from '@/components/ui/primitives';

const TONE: Record<string, BadgeTone> = { PAID: 'ok', PENDING: 'warn', UPCOMING: 'ink' };

/** The latest transactions of the selected period (all currencies, each in its own currency). */
export default function RecentTransactions({ platformCode }: { platformCode?: string }) {
  const { t, lang, range } = useApp();
  const qs = new URLSearchParams({ from: range.from, to: range.to, pageSize: '8', sort: 'date', dir: 'desc' });
  if (platformCode) qs.set('platform', platformCode);
  const state = useApiData<{ data: ApiTransaction[]; total: number }>(`/api/transactions?${qs}`);

  return (
    <Card title={t('tx.recent')} hint={state.data ? `${state.data.total.toLocaleString('en-US')}` : undefined} flush>
      {state.data === null && state.errorStatus !== null ? (
        <ErrorState message={state.errorStatus === 403 ? t('err.forbidden') : t('err.server')} onRetry={state.errorStatus === 403 ? undefined : state.retry} />
      ) : state.data === null ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-6" />
          ))}
        </div>
      ) : state.data.data.length === 0 ? (
        <EmptyState title={t('f.noResults')} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {state.data.data.map((r) => (
                  <tr key={r.id} className="border-b border-line transition-colors hover:bg-surface-2">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-ink">{lang === 'ar' ? r.descriptionAr || r.description : r.description}</div>
                      <div className="text-[11px] text-muted">
                        <span dir="ltr" className="tabular-nums">{String(r.transactionDate).slice(0, 10)}</span> · {(r.platform && PLATFORM_BY_CODE[r.platform.code]) || '—'} · {lang === 'ar' ? r.categoryAr || r.category : r.category}
                      </div>
                    </td>
                    <td className="px-2 py-2.5"><Badge tone={TONE[r.status] ?? 'neutral'}>{t(`status.${r.status.toLowerCase()}`)}</Badge></td>
                    <td className="px-4 py-2.5 text-end">
                      <span dir="ltr" className={`font-bold tabular-nums ${r.type === 'EXPENSE' ? 'text-bad-ink' : 'text-ok-ink'}`}>
                        {r.type === 'EXPENSE' ? '−' : '+'}
                        {formatCurrency(r.amount, r.currency)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs">
            <Link href="/transactions" className="font-semibold text-accent-strong hover:underline">{t('tx.viewAll')} →</Link>
          </div>
        </>
      )}
    </Card>
  );
}
