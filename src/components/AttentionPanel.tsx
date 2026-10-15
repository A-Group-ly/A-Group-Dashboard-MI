'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';
import { useApiData } from '@/components/providers/useApiData';
import { Badge, Card, EmptyState, ErrorState, Money, type BadgeTone } from '@/components/ui/primitives';

type Severity = 'high' | 'medium' | 'low';
interface AlertItem {
  id: string;
  severity: Severity;
  type: string;
  date: string;
  label: string;
  customerName: string | null;
  amount: number | null;
  currency: string | null;
  detail: string | null;
  href: string | null;
}
interface ActivityItem {
  date: string;
  kind: string;
  ref: string;
  customerName: string | null;
  status: string | null;
  href: string;
}

const TONE: Record<Severity, BadgeTone> = { high: 'bad', medium: 'warn', low: 'ink' };
const sevKey = (s: Severity) => `alert.sev${s[0].toUpperCase()}${s.slice(1)}`;

/** Action center (what needs attention now) next to the latest business activity. Needs the alerts permission. */
export default function AttentionPanel({ showActions = true, showActivity = true }: { showActions?: boolean; showActivity?: boolean }) {
  const { t, range, previous } = useApp();
  const qs = new URLSearchParams({ from: range.from, to: range.to, prevFrom: previous.from, prevTo: previous.to });
  const state = useApiData<{ alerts: AlertItem[]; activity: ActivityItem[] }>(`/api/alerts?${qs}`);
  const d = state.data;

  const body = (render: (d: { alerts: AlertItem[]; activity: ActivityItem[] }) => React.ReactNode) =>
    d === null && state.errorStatus !== null ? (
      <ErrorState message={t('err.server')} onRetry={state.retry} />
    ) : d === null ? (
      <div className="space-y-2 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-6" />
        ))}
      </div>
    ) : (
      render(d)
    );

  const cols = showActions && showActivity ? 'lg:grid-cols-2' : '';
  return (
    <div className={`mb-6 grid grid-cols-1 gap-6 ${cols}`}>
      {showActions && (
        <Card title={t('ac.title')} hint={d ? `${d.alerts.length}` : undefined} flush className="!mb-0">
          {body((x) =>
            x.alerts.length === 0 ? (
              <EmptyState title={t('alert.none')} />
            ) : (
              <>
                <ul className="divide-y divide-line">
                  {x.alerts.slice(0, 6).map((a) => (
                    <li key={a.id} className="flex items-start gap-3 px-5 py-2.5 transition-colors hover:bg-surface-2">
                      <Badge tone={TONE[a.severity]}>{t(sevKey(a.severity))}</Badge>
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="font-semibold text-ink">{t(`alert.${a.type}`)} · <span dir="ltr">{a.label}</span></div>
                        <div className="break-words text-xs text-muted">
                          {a.customerName}
                          {a.amount !== null && a.currency && <> {a.customerName ? '· ' : ''}<Money value={a.amount} currency={a.currency} /></>}
                        </div>
                      </div>
                      {a.href && <Link href={a.href} className="shrink-0 text-xs font-semibold text-accent-strong hover:underline">{t('act.view')}</Link>}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-line px-5 py-2.5 text-xs">
                  <Link href="/alerts" className="font-semibold text-accent-strong hover:underline">{t('bell.viewAll')} →</Link>
                </div>
              </>
            )
          )}
        </Card>
      )}
      {showActivity && (
        <Card title={t('alert.activity')} flush className="!mb-0">
          {body((x) => (
            <ul className="divide-y divide-line">
              {x.activity.slice(0, 7).map((e, i) => (
                <li key={i} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-surface-2">
                  <span dir="ltr" className="w-24 shrink-0 text-xs tabular-nums text-muted">{e.date}</span>
                  <Link href={e.href} className="min-w-0 flex-1 text-ink transition-colors hover:text-accent-strong">
                    {t(`act.${e.kind}`)} · <span dir="ltr">{e.ref}</span>
                    {e.customerName && <span className="text-muted"> · {e.customerName}</span>}
                    {e.status && <span className="text-muted"> · {t(`status.${e.status}`)}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </Card>
      )}
    </div>
  );
}
