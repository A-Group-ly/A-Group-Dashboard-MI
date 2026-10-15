'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { ConfirmDialog, Field, FormDialog, SelectInput, TextInput, apiSend } from '@/components/ui/forms';
import { Money } from '@/components/ui/primitives';
import { CustomerPicker, type CustomerLite } from './CustomerDialogs';

const today = () => new Date().toISOString().slice(0, 10);

export interface CatalogProduct {
  id: string;
  name: string;
  plans: { id: string; name: string; interval: string; price: number; currency: string; trialDays: number; status: string }[];
}

/** Products + plans for pickers (small, constant-size response). */
export function useCatalog(enabled: boolean) {
  const [data, setData] = useState<CatalogProduct[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const c = new AbortController();
    fetch('/api/catalog', { signal: c.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData((d as { data: CatalogProduct[] }).data))
      .catch(() => {});
    return () => c.abort();
  }, [enabled]);
  return data;
}

/* ------------------------------------------------------------------ subscriptions */

export function NewSubscriptionDialog({
  open,
  customer,
  onClose,
  onDone,
}: {
  open: boolean;
  customer?: CustomerLite | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useApp();
  const catalog = useCatalog(open);
  const [picked, setPicked] = useState<CustomerLite | null>(customer ?? null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the picked customer whenever the dialog opens
    if (open) setPicked(customer ?? null);
  }, [open, customer]);
  const initial = useMemo(() => ({ planId: '', units: '1', startDate: today() }), []);
  const plans = (catalog ?? []).flatMap((p) => p.plans.filter((x) => x.status === 'active').map((x) => ({ ...x, product: p.name })));

  return (
    <FormDialog
      open={open}
      title={t('sub.add')}
      submitLabel={t('act.create')}
      initial={initial}
      onClose={onClose}
      onDone={() => onDone()}
      successText={t('sub.created')}
      submit={(v) => apiSend('POST', '/api/subscriptions', { customerId: picked?.id ?? '', planId: v.planId, units: Number(v.units), startDate: v.startDate })}
    >
      {(v, set, errors) => {
        const plan = plans.find((p) => p.id === v.planId);
        const units = Number(v.units) || 1;
        return (
          <>
            <Field label={t('sub.customer')} error={errors.customerId} required>{() => <CustomerPicker value={picked} onPick={setPicked} error={errors.customerId} />}</Field>
            <Field label={t('sub.plan')} error={errors.planId} required>
              {(id, bad) => (
                <SelectInput id={id} invalid={bad} value={v.planId} onChange={(e) => set('planId', e.target.value)}>
                  <option value="">{t('sub.pickPlan')}</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{`${p.product} · ${p.name} · ${p.price} ${p.currency} / ${t(`iv.${p.interval}`)}`}</option>
                  ))}
                </SelectInput>
              )}
            </Field>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <Field label={t('sub.units')} error={errors.units} hint={t('sub.unitsHint')}>
                {(id, bad) => <TextInput id={id} invalid={bad} type="number" min={1} max={1000} dir="ltr" value={v.units} onChange={(e) => set('units', e.target.value)} />}
              </Field>
              <Field label={t('sub.startDate')} error={errors.startDate}>
                {(id, bad) => <TextInput id={id} invalid={bad} type="date" dir="ltr" value={v.startDate} onChange={(e) => set('startDate', e.target.value)} />}
              </Field>
            </div>
            {plan && (
              <p className="mb-4 border border-line bg-surface-2 px-3 py-2 text-xs text-ink-2">
                {t('sub.priceNow')}: <Money value={Math.round(plan.price * units * 100) / 100} currency={plan.currency} className="font-bold text-ink" />
              </p>
            )}
          </>
        );
      }}
    </FormDialog>
  );
}

export type SubAction = 'pause' | 'resume' | 'cancel';

