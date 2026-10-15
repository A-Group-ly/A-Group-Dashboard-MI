'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { fetchRetry } from '@/lib/fetchRetry';
import { useRouter } from 'next/navigation';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { controlClass, EmptyState, ErrorState } from './primitives';

export interface SCol<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  /** Server sort key. Omit for columns that cannot be sorted. */
  sortKey?: string;
  align?: 'end';
}

export interface SFilter {
  key: string;
  label: string;
  options: { v: string; l: string }[];
}

interface Page<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface Props<T, R extends Page<T>> {
  endpoint: string;
  columns: SCol<T>[];
  rowKey: (row: T) => string;
  /** Static filters, or built from the first response (for example the list of cities). */
  filters?: SFilter[] | ((resp: R | null) => SFilter[]);
  defaultSort: { key: string; dir: 'asc' | 'desc' };
  pageSize?: number;
  searchPlaceholder?: string;
  /** Always-on query parameters (for example customerId). */
  extraParams?: Record<string, string>;
  /** Increment to force a reload (after creating or editing a record). */
  reloadKey?: number;
  emptyBody?: string;
  /** Show an "Export CSV" button that downloads exactly what the current search / filters select. */
  exportFilename?: string;
  /** Extra controls at the end of the toolbar (for example an "Add" button). */
  toolbarEnd?: React.ReactNode;
  /** Shown in the empty state when nothing exists yet (for example "Add your first customer"). */
  emptyAction?: React.ReactNode;
  /** Where a click on a row goes (links, buttons and copy targets inside the row keep their own behaviour). */
  rowHref?: (row: T) => string | null;
  /** Adds row checkboxes. The bar is shown while something is selected (selection is per page and clears when the data changes). */
  bulkActions?: (selected: T[], clear: () => void) => React.ReactNode;
}

/**
 * Table backed by a server-side search / filter / sort / pagination endpoint, so large lists (thousands of
 * rows) are never shipped to the browser. Keeps the previous rows visible while the next page loads.
 */
