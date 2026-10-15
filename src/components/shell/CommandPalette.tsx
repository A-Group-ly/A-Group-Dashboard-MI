'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/providers/AppProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { ROUTE_PERMISSION, type Permission } from '@/lib/permissions';
import { formatCurrency } from '@/lib/calculations';
import { Modal } from '@/components/ui/forms';
import { clearRecent, getRecent, type RecentItem } from '@/lib/recent';

interface Item {
  key: string;
  group: string;
  label: string;
  hint?: string;
  href: string;
}

interface SearchResults {
  customers: { id: string; name: string; email: string; type: string }[];
  subscriptions: { id: string; customer: string; plan: string; status: string }[];
  invoices: { id: string; number: string; customer: string; customerId: string; total: number; currency: 'LYD' | 'USD'; status: string }[];
}

const PAGES: { href: string; key: string; go: string }[] = [
  { href: '/', key: 'nav.overview', go: 'o' },
  { href: '/customers', key: 'nav.customers', go: 'c' },
  { href: '/subscriptions', key: 'nav.subscriptions', go: 's' },
  { href: '/invoices', key: 'nav.invoices', go: 'i' },
  { href: '/transactions', key: 'nav.transactions', go: 't' },
  { href: '/budgets', key: 'nav.budgets', go: 'b' },
  { href: '/reports', key: 'nav.reports', go: 'r' },
  { href: '/alerts', key: 'nav.alerts', go: 'a' },
  { href: '/organizations', key: 'nav.organizations', go: '' },
  { href: '/audit', key: 'nav.audit', go: '' },
  { href: '/settings', key: 'nav.settings', go: '' },
  { href: '/tv', key: 'nav.tv', go: 'v' },
];

