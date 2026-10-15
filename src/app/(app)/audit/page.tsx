'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { Badge, Card, DemoNotice, PageHeader } from '@/components/ui/primitives';
import ServerTable, { type SCol, type SFilter } from '@/components/ui/ServerTable';

interface Row {
  id: string;
  at: string;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string | null;
}
interface Resp {
  data: Row[];
  total: number;
  page: number;
  pageSize: number;
  facets: { entities: string[] };
}

export default function AuditPage() {
  const { t } = useApp();
  const columns: SCol<Row>[] = [
    { key: 'when', header: t('audit.when'), sortKey: 'time', render: (r) => <span dir="ltr" className="whitespace-nowrap tabular-nums text-muted">{r.at.slice(0, 16).replace('T', ' ')}</span> },
    { key: 'who', header: t('audit.who'), render: (r) => (<><div className="font-semibold text-ink">{r.actorName ?? '—'}</div>{r.actorRole && <div className="text-[11px] text-muted">{t(`role.${r.actorRole}`)}</div>}</>) },
    { key: 'action', header: t('audit.action'), render: (r) => <Badge tone="neutral"><span dir="ltr">{r.action}</span></Badge> },
    { key: 'entity', header: t('audit.entity'), render: (r) => (<><div>{r.entity}</div>{r.entityId && <div dir="ltr" className="max-w-[12rem] break-all text-[11px] text-muted">{r.entityId}</div>}</>) },
    { key: 'summary', header: t('audit.summary'), render: (r) => <span dir="auto" className="text-ink-2">{r.summary ?? '—'}</span> },
  ];
  const filters = (resp: Resp | null): SFilter[] => [{ key: 'entity', label: t('audit.entity'), options: (resp?.facets.entities ?? []).map((v) => ({ v, l: v })) }];

  return (
    <>
      <PageHeader title={t('audit.title')} subtitle={t('audit.sub')} />
      <DemoNotice />
      <Card flush>
        <ServerTable<Row, Resp>
          endpoint="/api/audit"
          columns={columns}
          rowKey={(r) => r.id}
          filters={filters}
          defaultSort={{ key: 'time', dir: 'desc' }}
          pageSize={25}
          searchPlaceholder={t('audit.searchPh')}
          emptyBody={t('audit.empty')}
        />
      </Card>
    </>
  );
}
