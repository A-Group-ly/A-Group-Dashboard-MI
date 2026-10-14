'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { controlClass, EmptyState } from './primitives';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  /** Provide a sort accessor to make the column sortable. */
  sort?: (row: T) => string | number | null;
  align?: 'end';
}

export interface FilterDef<T> {
  key: string;
  label: string;
  options: { v: string; l: string }[];
  get: (row: T) => string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Text fields searched by the search box. */
  searchFields?: (row: T) => (string | null | undefined)[];
  searchPlaceholder?: string;
  filters?: FilterDef<T>[];
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  pageSize?: number;
  emptyBody?: string;
}

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchFields,
  searchPlaceholder,
  filters = [],
  defaultSort,
  pageSize = 8,
  emptyBody,
}: DataTableProps<T>) {
  const { t } = useApp();
  const [q, setQ] = useState('');
  const [active, setActive] = useState<Record<string, string>>({});
  const [sort, setSort] = useState(defaultSort ?? null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim() && searchFields) {
      const needle = q.trim().toLowerCase();
      out = out.filter((r) => searchFields(r).some((f) => (f ?? '').toLowerCase().includes(needle)));
    }
    for (const f of filters) {
      const v = active[f.key];
      if (v && v !== 'all') out = out.filter((r) => f.get(r) === v);
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sort) {
        const acc = col.sort;
        out = [...out].sort((a, b) => {
          const x = acc(a);
          const y = acc(b);
          let c: number;
          if (x == null) c = 1;
          else if (y == null) c = -1;
          else if (typeof x === 'number' && typeof y === 'number') c = x - y;
          else c = String(x).localeCompare(String(y));
          return sort.dir === 'asc' ? c : -c;
        });
      }
    }
    return out;
  }, [rows, q, active, sort, searchFields, filters, columns]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);
  const from = filtered.length ? (current - 1) * pageSize + 1 : 0;
  const to = Math.min(current * pageSize, filtered.length);
  const hasActive = q !== '' || Object.values(active).some((v) => v && v !== 'all');

  const toggleSort = (key: string) => {
    setSort((s) => (s && s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    setPage(1);
  };

  return (
    <div>
      {(searchFields || filters.length > 0) && (
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        {searchFields && (
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder ?? t('f.search')}
            aria-label={t('f.search')}
            className={`${controlClass} w-56`}
          />
        )}
        {filters.map((f) => (
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
            <option value="all">
              {f.label}: {t('misc.all')}
            </option>
            {f.options.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        ))}
        {hasActive && (
          <button
            type="button"
            onClick={() => {
              setQ('');
              setActive({});
              setPage(1);
            }}
            className="text-xs font-semibold text-accent-strong hover:underline"
          >
            {t('act.clear')}
          </button>
        )}
      </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-ink">
              {columns.map((c) => {
                const isSorted = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={isSorted ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={`whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-muted ${c.align === 'end' ? 'text-end' : 'text-start'}`}
                  >
                    {c.sort ? (
                      <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-ink">
                        {c.header}
                        <span aria-hidden="true" className="text-[10px]">
                          {isSorted ? (sort!.dir === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
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
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState title={t('f.noResults')} body={emptyBody} />
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={rowKey(row)} className="border-b border-line hover:bg-surface-2">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 align-middle ${c.align === 'end' ? 'text-end' : 'text-start'}`}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-2.5 text-xs text-muted">
        <span aria-live="polite">
          {t('f.showing')} {from}–{to} {t('f.of')} {filtered.length} {t('f.records')}
        </span>
        {pages > 1 && (
          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              aria-label={t('f.prev')}
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              className="h-7 w-7 border border-line-strong bg-surface disabled:opacity-40"
            >
              <span aria-hidden="true" className="rtl:hidden">‹</span>
              <span aria-hidden="true" className="hidden rtl:inline">›</span>
            </button>
            <span className="tabular-nums">
              {t('f.page')} {current} / {pages}
            </span>
            <button
              type="button"
              aria-label={t('f.next')}
              disabled={current >= pages}
              onClick={() => setPage(current + 1)}
              className="h-7 w-7 border border-line-strong bg-surface disabled:opacity-40"
            >
              <span aria-hidden="true" className="rtl:hidden">›</span>
              <span aria-hidden="true" className="hidden rtl:inline">‹</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