export function SubscriptionActionDialog({ open, action, subscriptionId, name, onClose, onDone }: { open: boolean; action: SubAction; subscriptionId: string; name: string; onClose: () => void; onDone: () => void }) {
  const { t } = useApp();
  const [date, setDate] = useState(today());
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- default the date to today whenever the dialog opens
    if (open) setDate(today());
  }, [open]);
  const labels = { pause: [t('sub.pause'), t('sub.paused')], resume: [t('sub.resume'), t('sub.resumed')], cancel: [t('sub.cancel'), t('sub.canceledMsg')] } as const;
  return (
    <ConfirmDialog
      open={open}
      title={`${labels[action][0]} — ${name}`}
      body={action === 'cancel' ? t('sub.cancelBody') : subscriptionId}
      confirmLabel={labels[action][0]}
      danger={action === 'cancel'}
      onClose={onClose}
      onConfirm={() => apiSend('PATCH', `/api/subscriptions/${subscriptionId}`, { action, date })}
      successText={labels[action][1]}
      onDone={onDone}
    />
  );
}

/* ------------------------------------------------------------------ invoices */

export interface InvoiceLite {
  id: string;
  number: string;
  total: number;
  currency: string;
  customerName?: string;
}

export function NewInvoiceDialog({
  open,
  customer,
  subscription,
  onClose,
  onDone,
}: {
  open: boolean;
  customer?: CustomerLite | null;
  subscription?: { id: string; label: string; price: number; currency: string } | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useApp();
  const [picked, setPicked] = useState<CustomerLite | null>(customer ?? null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the picked customer whenever the dialog opens
    if (open) setPicked(customer ?? null);
  }, [open, customer]);
  const initial = useMemo(() => ({ amount: subscription ? String(subscription.price) : '', currency: subscription?.currency ?? 'LYD', issueDate: today(), dueDate: '', note: '' }), [subscription]);

  return (
    <FormDialog
      open={open}
      title={t('inv.add')}
      submitLabel={t('act.create')}
      initial={initial}
      onClose={onClose}
      onDone={() => onDone()}
      successText={t('inv.created')}
      submit={(v) =>
        apiSend('POST', '/api/invoices', {
          ...(subscription ? { subscriptionId: subscription.id } : { customerId: picked?.id ?? '', currency: v.currency }),
          amount: v.amount.trim() || undefined,
          issueDate: v.issueDate,
          dueDate: v.dueDate || undefined,
          note: v.note || undefined,
        })
      }
    >
      {(v, set, errors) => (
        <>
          {subscription ? (
            <p className="mb-4 border border-line bg-surface-2 px-3 py-2 text-xs text-ink-2">{subscription.label}</p>
          ) : (
            <Field label={t('inv.customer')} error={errors.customerId ?? errors.subscriptionId} required>{() => <CustomerPicker value={picked} onPick={setPicked} error={errors.customerId} />}</Field>
          )}
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Field label={t('inv.amount')} error={errors.amount} required={!subscription}>
              {(id, bad) => <TextInput id={id} invalid={bad} inputMode="decimal" dir="ltr" value={v.amount} onChange={(e) => set('amount', e.target.value)} />}
            </Field>
            {!subscription && (
              <Field label={t('col.currency')} error={errors.currency} required>
                {(id, bad) => (
                  <SelectInput id={id} invalid={bad} value={v.currency} onChange={(e) => set('currency', e.target.value)}>
                    <option value="LYD">LYD</option>
                    <option value="USD">USD</option>
                  </SelectInput>
                )}
              </Field>
            )}
            <Field label={t('inv.issueDate')} error={errors.issueDate}>
              {(id, bad) => <TextInput id={id} invalid={bad} type="date" dir="ltr" value={v.issueDate} onChange={(e) => set('issueDate', e.target.value)} />}
            </Field>
            <Field label={`${t('inv.dueDate')} (${t('fld.optional')})`} error={errors.dueDate}>
              {(id, bad) => <TextInput id={id} invalid={bad} type="date" dir="ltr" value={v.dueDate} onChange={(e) => set('dueDate', e.target.value)} />}
            </Field>
          </div>
          <Field label={`${t('inv.note')} (${t('fld.optional')})`} error={errors.note}>
            {(id, bad) => <TextInput id={id} invalid={bad} maxLength={300} value={v.note} onChange={(e) => set('note', e.target.value)} />}
          </Field>
        </>
      )}
    </FormDialog>
  );
}

