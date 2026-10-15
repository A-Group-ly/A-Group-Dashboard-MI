'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { controlClass } from './primitives';

/* ------------------------------------------------------------------ calling the API */

export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  fields: Record<string, string>;
}

/** JSON request to an authenticated route. Never throws: network failures come back as status 0. */
export async function apiSend<T = unknown>(method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', url: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => null)) as (T & { error?: string; fields?: Record<string, string> }) | null;
    return { ok: res.ok, status: res.status, data: res.ok ? (json as T) : null, error: res.ok ? null : (json?.error ?? null), fields: (!res.ok && json?.fields) || {} };
  } catch {
    return { ok: false, status: 0, data: null, error: null, fields: {} };
  }
}

/** Human message for a failed result, in the current language. */
export function useErrorText() {
  const { t } = useApp();
  return useCallback(
    (r: ApiResult) => {
      if (r.status === 0) return t('err.network');
      if (r.status === 401) return t('err.unauthorized');
      if (r.status === 403) return t('err.forbidden');
      if (r.status === 404) return t('err.notFoundBody');
      if (r.status === 409 || r.status === 422) {
        // Prefer a translated reason when the server named one; otherwise the server's own sentence.
        return r.error ?? t('err.server');
      }
      return t('err.server');
    },
    [t]
  );
}

/* ------------------------------------------------------------------ dialog */

export function Modal({
  open,
  title,
  onClose,
  children,
  busy = false,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  busy?: boolean;
  wide?: boolean;
}) {
  const { t } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = Array.from(ref.current.querySelectorAll<HTMLElement>('input, select, textarea, button, a[href]')).filter((x) => !x.hasAttribute('disabled'));
        if (f.length === 0) return;
        const a = f[0];
        const z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      returnTo.current?.focus();
    };
  }, [open, busy, onClose]);

  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[92vh] w-full flex-col border border-line-strong bg-surface shadow-xl sm:max-h-[88vh] ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 id={titleId} className="font-head text-base font-bold text-ink">{title}</h2>
          <button type="button" data-close onClick={onClose} disabled={busy} aria-label={t('act.close')} className="h-8 w-8 border border-line-strong text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ fields */

const inputClass = `${controlClass} w-full !py-2 text-sm`;

export function Field({ label, error, hint, required, children }: { label: string; error?: string; hint?: string; required?: boolean; children: (id: string, invalid: boolean) => React.ReactNode }) {
  const { t } = useApp();
  const id = useId();
  const msg = error ? (t(`fld.${error}`) !== `fld.${error}` ? t(`fld.${error}`) : error) : undefined;
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink-2">
        {label}
        {required && <span className="text-bad-ink"> *</span>}
      </label>
      {children(id, Boolean(error))}
      {hint && !error && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
      {msg && (
        <p role="alert" className="mt-1 text-[11px] font-semibold text-bad-ink">
          {msg}
        </p>
      )}
    </div>
  );
}

export function TextInput({ id, invalid, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input id={id} aria-invalid={invalid} {...rest} className={`${inputClass} ${invalid ? '!border-bad-ink' : ''} ${rest.className ?? ''}`} />;
}

export function SelectInput({ id, invalid, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select id={id} aria-invalid={invalid} {...rest} className={`${inputClass} ${invalid ? '!border-bad-ink' : ''}`}>
      {children}
    </select>
  );
}

export function TextArea({ id, invalid, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea id={id} aria-invalid={invalid} rows={3} {...rest} className={`${inputClass} ${invalid ? '!border-bad-ink' : ''}`} />;
}

/* ------------------------------------------------------------------ buttons */

const btn = 'inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50';
export const buttonPrimary = `${btn} border border-ink bg-ink text-ink-contrast hover:opacity-85`;
export const buttonSecondary = `${btn} border border-line-strong bg-surface text-ink hover:bg-surface-2`;
export const buttonDanger = `${btn} border border-bad-ink bg-surface text-bad-ink hover:bg-bad-soft`;

export function Button({ variant = 'primary', busy, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger'; busy?: boolean }) {
  const cls = variant === 'primary' ? buttonPrimary : variant === 'danger' ? buttonDanger : buttonSecondary;
  return (
    <button type="button" {...rest} disabled={rest.disabled || busy} className={`${cls} ${rest.className ?? ''}`}>
      {busy && <span aria-hidden="true" className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ form dialog wrapper */

/**
 * A modal with a form: validates on the server, shows field errors inline, toasts success, and calls `onDone`
 * so the caller can reload its data. The dialog stays open on failure so nothing typed is lost.
 */
export function FormDialog<V extends Record<string, string>>({
  open,
  title,
  submitLabel,
  initial,
  onClose,
  onDone,
  submit,
  successText,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  initial: V;
  onClose: () => void;
  onDone: (data: unknown) => void;
  submit: (values: V) => Promise<ApiResult>;
  successText: string;
  children: (v: V, set: (k: keyof V, value: string) => void, errors: Record<string, string>) => React.ReactNode;
  wide?: boolean;
}) {
  const { t } = useApp();
  const toast = useToast();
  const errorText = useErrorText();
  const [values, setValues] = useState<V>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setValues(initial);
      setErrors({});
      setFormError(null);
    }
    wasOpen.current = open;
  }, [open, initial]);

  const set = (k: keyof V, value: string) => {
    setValues((v) => ({ ...v, [k]: value }));
    setErrors((e) => {
      if (!(k as string in e)) return e;
      const next = { ...e };
      delete next[k as string];
      return next;
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFormError(null);
    const res = await submit(values);
    setBusy(false);
    if (res.ok) {
      toast.success(successText);
      onDone(res.data);
      onClose();
    } else {
      setErrors(res.fields);
      setFormError(Object.keys(res.fields).length && res.status === 422 ? t('fld.fixErrors') : errorText(res));
    }
  };

  return (
    <Modal open={open} title={title} onClose={onClose} busy={busy} wide={wide}>
      <form onSubmit={onSubmit} noValidate>
        {children(values, set, errors)}
        {formError && (
          <p role="alert" className="mb-4 border border-bad-ink bg-bad-soft px-3 py-2 text-xs font-semibold text-bad-ink">
            {formError}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('act.cancel')}
          </Button>
          <button type="submit" disabled={busy} className={buttonPrimary}>
            {busy && <span aria-hidden="true" className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Confirmation dialog for destructive or irreversible actions. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger,
  onClose,
  onConfirm,
  successText,
  onDone,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<ApiResult>;
  successText: string;
  onDone: () => void;
}) {
  const { t } = useApp();
  const toast = useToast();
  const errorText = useErrorText();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear a previous error whenever the dialog reopens
    if (open) setError(null);
  }, [open]);

  const go = async () => {
    setBusy(true);
    setError(null);
    const res = await onConfirm();
    setBusy(false);
    if (res.ok) {
      toast.success(successText);
      onDone();
      onClose();
    } else setError(errorText(res));
  };

  return (
    <Modal open={open} title={title} onClose={onClose} busy={busy}>
      <p className="mb-4 text-sm text-ink-2">{body}</p>
      {error && (
        <p role="alert" className="mb-4 border border-bad-ink bg-bad-soft px-3 py-2 text-xs font-semibold text-bad-ink">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          {t('act.cancel')}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={go} busy={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
