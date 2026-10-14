'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';

/* ---------- Page header ---------- */

export function PageHeader({
  title,
  subtitle,
  actions,
  crumbs,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  crumbs?: { href?: string; label: string }[];
}) {
  return (
    <div className="mb-6">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span aria-hidden="true">/</span>}
              {c.href ? (
                <Link href={c.href} className="hover:text-accent-strong">
                  {c.label}
                </Link>
              ) : (
                <span dir="auto">{c.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-0">
          <h1 className="font-head text-2xl font-bold text-ink">{title}</h1>
          {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted">{subtitle}</p>}
          {/* orange accent rule from the company guidelines */}
          <div className="mt-3 h-[3px] w-12 bg-accent" aria-hidden="true" />
        </div>
        {actions && <div className="ms-auto flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* ---------- Card ---------- */

export function Card({
  title,
  hint,
  actions,
  children,
  flush,
  className = '',
}: {
  title?: string;
  hint?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <section className={`mb-6 border border-line bg-surface ${className}`}>
      {title && (
        <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <h2 className="font-head text-sm font-bold text-ink">{title}</h2>
          {hint && <span className="text-xs text-muted">{hint}</span>}
          {actions && <div className="ms-auto flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

/* ---------- Badges ---------- */

export type BadgeTone = 'neutral' | 'ok' | 'warn' | 'bad' | 'accent' | 'ink';

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-ink-2 border-line',
  ink: 'bg-surface text-ink border-line-strong',
  ok: 'bg-ok-soft text-ok-ink border-transparent',
  warn: 'bg-warn-soft text-warn-ink border-transparent',
  bad: 'bg-bad-soft text-bad-ink border-transparent',
  accent: 'bg-accent-soft text-accent-strong border-transparent',
};

const DOT: Record<BadgeTone, string> = {
  neutral: 'bg-muted',
  ink: 'bg-ink',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  accent: 'bg-accent',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-0.5 text-[11px] font-semibold ${TONE[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} aria-hidden="true" />
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, BadgeTone> = {
  active: 'ok',
  trial: 'accent',
  past_due: 'warn',
  paused: 'ink',
  canceled: 'neutral',
  expired: 'neutral',
  paid: 'ok',
  issued: 'ink',
  overdue: 'warn',
  draft: 'neutral',
  void: 'neutral',
  succeeded: 'ok',
  failed: 'bad',
  pending: 'warn',
  inactive: 'neutral',
  internal: 'accent',
  external: 'ink',
};

/** Status text is always shown, never colour alone. */
export function StatusBadge({ status }: { status: string }) {
  const { t } = useApp();
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{t(`status.${status}`)}</Badge>;
}

/* ---------- States ---------- */

export function EmptyState({ title, body }: { title?: string; body?: string }) {
  const { t } = useApp();
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-head text-sm font-bold text-ink">{title ?? t('f.empty')}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted">{body ?? t('f.emptyHint')}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useApp();
  return (
    <div role="alert" className="border border-bad bg-bad-soft px-5 py-4 text-sm text-bad-ink">
      <p className="font-bold">{t('err.title')}</p>
      <p className="mt-1 text-xs">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 border border-bad-ink px-3 py-1 text-xs font-semibold hover:bg-bad hover:text-white"
        >
          {t('act.retry')}
        </button>
      )}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-live="polite">
      <div className="skeleton h-24" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
      <div className="skeleton h-64" />
    </div>
  );
}

export function DemoNotice({ text }: { text?: string }) {
  const { t } = useApp();
  return (
    <div role="note" className="mb-6 flex items-start gap-3 border border-warn bg-warn-soft px-4 py-3 text-xs text-warn-ink">
      <span className="font-bold uppercase tracking-wider">{t('shell.demoBadge')}</span>
      <span>{text ?? t('ops.demoNotice')}</span>
    </div>
  );
}

/* ---------- Money / dates ---------- */

export function Money({ value, currency, className = '' }: { value: number; currency: string; className?: string }) {
  const n = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  return (
    <span dir="ltr" className={`tabular-nums ${className}`}>
      {n} {currency}
    </span>
  );
}

export function DateText({ iso }: { iso: string | null | undefined }) {
  if (!iso) return <span>—</span>;
  return (
    <span dir="ltr" className="tabular-nums">
      {iso}
    </span>
  );
}

/* ---------- Form controls ---------- */

export const controlClass =
  'border border-line-strong bg-surface px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-none';

export function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={controlClass}>
      {children}
    </select>
  );
}