const typing = (el: EventTarget | null) => {
  const e = el as HTMLElement | null;
  return !!e && (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT' || e.isContentEditable);
};

/**
 * Global search + keyboard navigation. Ctrl/Cmd+K or "/" opens search, "?" lists the shortcuts, and "g" then a
 * letter jumps to a page. Results only include what the signed-in role may open (the API filters again).
 */
export default function CommandPalette({ openSignal }: { openSignal: number }) {
  const { t } = useApp();
  const { can } = useAccess();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const gPending = useRef(0);

  const allowed = useMemo(() => PAGES.filter((p) => can((ROUTE_PERMISSION[p.href] ?? 'dashboard:view') as Permission)), [can]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQ('');
      router.push(href);
    },
    [router]
  );

  // Open from the header button.
  // Reload the list every time the palette opens (pages add to it while you browse).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the browser-only list when the dialog opens
    if (open) setRecent(getRecent());
  }, [open]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the header button asks the palette to open
    if (openSignal > 0) setOpen(true);
  }, [openSignal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === '?') {
        e.preventDefault();
        setHelp(true);
      } else if (e.key.toLowerCase() === 'g') {
        gPending.current = Date.now();
      } else if (gPending.current && Date.now() - gPending.current < 1200) {
        const page = allowed.find((p) => p.go && p.go === e.key.toLowerCase());
        gPending.current = 0;
        if (page) router.push(page.href);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [allowed, router]);

  // Debounced server search.
  useEffect(() => {
    if (!open || q.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale results for short queries
      setResults(null);
      return;
    }
    const c = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: c.signal, cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setResults(d as SearchResults))
        .catch(() => {});
    }, 220);
    return () => {
      window.clearTimeout(timer);
      c.abort();
    };
  }, [q, open]);

  const items = useMemo<Item[]>(() => {
    const needle = q.trim().toLowerCase();
    const pages = allowed
      .filter((p) => !needle || t(p.key).toLowerCase().includes(needle))
      .map((p) => ({ key: `p:${p.href}`, group: t('cmd.pages'), label: t(p.key), hint: p.go ? `g ${p.go}` : undefined, href: p.href }));
    const out: Item[] = [];
    if (results) {
      for (const c of results.customers) out.push({ key: `c:${c.id}`, group: t('nav.customers'), label: c.name, hint: c.email, href: `/customers/${c.id}` });
      for (const s of results.subscriptions) out.push({ key: `s:${s.id}`, group: t('nav.subscriptions'), label: `${s.id} · ${s.customer}`, hint: `${s.plan} · ${t(`status.${s.status}`)}`, href: `/subscriptions/${s.id}` });
      for (const i of results.invoices) out.push({ key: `i:${i.id}`, group: t('nav.invoices'), label: `${i.number} · ${i.customer}`, hint: `${formatCurrency(i.total, i.currency)} · ${t(`status.${i.status}`)}`, href: `/customers/${i.customerId}` });
    }
    const recents: Item[] = needle
      ? []
      : recent
          .filter((r) => r.kind !== 'invoice' || can('invoices:view'))
          .map((r) => ({ key: `r:${r.href}`, group: t('cmd.recent'), label: r.label, hint: t(`cmd.kind.${r.kind}`), href: r.href }));
    return [...recents, ...out, ...pages];
  }, [q, results, allowed, t, recent, can]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep the highlighted row in range as results change
    setActive(0);
  }, [q, results]);

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault();
      go(items[active].href);
    }
  };

  let lastGroup = '';
  return (
    <>
      <Modal open={open} title={t('cmd.title')} onClose={() => setOpen(false)}>
        <input
          autoFocus
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onInputKey}
          placeholder={t('cmd.placeholder')}
          aria-label={t('cmd.title')}
          className="mb-3 w-full border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
        />
        <ul className="max-h-[50vh] overflow-auto" role="listbox">
          {items.length === 0 && <li className="px-2 py-3 text-xs text-muted">{t('f.noResults')}</li>}
          {items.map((it, idx) => {
            const header = it.group !== lastGroup ? it.group : null;
            lastGroup = it.group;
            return (
              <React.Fragment key={it.key}>
                {header && <li className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{header}</li>}
                <li role="option" aria-selected={idx === active}>
                  <button
                    type="button"
                    onClick={() => go(it.href)}
                    onMouseEnter={() => setActive(idx)}
                    className={`flex w-full items-center justify-between gap-3 px-2 py-2 text-start text-sm transition-colors ${idx === active ? 'bg-accent-soft text-accent-strong' : 'text-ink hover:bg-surface-2'}`}
                  >
                    <span className="min-w-0 break-words font-semibold" dir="auto">{it.label}</span>
                    {it.hint && <span dir="ltr" className="max-w-[45%] shrink-0 break-all text-end text-[11px] text-muted">{it.hint}</span>}
                  </button>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-2 text-[11px] text-muted">
          <span>{t('cmd.hint')}</span>
          {recent.length > 0 && !q.trim() && (
            <button
              type="button"
              onClick={() => {
                clearRecent();
                setRecent([]);
              }}
              className="shrink-0 font-semibold text-accent-strong hover:underline"
            >
              {t('cmd.clearRecent')}
            </button>
          )}
        </div>
      </Modal>

      <Modal open={help} title={t('kbd.title')} onClose={() => setHelp(false)}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {[
            ['Ctrl / ⌘ + K', t('kbd.search')],
            ['/', t('kbd.search')],
            ['?', t('kbd.help')],
            ['[', t('kbd.sidebar')],
            ['g  o', t('nav.overview')],
            ['g  c', t('nav.customers')],
            ['g  s', t('nav.subscriptions')],
            ['g  i', t('nav.invoices')],
            ['g  t', t('nav.transactions')],
            ['g  b', t('nav.budgets')],
            ['g  r', t('nav.reports')],
            ['g  a', t('nav.alerts')],
            ['g  v', t('nav.tv')],
            ['Esc', t('kbd.close')],
          ].map(([k, v]) => (
            <React.Fragment key={k}>
              <dt dir="ltr"><kbd className="border border-line-strong bg-surface-2 px-1.5 py-0.5 text-xs font-semibold">{k}</kbd></dt>
              <dd className="text-ink-2">{v}</dd>
            </React.Fragment>
          ))}
        </dl>
      </Modal>
    </>
  );
}
