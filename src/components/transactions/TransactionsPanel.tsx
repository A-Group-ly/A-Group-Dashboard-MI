'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { PLATFORM_BY_CODE, type ApiTransaction } from '@/lib/mapApi';
import { formatCurrency } from '@/lib/calculations';
import { Badge, Card, type BadgeTone } from '@/components/ui/primitives';
import ServerTable, { type SCol, type SFilter } from '@/components/ui/ServerTable';
import { Button, ConfirmDialog, Field, FormDialog, SelectInput, TextInput, apiSend } from '@/components/ui/forms';

type Row = ApiTransaction & { reference?: string | null; dueDate?: string | null; platformId?: string | null };
interface Resp {
  data: Row[];
  total: number;
  page: number;
  pageSize: number;
  facets: { categories: string[]; platforms: { id: string; name: string; code: string }[] };
}
interface Pickers {
  accounts: { id: string; name: string; currency: string; type: string }[];
  platforms: { id: string; name: string; code: string }[];
}

const STATUS_TONE: Record<string, BadgeTone> = { PAID: 'ok', PENDING: 'warn', UPCOMING: 'ink' };
const METHODS = ['NOT_APPLICABLE', 'BANK_TRANSFER', 'CASH', 'LOCAL_CARD', 'INTERNATIONAL_CARD', 'DIGITAL_WALLET', 'OTHER'];
const METHOD_LABEL: Record<string, { en: string; ar: string }> = {
  CASH: { en: 'Cash', ar: 'نقدي' },
  LOCAL_CARD: { en: 'Local Card', ar: 'بطاقة محلية' },
  INTERNATIONAL_CARD: { en: 'International Card', ar: 'بطاقة دولية' },
  BANK_TRANSFER: { en: 'Bank Transfer', ar: 'تحويل بنكي' },
  DIGITAL_WALLET: { en: 'Digital Wallet', ar: 'محفظة رقمية' },
  OTHER: { en: 'Other', ar: 'أخرى' },
  NOT_APPLICABLE: { en: 'N/A', ar: 'غير محدد' },
};

const CODE_BY_PLATFORM = Object.fromEntries(Object.entries(PLATFORM_BY_CODE).map(([code, label]) => [label, code]));
const managed = (r: Row) => !!r.reference && r.reference.startsWith('INV-');

const emptyForm = (today: string) => ({
  type: 'EXPENSE',
  description: '',
  descriptionAr: '',
  amount: '',
  currency: 'LYD',
  status: 'PAID',
  category: '',
  transactionDate: today,
  paymentMethod: 'BANK_TRANSFER',
  platformId: '',
  accountId: '',
  reference: '',
});
type Form = ReturnType<typeof emptyForm>;

