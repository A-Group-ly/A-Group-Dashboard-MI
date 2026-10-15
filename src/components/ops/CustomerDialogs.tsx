'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { ConfirmDialog, Field, FormDialog, SelectInput, TextArea, TextInput, apiSend } from '@/components/ui/forms';
import { controlClass } from '@/components/ui/primitives';

export interface CustomerLite {
  id: string;
  displayName: string;
  email?: string;
  type?: string;
  businessName?: string | null;
  phone?: string | null;
  city?: string;
  country?: string;
  notes?: string | null;
  status?: string;
}

const TYPES = ['individual', 'small_business', 'medium_business', 'enterprise', 'public_sector'];

const blank = { type: 'individual', displayName: '', businessName: '', email: '', phone: '', city: '', country: 'Libya', notes: '' };
type Form = typeof blank;

/** Create or edit a customer. The server validates and returns field-level errors. */
export function CustomerDialog({ open, customer, onClose, onDone }: { open: boolean; customer?: CustomerLite | null; onClose: () => void; onDone: (data: unknown) => void }) {
  const { t } = useApp();
  const initial = useMemo<Form>(
    () =>
      customer
        ? {
            type: customer.type ?? 'individual',
            displayName: customer.displayName,
            businessName: customer.businessName ?? '',
            email: customer.email ?? '',
            phone: customer.phone ?? '',
            city: customer.city ?? '',
            country: customer.country || 'Libya',
            notes: customer.notes ?? '',
          }
        : blank,
    [customer]
  );
  const body = (v: Form) => ({
    type: v.type.toUpperCase(),
    displayName: v.displayName,
    businessName: v.businessName || null,
    email: v.email,
    phone: v.phone || null,
    city: v.city || null,
    country: v.country || null,
    notes: v.notes || null,
  });

  return (
    <FormDialog<Form>
      open={open}
      title={customer ? t('cust.edit') : t('cust.add')}
      submitLabel={customer ? t('act.save') : t('act.create')}
      initial={initial}
      onClose={onClose}
      onDone={onDone}
      successText={customer ? t('cust.updated') : t('cust.created')}
      submit={(v) => (customer ? apiSend('PATCH', `/api/customers/${customer.id}`, body(v)) : apiSend('POST', '/api/customers', body(v)))}
      wide
    >
      {(v, set, errors) => (
        <>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Field label={t('fld.type')} error={errors.type} required>
              {(id, bad) => (
                <SelectInput id={id} invalid={bad} value={v.type} onChange={(e) => set('type', e.target.value)}>
                  {TYPES.map((x) => (
                    <option key={x} value={x}>{t(`type.${x}`)}</option>
                  ))}
                </SelectInput>
              )}
            </Field>
            <Field label={t('fld.displayName')} error={errors.displayName} required>
              {(id, bad) => <TextInput id={id} invalid={bad} value={v.displayName} maxLength={120} onChange={(e) => set('displayName', e.target.value)} />}
            </Field>
            <Field label={`${t('fld.businessName')} (${t('fld.optional')})`} error={errors.businessName}>
              {(id, bad) => <TextInput id={id} invalid={bad} value={v.businessName} maxLength={160} onChange={(e) => set('businessName', e.target.value)} />}
            </Field>
            <Field label={t('fld.email')} error={errors.email} required>
              {(id, bad) => <TextInput id={id} invalid={bad} type="email" dir="ltr" value={v.email} maxLength={160} onChange={(e) => set('email', e.target.value)} />}
            </Field>
            <Field label={`${t('fld.phone')} (${t('fld.optional')})`} error={errors.phone}>
              {(id, bad) => <TextInput id={id} invalid={bad} type="tel" dir="ltr" value={v.phone} maxLength={40} onChange={(e) => set('phone', e.target.value)} />}
            </Field>
            <Field label={`${t('fld.city')} (${t('fld.optional')})`} error={errors.city}>
              {(id, bad) => <TextInput id={id} invalid={bad} value={v.city} maxLength={80} onChange={(e) => set('city', e.target.value)} />}
            </Field>
          </div>
          <Field label={`${t('fld.notes')} (${t('fld.optional')})`} error={errors.notes}>
            {(id, bad) => <TextArea id={id} invalid={bad} dir="auto" value={v.notes} maxLength={1000} onChange={(e) => set('notes', e.target.value)} />}
          </Field>
        </>
      )}
    </FormDialog>
  );
}

/** Deactivate / reactivate with an explicit confirmation. */
export function CustomerStatusDialog({ open, customer, onClose, onDone }: { open: boolean; customer: CustomerLite | null; onClose: () => void; onDone: () => void }) {
  const { t } = useApp();
  const deactivating = customer?.status !== 'inactive';
  return (
    <ConfirmDialog
      open={open && customer !== null}
      title={`${deactivating ? t('cust.deactivate') : t('cust.reactivate')} — ${customer?.displayName ?? ''}`}
      body={deactivating ? t('cust.deactivateBody') : t('cust.reactivateBody')}
      confirmLabel={deactivating ? t('cust.deactivate') : t('cust.reactivate')}
      danger={deactivating}
      onClose={onClose}
      onConfirm={() => apiSend('PATCH', `/api/customers/${customer!.id}`, { status: deactivating ? 'INACTIVE' : 'ACTIVE' })}
      successText={deactivating ? t('cust.deactivated') : t('cust.reactivated')}
      onDone={onDone}
    />
  );
}

/** Type-ahead customer search backed by the paginated customers API (never loads the whole list). */
export function CustomerPicker({ value, onPick, error }: { value: CustomerLite | null; onPick: (c: CustomerLite | null) => void; error?: string }) {
  const { t } = useApp();
  const id = useId();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<CustomerLite[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const c = new AbortController();
    const timer = window.setTimeout(() => {
      const qs = new URLSearchParams({ pageSize: '8', status: 'active', sort: 'name', ...(q ? { q } : {}) });
      fetch(`/api/customers?${qs}`, { signal: c.signal, cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setRows((d as { data: CustomerLite[] }).data))
        .catch(() => {});
    }, 250);
    return () => {
      window.clearTimeout(timer);
      c.abort();
    };
  }, [q, open]);

  useEffect(() => {
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 border border-line-strong bg-surface-2 px-3 py-2 text-sm">
        <span className="min-w-0 break-words font-semibold text-ink">{value.displayName}</span>
        <button type="button" onClick={() => onPick(null)} className="shrink-0 text-xs font-semibold text-accent-strong hover:underline">{t('act.edit')}</button>
      </div>
    );
  }
  return (
    <div ref={box} className="relative">
      <input
        id={id}
        type="search"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        placeholder={t('cust.searchPh')}
        autoComplete="off"
        aria-invalid={Boolean(error)}
        className={`${controlClass} w-full !py-2 text-sm ${error ? '!border-bad-ink' : ''}`}
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto border border-line-strong bg-surface shadow-lg" role="listbox">
          {rows.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">{t('f.noResults')}</li>
          ) : (
            rows.map((c) => (
              <li key={c.id} role="option" aria-selected="false">
                <button
                  type="button"
                  onClick={() => {
                    onPick(c);
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-start text-sm transition-colors hover:bg-surface-2"
                >
                  <span className="block font-semibold text-ink">{c.displayName}</span>
                  <span dir="ltr" className="block text-[11px] text-muted">{c.email}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