export function RecordPaymentDialog({ open, invoice, onClose, onDone }: { open: boolean; invoice: InvoiceLite | null; onClose: () => void; onDone: () => void }) {
  const { t } = useApp();
  const initial = useMemo(() => ({ method: 'bank_transfer', date: today() }), []);
  return (
    <FormDialog
      open={open && invoice !== null}
      title={`${t('inv.recordPayment')} — ${invoice?.number ?? ''}`}
      submitLabel={t('inv.recordPayment')}
      initial={initial}
      onClose={onClose}
      onDone={() => onDone()}
      successText={t('inv.paymentRecorded')}
      submit={(v) => apiSend('POST', `/api/invoices/${invoice!.id}/payments`, { method: v.method, date: v.date })}
    >
      {(v, set, errors) => (
        <>
          <p className="mb-4 border border-line bg-surface-2 px-3 py-2 text-sm">
            {invoice?.customerName && <span className="me-2 font-semibold text-ink">{invoice.customerName}</span>}
            {invoice && <Money value={invoice.total} currency={invoice.currency} className="font-bold text-ink" />}
          </p>
          <p className="mb-4 text-xs text-muted">{t('inv.paymentNote')}</p>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Field label={t('inv.paymentMethod')} error={errors.method} required>
              {(id, bad) => (
                <SelectInput id={id} invalid={bad} value={v.method} onChange={(e) => set('method', e.target.value)}>
                  {['bank_transfer', 'card', 'cash', 'wallet'].map((m) => (
                    <option key={m} value={m}>{t(`pm.${m}`)}</option>
                  ))}
                </SelectInput>
              )}
            </Field>
            <Field label={t('inv.paymentDate')} error={errors.date}>
              {(id, bad) => <TextInput id={id} invalid={bad} type="date" dir="ltr" value={v.date} onChange={(e) => set('date', e.target.value)} />}
            </Field>
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function VoidInvoiceDialog({ open, invoice, onClose, onDone }: { open: boolean; invoice: InvoiceLite | null; onClose: () => void; onDone: () => void }) {
  const { t } = useApp();
  return (
    <ConfirmDialog
      open={open && invoice !== null}
      title={`${t('inv.void')} — ${invoice?.number ?? ''}`}
      body={t('inv.voidBody')}
      confirmLabel={t('inv.void')}
      danger
      onClose={onClose}
      onConfirm={() => apiSend('PATCH', `/api/invoices/${invoice!.id}`, { action: 'void' })}
      successText={t('inv.voided')}
      onDone={onDone}
    />
  );
}

/* ------------------------------------------------------------------ catalog + budgets */

export function PlanDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { t } = useApp();
  const catalog = useCatalog(open);
  const initial = useMemo(() => ({ productId: '', productName: '', category: '', name: '', interval: 'MONTHLY', price: '', currency: 'LYD', trialDays: '0' }), []);
  return (
    <FormDialog
      open={open}
      title={t('plan.add')}
      submitLabel={t('act.create')}
      initial={initial}
      onClose={onClose}
      onDone={() => onDone()}
      successText={t('plan.created')}
      wide
      submit={(v) =>
        apiSend('POST', '/api/catalog', {
          ...(v.productId ? { productId: v.productId } : { productName: v.productName, category: v.category || undefined }),
          name: v.name,
          interval: v.interval,
          price: v.price.trim(),
          currency: v.currency,
          trialDays: Number(v.trialDays) || 0,
        })
      }
    >
      {(v, set, errors) => (
        <>
          <Field label={t('plan.product')} error={errors.productId}>
            {(id, bad) => (
              <SelectInput id={id} invalid={bad} value={v.productId} onChange={(e) => set('productId', e.target.value)}>
                <option value="">{t('plan.newProduct')}</option>
                {(catalog ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </SelectInput>
            )}
          </Field>
          {!v.productId && (
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <Field label={t('plan.productName')} error={errors.productName} required>
                {(id, bad) => <TextInput id={id} invalid={bad} maxLength={120} value={v.productName} onChange={(e) => set('productName', e.target.value)} />}
              </Field>
              <Field label={`${t('plan.category')} (${t('fld.optional')})`} error={errors.category}>
                {(id, bad) => <TextInput id={id} invalid={bad} maxLength={80} value={v.category} onChange={(e) => set('category', e.target.value)} />}
              </Field>
            </div>
          )}
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Field label={t('plan.name')} error={errors.name} required>
              {(id, bad) => <TextInput id={id} invalid={bad} maxLength={80} value={v.name} onChange={(e) => set('name', e.target.value)} />}
            </Field>
            <Field label={t('plan.interval')} error={errors.interval} required>
              {(id, bad) => (
                <SelectInput id={id} invalid={bad} value={v.interval} onChange={(e) => set('interval', e.target.value)}>
                  {['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'].map((x) => (
                    <option key={x} value={x}>{t(`iv.${x.toLowerCase()}`)}</option>
                  ))}
                </SelectInput>
              )}
            </Field>
            <Field label={t('plan.price')} error={errors.price} required>
              {(id, bad) => <TextInput id={id} invalid={bad} inputMode="decimal" dir="ltr" value={v.price} onChange={(e) => set('price', e.target.value)} />}
            </Field>
            <Field label={t('col.currency')} error={errors.currency} required>
              {(id, bad) => (
                <SelectInput id={id} invalid={bad} value={v.currency} onChange={(e) => set('currency', e.target.value)}>
                  <option value="LYD">LYD</option>
                  <option value="USD">USD</option>
                </SelectInput>
              )}
            </Field>
            <Field label={`${t('plan.trial')} (${t('fld.optional')})`} error={errors.trialDays}>
              {(id, bad) => <TextInput id={id} invalid={bad} type="number" min={0} max={90} dir="ltr" value={v.trialDays} onChange={(e) => set('trialDays', e.target.value)} />}
            </Field>
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function BudgetDialog({ open, onClose, onDone, preset }: { open: boolean; onClose: () => void; onDone: () => void; preset?: { month: string; currency: string; amount: number } | null }) {
  const { t } = useApp();
  const initial = useMemo(() => ({ month: preset?.month ?? today().slice(0, 7), currency: preset?.currency ?? 'LYD', amount: preset ? String(preset.amount) : '' }), [preset]);
  return (
    <FormDialog
      open={open}
      title={t('bud.set')}
      submitLabel={t('act.save')}
      initial={initial}
      onClose={onClose}
      onDone={() => onDone()}
      successText={t('bud.saved')}
      submit={(v) => apiSend('PUT', '/api/budgets', { month: v.month, currency: v.currency, amount: v.amount.trim() })}
    >
      {(v, set, errors) => (
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Field label={t('bud.month')} error={errors.month} required>
            {(id, bad) => <TextInput id={id} invalid={bad} type="month" dir="ltr" value={v.month} onChange={(e) => set('month', e.target.value)} />}
          </Field>
          <Field label={t('col.currency')} error={errors.currency} required>
            {(id, bad) => (
              <SelectInput id={id} invalid={bad} value={v.currency} onChange={(e) => set('currency', e.target.value)}>
                <option value="LYD">LYD</option>
                <option value="USD">USD</option>
              </SelectInput>
            )}
          </Field>
          <div className="sm:col-span-2">
            <Field label={t('bud.amount')} error={errors.amount} required>
              {(id, bad) => <TextInput id={id} invalid={bad} inputMode="decimal" dir="ltr" value={v.amount} onChange={(e) => set('amount', e.target.value)} />}
            </Field>
          </div>
        </div>
      )}
    </FormDialog>
  );
}