export default function TransactionsPanel() {
  const { t, lang, range, platform } = useApp();
  const { can } = useAccess();
  const canWrite = can('transactions:write');
  const [reload, setReload] = useState(0);
  const [pickers, setPickers] = useState<Pickers | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);

  useEffect(() => {
    if (!canWrite) return;
    const c = new AbortController();
    fetch('/api/accounts', { signal: c.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPickers(d as Pickers))
      .catch(() => {});
    return () => c.abort();
  }, [canWrite]);

  const today = new Date().toISOString().slice(0, 10);
  const initial = useMemo<Form>(() => {
    if (!editing) return emptyForm(today);
    return {
      type: editing.type,
      description: editing.description,
      descriptionAr: editing.descriptionAr ?? '',
      amount: String(editing.amount),
      currency: editing.currency,
      status: editing.status,
      category: editing.category,
      transactionDate: String(editing.transactionDate).slice(0, 10),
      paymentMethod: editing.paymentMethod,
      platformId: editing.platformId ?? '',
      accountId: editing.accountId ?? '',
      reference: editing.reference ?? '',
    };
  }, [editing, today]);

  const extra = useMemo(() => {
    const e: Record<string, string> = { from: range.from, to: range.to };
    if (platform !== 'all' && CODE_BY_PLATFORM[platform]) e.platform = CODE_BY_PLATFORM[platform];
    return e;
  }, [range.from, range.to, platform]);

  const pm = (m: string) => METHOD_LABEL[m]?.[lang] ?? m;
  const statusLabel = (s: string) => t(`status.${s.toLowerCase()}`);

  const columns: SCol<Row>[] = [
    { key: 'date', header: t('col.date'), sortKey: 'date', render: (r) => <span dir="ltr" className="tabular-nums text-muted">{String(r.transactionDate).slice(0, 10)}</span> },
    {
      key: 'description',
      header: t('tx.description'),
      sortKey: 'description',
      render: (r) => (
        <>
          <div className="font-semibold text-ink">{lang === 'ar' ? r.descriptionAr || r.description : r.description}</div>
          {r.reference && <div dir="ltr" className="text-[11px] text-muted">{r.reference}</div>}
        </>
      ),
    },
    { key: 'platform', header: t('tx.platform'), render: (r) => <Badge tone="neutral">{(r.platform && PLATFORM_BY_CODE[r.platform.code]) || r.platform?.name || '—'}</Badge> },
    { key: 'category', header: t('tx.category'), sortKey: 'category', render: (r) => <span className="text-muted">{lang === 'ar' ? r.categoryAr || r.category : r.category}</span> },
    { key: 'status', header: t('tx.status'), sortKey: 'status', render: (r) => <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{statusLabel(r.status)}</Badge> },
    { key: 'method', header: t('tx.paymentMethod'), render: (r) => <span className="text-muted">{pm(r.paymentMethod)}</span> },
    {
      key: 'amount',
      header: t('col.amount'),
      align: 'end',
      sortKey: 'amount',
      render: (r) => (
        <span dir="ltr" className={`font-bold tabular-nums ${r.type === 'EXPENSE' ? 'text-bad-ink' : 'text-ok-ink'}`}>
          {r.type === 'EXPENSE' ? '−' : '+'}
          {formatCurrency(r.amount, r.currency)}
        </span>
      ),
    },
  ];
  if (canWrite) {
    columns.push({
      key: 'actions',
      header: t('col.actions'),
      align: 'end',
      render: (r) =>
        managed(r) ? (
          <span className="text-[11px] text-muted" title={t('tx.managed')}>{t('tx.managed').split('(')[0]}</span>
        ) : (
          <span className="inline-flex gap-3 text-xs font-semibold">
            <button type="button" onClick={() => setEditing(r)} className="text-accent-strong hover:underline">{t('act.edit')}</button>
            <button type="button" onClick={() => setDeleting(r)} className="text-bad-ink hover:underline">{t('act.delete')}</button>
          </span>
        ),
    });
  }

  const filters = useCallback(
    (resp: Resp | null): SFilter[] => [
      { key: 'currency', label: t('tx.currency'), options: [{ v: 'USD', l: 'USD' }, { v: 'LYD', l: 'LYD' }] },
      { key: 'type', label: t('tx.type'), options: [{ v: 'income', l: t('tx.income') }, { v: 'expense', l: t('tx.expense') }] },
      { key: 'status', label: t('tx.status'), options: ['PAID', 'PENDING', 'UPCOMING'].map((v) => ({ v, l: statusLabel(v) })) },
      { key: 'category', label: t('tx.category'), options: (resp?.facets.categories ?? []).map((v) => ({ v, l: v })) },
      { key: 'paymentMethod', label: t('tx.paymentMethod'), options: METHODS.map((v) => ({ v, l: pm(v) })) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- label helpers only depend on the language
    [lang]
  );

  const renderForm = (v: Form, set: (k: keyof Form, value: string) => void, errors: Record<string, string>) => {
    const accounts = (pickers?.accounts ?? []).filter((a) => a.currency === v.currency);
    return (
      <>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Field label={t('tx.type')} error={errors.type} required>
            {(id, bad) => (
              <SelectInput id={id} invalid={bad} value={v.type} onChange={(e) => set('type', e.target.value)}>
                <option value="EXPENSE">{t('tx.expense')}</option>
                <option value="INCOME">{t('tx.income')}</option>
              </SelectInput>
            )}
          </Field>
          <Field label={t('tx.status')} error={errors.status} required>
            {(id, bad) => (
              <SelectInput id={id} invalid={bad} value={v.status} onChange={(e) => set('status', e.target.value)}>
                {['PAID', 'PENDING', 'UPCOMING'].map((s) => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </SelectInput>
            )}
          </Field>
        </div>
        <Field label={t('tx.description')} error={errors.description} required>
          {(id, bad) => <TextInput id={id} invalid={bad} value={v.description} maxLength={200} onChange={(e) => set('description', e.target.value)} />}
        </Field>
        <Field label={`${t('tx.descriptionAr')} (${t('fld.optional')})`} error={errors.descriptionAr}>
          {(id, bad) => <TextInput id={id} invalid={bad} dir="rtl" value={v.descriptionAr} maxLength={200} onChange={(e) => set('descriptionAr', e.target.value)} />}
        </Field>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Field label={t('col.amount')} error={errors.amount} required>
            {(id, bad) => <TextInput id={id} invalid={bad} inputMode="decimal" dir="ltr" value={v.amount} onChange={(e) => set('amount', e.target.value)} />}
          </Field>
          <Field label={t('col.currency')} error={errors.currency} required>
            {(id, bad) => (
              <SelectInput id={id} invalid={bad} value={v.currency} onChange={(e) => { set('currency', e.target.value); set('accountId', ''); }}>
                <option value="LYD">LYD</option>
                <option value="USD">USD</option>
              </SelectInput>
            )}
          </Field>
          <Field label={t('tx.category')} error={errors.category} required>
            {(id, bad) => <TextInput id={id} invalid={bad} value={v.category} maxLength={80} onChange={(e) => set('category', e.target.value)} />}
          </Field>
          <Field label={t('tx.date')} error={errors.transactionDate} required>
            {(id, bad) => <TextInput id={id} invalid={bad} type="date" dir="ltr" value={v.transactionDate} onChange={(e) => set('transactionDate', e.target.value)} />}
          </Field>
          <Field label={t('tx.paymentMethod')} error={errors.paymentMethod}>
            {(id, bad) => (
              <SelectInput id={id} invalid={bad} value={v.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>{pm(m)}</option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label={t('tx.platform')} error={errors.platformId}>
            {(id, bad) => (
              <SelectInput id={id} invalid={bad} value={v.platformId} onChange={(e) => set('platformId', e.target.value)}>
                <option value="">{t('tx.none')}</option>
                {(pickers?.platforms ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{PLATFORM_BY_CODE[p.code] ?? p.name}</option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label={t('tx.account')} error={errors.accountId}>
            {(id, bad) => (
              <SelectInput id={id} invalid={bad} value={v.accountId} onChange={(e) => set('accountId', e.target.value)}>
                <option value="">{t('tx.none')}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label={`${t('tx.reference')} (${t('fld.optional')})`} error={errors.reference}>
            {(id, bad) => <TextInput id={id} invalid={bad} dir="ltr" value={v.reference} maxLength={80} onChange={(e) => set('reference', e.target.value)} />}
          </Field>
        </div>
      </>
    );
  };

  const body = (v: Form) => ({
    type: v.type,
    status: v.status,
    description: v.description,
    descriptionAr: v.descriptionAr || null,
    amount: v.amount.trim(),
    currency: v.currency,
    category: v.category,
    transactionDate: v.transactionDate,
    paymentMethod: v.paymentMethod,
    platformId: v.platformId || null,
    accountId: v.accountId || null,
    reference: v.reference || null,
  });

  return (
    <>
      <Card flush>
        <ServerTable<Row, Resp>
          endpoint="/api/transactions"
          columns={columns}
          rowKey={(r) => r.id}
          filters={filters}
          defaultSort={{ key: 'date', dir: 'desc' }}
          pageSize={20}
          searchPlaceholder={t('f.search')}
          extraParams={extra}
          reloadKey={reload}
          exportFilename="a-group-transactions.csv"
          toolbarEnd={
            canWrite ? (
              <Button onClick={() => setCreating(true)}>
                + {t('tx.add')}
              </Button>
            ) : null
          }
        />
      </Card>

      <FormDialog<Form>
        open={creating || editing !== null}
        title={editing ? t('tx.edit') : t('tx.add')}
        submitLabel={editing ? t('act.save') : t('act.create')}
        initial={initial}
        wide
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onDone={() => setReload((n) => n + 1)}
        successText={editing ? t('tx.updated') : t('tx.created')}
        submit={(v) => (editing ? apiSend('PATCH', `/api/transactions/${editing.id}`, body(v)) : apiSend('POST', '/api/transactions', body(v)))}
      >
        {renderForm}
      </FormDialog>

      <ConfirmDialog
        open={deleting !== null}
        title={t('tx.delete')}
        body={`${deleting?.description ?? ''} — ${t('tx.deleteBody')}`}
        confirmLabel={t('act.delete')}
        danger
        onClose={() => setDeleting(null)}
        onConfirm={() => apiSend('DELETE', `/api/transactions/${deleting!.id}`)}
        successText={t('tx.deleted')}
        onDone={() => setReload((n) => n + 1)}
      />
    </>
  );
}
