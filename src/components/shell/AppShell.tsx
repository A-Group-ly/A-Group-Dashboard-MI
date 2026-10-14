'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AVAILABLE_MONTHS, useApp } from '@/components/providers/AppProvider';
import RefreshStatus from './RefreshStatus';

const NAV: { group?: string; items: { href: string; key: string }[] }[] = [
  {
    items: [{ href: '/', key: 'nav.overview' }],
  },
  {
    group: 'nav.groupBusiness',
    items: [
      { href: '/organizations', key: 'nav.organizations' },
      { href: '/customers', key: 'nav.customers' },
      { href: '/subscriptions', key: 'nav.subscriptions' },
    ],
  },
  {
    group: 'nav.groupFinance',
    items: [
      { href: '/transactions', key: 'nav.transactions' },
      { href: '/budgets', key: 'nav.budgets' },
      { href: '/reports', key: 'nav.reports' },
    ],
  },
  {
    group: 'nav.groupSystem',
    items: [
      { href: '/alerts', key: 'nav.alerts' },
      { href: '/settings', key: 'nav.settings' },
    ],
  },
];

function monthLabel(month: string, lang: 'en' | 'ar'): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-LY-u-nu-latn' : 'en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T00:00:00Z`));
}

const segBase = 'px-2.5 py-1 text-xs font-semibold transition-colors';
const segOn = 'bg-accent text-black';
const segOff = 'text-header-ink/70 hover:text-header-ink';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang, theme, toggleTheme, currency, setCurrency, month, setMonth } = useApp();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <div className="min-h-screen bg-bg text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-[100] focus:bg-accent focus:px-3 focus:py-2 focus:text-black"
      >
        {t('shell.skip')}
      </a>

      {/* Mobile scrim */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      {/* Sidebar */}
      <aside
        aria-label="Main"
        className={`fixed inset-y-0 start-0 z-40 flex w-60 flex-col border-e border-line bg-surface transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <div className="grid h-9 w-9 place-items-center bg-ink font-head text-base font-extrabold text-ink-contrast">A</div>
          <div className="min-w-0">
            <div className="font-head text-sm font-bold tracking-wide">{t('app.name')}</div>
            <div className="truncate text-[10px] uppercase tracking-[0.14em] text-muted">{t('app.sub')}</div>
          </div>
          <button
            type="button"
            className="ms-auto text-muted hover:text-ink lg:hidden"
            onClick={() => setOpen(false)}
            aria-label={t('shell.closeMenu')}
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((g, gi) => (
            <div key={gi} className="mb-3">
              {g.group && (
                <div className="px-2 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{t(g.group)}</div>
              )}
              {g.items.map((it) => {
                const active = isActive(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`mb-0.5 block border-s-2 px-3 py-2 text-sm font-medium ${
                      active
                        ? 'border-accent bg-accent-soft text-accent-strong'
                        : 'border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink'
                    }`}
                  >
                    {t(it.key)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-5 py-3 text-[11px] text-muted">{t('shell.footer')}</div>
      </aside>

      <div className="lg:ps-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-header-line bg-header text-header-ink">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 lg:px-6">
            <button
              type="button"
              className="border border-header-line px-2.5 py-1 text-sm lg:hidden"
              onClick={() => setOpen(true)}
              aria-label={t('shell.menu')}
              aria-expanded={open}
            >
              ☰
            </button>

            <span
              className="border border-[#7c4a1e] bg-[#241304] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#fdba74]"
              title={t('shell.demoTitle')}
            >
              {t('shell.demoBadge')}
            </span>

            <div className="ms-auto flex flex-wrap items-center gap-x-3 gap-y-2">
              <RefreshStatus />

              <select
                aria-label={t('shell.month')}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="border border-header-line bg-header px-2 py-1 text-xs text-header-ink"
              >
                {AVAILABLE_MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m, lang)}
                  </option>
                ))}
              </select>

              <div role="group" aria-label={t('shell.currency')} className="flex border border-header-line">
                {(['LYD', 'USD'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={currency === c}
                    onClick={() => setCurrency(c)}
                    className={`${segBase} ${currency === c ? segOn : segOff}`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div role="group" aria-label={t('shell.language')} className="flex border border-header-line">
                <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')} className={`${segBase} ${lang === 'en' ? segOn : segOff}`}>
                  EN
                </button>
                <button type="button" aria-pressed={lang === 'ar'} onClick={() => setLang('ar')} className={`${segBase} ${lang === 'ar' ? segOn : segOff}`}>
                  عربي
                </button>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={t('shell.theme')}
                title={t('shell.theme')}
                className="border border-header-line px-2.5 py-1 text-sm hover:bg-white/10"
              >
                <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
              </button>
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1280px] px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
