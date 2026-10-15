'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button, Field, Modal, SelectInput, TextInput, apiSend } from '@/components/ui/forms';
import { formatCurrency } from '@/lib/calculations';

export interface BulkInvoice {
  id: string;
  number: string;
  total: number;
  currency: string;
  status: string;
}

type Action = 'pay' | 'remind' | 'void';
const CHUNK = 5; // small requests keep the free Worker's CPU budget safe and give visible progress

const today = () => new Date().toISOString().slice(0, 10);

/** Actions for the invoices selected in the table. Each action applies only to the invoices it makes sense for. */
export default function BulkInvoiceBar({ rows, canPay, canWrite, onDone, clear }: { rows: BulkInvoice[]; canPay: boolean; canWrite: boolean; onDone: () => void; clear: () => void }) {
  const { t } = useApp();
  const toast = useToast();
  const [action, setAction] = useState<Action | null>(null);
  const [method, setMethod] = useState('bank_transfer');
  const [date, setDate] = useState(today());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const open = (r: BulkInvoice) => r.status === 'issued' || r.status === 'overdue';
  const eligible = useMemo(
    () => ({
      pay: rows.filter(open),
      remind: rows.filter((r) => r.status === 'overdue'),
      void: rows.filter(open),
    }),
    [rows]
  );
  const targets = useMemo(() => (action ? eligible[action] : []), [action, eligible]);
  const totals = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of targets) m.set(r.currency, (m.get(r.currency) ?? 0) + r.total);
    return [...m.entries()];
  }, [targets]);

  const close = () => {
    if (progress) return; // never close in the middle of a run
    setAction(null);
    setErrors([]);
  };

  const run = async () => {
    if (!action || targets.length === 0) return;
    setErrors([]);
    setProgress({ done: 0, total: targets.length });
    let ok = 0;
    const errs: string[] = [];
    for (let i = 0; i < targets.length; i += CHUNK) {
      const chunk = targets.slice(i, i + CHUNK);
      const res = await apiSend<{ results: { id: string; ok: boolean; error?: string }[] }>('POST', '/api/invoices/bulk', { action, ids: chunk.map((c) => c.id), method, date });
      if (res.ok && res.data) {
        for (const r of res.data.results) {
          if (r.ok) ok++;
          else errs.push(`${chunk.find((c) => c.id === r.id)?.number ?? r.id}: ${r.error ?? t('err.server')}`);
        }
      } else {
        for (const c of chunk) errs.push(`${c.number}: ${res.error ?? t('err.server')}`);
        if (res.status === 401 || res.status === 403 || res.status === 0) break; // nothing more will succeed
      }
      setProgress({ done: Math.min(i + CHUNK, targets.length), total: targets.length });
    }
    setProgress(null);
    onDone();
    if (errs.length === 0) {
      toast.success(`${t('bulk.done')}: ${ok}`);
      setAction(null);
      clear();
    } else {
      setErrors(errs.slice(0, 6));
      toast.error(`${t('bulk.partial')}: ${ok} ✓ · ${errs.length} ✕`);
    }
  };

  const title = action === 'pay' ? t('bulk.payTitle') : action === 'remind' ? t('bulk.remindTitle') : t('bulk.voidTitle');
  return (
    <>
      {canPay && (
        <Button disabled={eligible.pay.length === 0} onClick={() => setAction('pay')}>
          {t('inv.recordPayment')} ({eligible.pay.length})
        </Button>
      )}
      {canWrite && (
        <Button variant="secondary" disabled={eligible.remind.length === 0} onClick={() => setAction('remind')}>
          {t('inv.remind')} ({eligible.remind.length})
        </Button>
      )}
      {canWrite && (
        <Button variant="danger" disabled={eligible.void.length === 0} onClick={() => setAction('void')}>
          {t('inv.void')} ({eligible.void.length})
        </Button>
      )}

      <Modal open={action !== null} title={title} onClose={close} busy={progress !== null}>
        <p className="mb-3 text-sm text-ink-2">
          <span dir="ltr" className="font-bold tabular-nums">{targets.length}</span> {t('bulk.invoices')}
          {rows.length > targets.length && <span className="text-muted"> · {rows.length - targets.length} {t('bulk.skipped')}</span>}
        </p>
        {action !== 'remind' && totals.length > 0 && (
          <ul className="mb-4 border border-line bg-surface-2 px-3 py-2 text-sm">
            {totals.map(([cur, sum]) => (
              <li key={cur} dir="ltr" className="flex justify-between gap-4 py-0.5">
                <span className="text-muted">{cur}</span>
                <span className="font-bold tabular-nums">{formatCurrency(sum, cur as 'LYD' | 'USD')}</span>
              </li>
            ))}
          </ul>
        )}
        {action === 'pay' && (
          <>
            <p className="mb-3 text-xs text-muted">{t('inv.paymentNote')}</p>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <Field label={t('inv.paymentMethod')} required>
                {(id) => (
                  <SelectInput id={id} value={method} onChange={(e) => setMethod(e.target.value)}>
                    {['bank_transfer', 'card', 'cash', 'wallet'].map((m) => (
                      <option key={m} value={m}>{t(`pm.${m}`)}</option>
                    ))}
                  </SelectInput>
                )}
              </Field>
              <Field label={t('inv.paymentDate')}>{(id) => <TextInput id={id} type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
            </div>
          </>
        )}
        {action === 'remind' && <p className="mb-3 text-xs text-muted">{t('bulk.remindNote')}</p>}
        {action === 'void' && <p className="mb-3 text-xs text-muted">{t('inv.voidBody')}</p>}

        {progress && (
          <div className="mb-4" role="status" aria-live="polite">
            <div className="h-2 w-full bg-surface-2">
              <div className="h-full bg-accent transition-all duration-200" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <div dir="ltr" className="mt-1 text-xs tabular-nums text-muted">{progress.done} / {progress.total}</div>
          </div>
        )}
        {errors.length > 0 && (
          <ul role="alert" className="mb-4 space-y-1 border border-bad-ink bg-bad-soft px-3 py-2 text-xs text-bad-ink">
            {errors.map((e) => (
              <li key={e} dir="auto">{e}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={close} disabled={progress !== null}>{t('act.cancel')}</Button>
          <Button variant={action === 'void' ? 'danger' : 'primary'} onClick={run} busy={progress !== null} disabled={targets.length === 0}>
            {title}
          </Button>
        </div>
      </Modal>
    </>
  );
}