export default function ServerTable<T, R extends Page<T> = Page<T>>({
  endpoint,
  columns,
  rowKey,
  filters,
  defaultSort,
  pageSize: pageSizeProp = 25,
  searchPlaceholder,
  extraParams,
  reloadKey = 0,
  emptyBody,
  exportFilename,
  toolbarEnd,
  emptyAction,
  rowHref,
  bulkActions,
}: Props<T, R>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { t } = useApp();
  const { version } = useDashboardData();
  const { can } = useAccess();
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [active, setActive] = useState<Record<string, string>>({});
  const [sort, setSort] = useState(defaultSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeProp);
  const [resp, setResp] = useState<R | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [q]);

  const extraKey = JSON.stringify(extraParams ?? {});
  const activeKey = JSON.stringify(active);

  const exportCsv = async () => {
    if (!exportFilename || exporting) return;
    setExporting(true);
    try {
      const qs = new URLSearchParams({ sort: sort.key, dir: sort.dir, format: 'csv' });
      if (debouncedQ) qs.set('q', debouncedQ);
      for (const [k, v] of Object.entries(active)) if (v && v !== 'all') qs.set(k, v);
      for (const [k, v] of Object.entries(extraParams ?? {})) qs.set(k, v);
      const res = await fetch(`${endpoint}?${qs}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('export');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error(t('err.server'));
    } finally {
      setExporting(false);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort: sort.key, dir: sort.dir });
    if (debouncedQ) qs.set('q', debouncedQ);
    for (const [k, v] of Object.entries(JSON.parse(activeKey) as Record<string, string>)) if (v && v !== 'all') qs.set(k, v);
    for (const [k, v] of Object.entries(JSON.parse(extraKey) as Record<string, string>)) qs.set(k, v);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mark the request as loading
    setLoading(true);
    setSelected(new Set());
    fetchRetry(`${endpoint}?${qs}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw Object.assign(new Error('http'), { status: res.status });
        setResp((await res.json()) as R);
        setErrorStatus(null);
        setLoading(false);
      })
      .catch((e: { name?: string; status?: number }) => {
        if (e?.name === 'AbortError') return;
        setErrorStatus(e?.status ?? 0);
        setLoading(false);
      });
    return () => controller.abort();
  }, [endpoint, page, pageSize, sort, debouncedQ, activeKey, extraKey, reloadKey, nonce, version]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  const filterDefs = typeof filters === 'function' ? filters(resp) : (filters ?? []);
  const total = resp?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  const hasActive = q !== '' || Object.values(active).some((v) => v && v !== 'all');

  const toggleSort = (key: string) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    setPage(1);
  };

  if (resp === null && errorStatus !== null) {
    const msg = errorStatus === 401 ? t('err.unauthorized') : errorStatus === 403 ? t('err.forbidden') : errorStatus === 0 ? t('err.network') : t('err.server');
    return <ErrorState message={msg} onRetry={errorStatus === 401 || errorStatus === 403 ? undefined : retry} />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder ?? t('f.search')}
          aria-label={t('f.search')}
          className={`${controlClass} w-full sm:w-64`}
        />
        {filterDefs.map((f) => (
          <select
            key={f.key}
            aria-label={f.label}
            value={active[f.key] ?? 'all'}
            onChange={(e) => {
              setActive((a) => ({ ...a, [f.key]: e.target.value }));
              setPage(1);
            }}
            className={controlClass}
          >
            <option value="all">{f.label}: {t('misc.all')}</option>
            {f.options.map((o) => (
              <option key={o.v} value={o.v}>{o.l}</option>
            ))}
          </select>
        ))}
        {hasActive && (
          <button
            type="button"
            onClick={() => {
              setQ('');
              setDebouncedQ('');
              setActive({});
              setPage(1);
            }}
            className="text-xs font-semibold text-accent-strong hover:underline"
          >
            {t('act.clear')}
          </button>
        )}
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {exportFilename && can('export:csv') && (
            <button type="button" onClick={exportCsv} disabled={exporting} className="border border-line-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-50">
              {exporting ? '…' : t('act.exportCsv')}
            </button>
          )}
          {toolbarEnd}
        </div>
      </div>

      {errorStatus !== null && resp !== null && (
        <div role="status" className="border-b border-warn bg-warn-soft px-4 py-2 text-xs text-warn-ink">
          {t('ref.failed')}
          <button type="button" onClick={retry} className="ms-3 font-semibold underline">{t('act.retry')}</button>
        </div>
      )}

      {bulkActions && selected.size > 0 && resp && (
        <div role="region" aria-label={t('bulk.title')} className="flex flex-wrap items-center gap-3 border-b border-accent bg-accent-soft px-4 py-2.5 text-sm">
          <span className="font-semibold text-ink"><span dir="ltr" className="tabular-nums">{selected.size}</span> {t('bulk.selected')}</span>
          <div className="flex flex-wrap items-center gap-2">{bulkActions(resp.data.filter((r) => selected.has(rowKey(r))), () => setSelected(new Set()))}</div>
          <button type="button" onClick={() => setSelected(new Set())} className="ms-auto text-xs font-semibold text-accent-strong hover:underline">{t('bulk.clear')}</button>
        </div>
      )}

      <div className={`overflow-x-auto transition-opacity duration-150 ${loading && resp ? 'opacity-60' : ''}`} aria-busy={loading}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-ink">
              {bulkActions && (
                <th scope="col" className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={t('bulk.selectPage')}
                    checked={!!resp && resp.data.length > 0 && resp.data.every((r) => selected.has(rowKey(r)))}
                    ref={(el) => {
                      if (el && resp) el.indeterminate = selected.size > 0 && !resp.data.every((r) => selected.has(rowKey(r)));
                    }}
                    onChange={(e) => setSelected(e.target.checked && resp ? new Set(resp.data.map(rowKey)) : new Set())}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </th>
              )}
              {columns.map((c) => {
                const isSorted = c.sortKey !== undefined && sort.key === c.sortKey;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={isSorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={`whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-muted ${c.align === 'end' ? 'text-end' : 'text-start'}`}
                  >
                    {c.sortKey ? (
                      <button type="button" onClick={() => toggleSort(c.sortKey!)} className="inline-flex items-center gap-1 hover:text-ink">
                        {c.header}
                        <span aria-hidden="true" className="text-[10px]">{isSorted ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {resp === null ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-line">
                  <td colSpan={columns.length + (bulkActions ? 1 : 0)} className="px-4 py-3"><div className="skeleton h-5" /></td>
                </tr>
              ))
            ) : resp.data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (bulkActions ? 1 : 0)}>
                  <EmptyState title={t('f.noResults')} body={emptyBody} />
                  {!hasActive && total === 0 && emptyAction && <div className="-mt-4 pb-8 text-center">{emptyAction}</div>}
                </td>
              </tr>
            ) : (
              resp.data.map((row) => (
                <tr
                  key={rowKey(row)}
                  data-rowlink={rowHref && rowHref(row) ? '' : undefined}
                  onClick={(e) => {
                    const href = rowHref?.(row);
                    if (!href || (e.target as HTMLElement).closest('a, button, input, select, [data-copy], summary')) return;
                    router.push(href);
                  }}
                  className="border-b border-line transition-colors duration-150 hover:bg-surface-2"
                >
                  {bulkActions && (
                    <td className="w-10 px-4 py-3 align-middle">
                      <input
                        type="checkbox"
                        aria-label={t('bulk.selectRow')}
                        checked={selected.has(rowKey(row))}
                        onChange={(e) =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(rowKey(row));
                            else next.delete(rowKey(row));
                            return next;
                          })
                        }
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 align-middle ${c.align === 'end' ? 'text-end' : 'text-start'}`}>{c.render(row)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-2.5 text-xs text-muted">
        <span aria-live="polite">
          {t('f.showing')} <span dir="ltr" className="tabular-nums">{from}–{to}</span> {t('f.of')} <span dir="ltr" className="tabular-nums">{total.toLocaleString('en-US')}</span> {t('f.records')}
        </span>
        <label className="ms-auto flex items-center gap-1.5">
          <span>{t('f.rows')}</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            aria-label={t('f.rows')}
            className="border border-line-strong bg-surface px-1.5 py-1 text-xs text-ink"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <button type="button" aria-label={t('f.prev')} disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-8 w-8 border border-line-strong bg-surface transition-colors hover:bg-surface-2 disabled:opacity-40">
              <span aria-hidden="true" className="rtl:hidden">‹</span>
              <span aria-hidden="true" className="hidden rtl:inline">›</span>
            </button>
            <span className="tabular-nums">{t('f.page')} {page} / {pages}</span>
            <button type="button" aria-label={t('f.next')} disabled={page >= pages} onClick={() => setPage(page + 1)} className="h-8 w-8 border border-line-strong bg-surface transition-colors hover:bg-surface-2 disabled:opacity-40">
              <span aria-hidden="true" className="rtl:hidden">›</span>
              <span aria-hidden="true" className="hidden rtl:inline">‹</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
