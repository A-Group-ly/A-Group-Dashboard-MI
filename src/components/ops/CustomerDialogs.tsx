'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { ConfirmDialog, Field, FormDialog, SelectInput, TextArea, TextInput, apiSend } from '@/components/ui/forms';
import SearchBox from '@/components/ui/SearchBox';
import { Highlight } from '@/components/ui/Highlight';
import { fetchRetry } from '@/lib/fetchRetry';

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
  const listId = useId();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<CustomerLite[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const c = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show the spinner for the request that starts now
    setLoading(true);
    const timer = window.setTimeout(() => {
      const qs = new URLSearchParams({ pageSize: '8', status: 'active', sort: 'name', ...(q.trim() ? { q: q.trim() } : {}) });
      fetchRetry(`/api/customers?${qs}`, { signal: c.signal, cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) {
            setRows((d as { data: CustomerLite[] }).data);
            setActive(0);
          }
          setLoading(false);
        })
        .catch((e: { name?: string }) => {
          if (e?.name !== 'AbortError') setLoading(false);
        });
    }, q.trim() ? 220 : 0);
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

  const pick = (c: CustomerLite) => {
    onPick(c);
    setOpen(false);
    setQ('');
  };

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 border border-line-strong bg-surface-2 px-3 py-2 text-sm">
        <span className="min-w-0 break-words font-semibold text-ink">{value.displayName}</span>
        <button type="button" onClick={() => onPick(null)} className="shrink-0 text-xs font-semibold text-accent-strong hover:underline">{t('act.change')}</button>
      </div>
    );
  }

  const list = rows ?? [];
  return (
    <div ref={box} className="relative">
      <SearchBox
        value={q}
        onChange={(v) => {
          setQ(v);
          setOpen(true);
        }}
        busy={loading}
        placeholder={t('cust.searchPh')}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && list[active] ? `${listId}-${active}` : undefined}
        aria-invalid={Boolean(error)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) setOpen(true);
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(list.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === 'Enter' && open && list[active]) {
            e.preventDefault();
            pick(list[active]);
          } else if (e.key === 'Escape' && open && !q) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }
        }}
        className={error ? '[&_input]:!border-bad-ink' : ''}
      />
      {open && (
        <ul id={listId} role="listbox" aria-label={t('sub.customer')} className="absolute z-10 mt-1 max-h-64 w-full overflow-auto border border-line-strong bg-surface shadow-lg">
          {!q.trim() && list.length > 0 && <li role="presentation" className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{t('pick.suggested')}</li>}
          {rows !== null && list.length === 0 && !loading && (
            <li role="presentation" className="px-3 py-3 text-xs text-muted">
              {q.trim() ? `${t('pick.noMatch')} “${q.trim()}”` : t('f.noResults')}
            </li>
          )}
          {rows === null && <li role="presentation" className="px-3 py-3 text-xs text-muted">…</li>}
          {list.map((c, i) => (
            <li key={c.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(c)}
                className={`block w-full px-3 py-2 text-start text-sm transition-colors ${i === active ? 'bg-accent-soft' : 'hover:bg-surface-2'}`}
              >
                <span className="block font-semibold text-ink" dir="auto"><Highlight text={c.displayName} query={q} /></span>
                <span dir="ltr" className="block text-[11px] text-muted"><Highlight text={c.email} query={q} /></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
