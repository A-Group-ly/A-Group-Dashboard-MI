'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/components/providers/AppProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { ROUTE_PERMISSION, type Permission } from '@/lib/permissions';
import Logo from '@/components/Logo';
import RefreshStatus from './RefreshStatus';
import AccountMenu from './AccountMenu';

const NAV: { group?: string; items: { href: string; key: string }[] }[] = [
  { items: [{ href: '/', key: 'nav.overview' }] },
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

const segBase = 'px-2.5 py-1 text-xs font-semibold transition-colors duration-150';
const segOn = 'bg-accent text-black';
const segOff = 'text-header-ink/70 hover:bg-white/10 hover:text-header-ink';
const hdrBtn = 'border border-header-line px-2.5 py-1 text-sm transition-colors duration-150 hover:bg-white/10 active:scale-95';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang, theme, toggleTheme, currency, setCurrency } = useApp();
  const { can } = useAccess();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));
  // Convenience only: the server enforces the same rules on every API call.
  const visible = (href: string) => can(ROUTE_PERMISSION[href] as Permission);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-[100] focus:bg-accent focus:px-3 focus:py-2 focus:text-black">
        {t('shell.skip')}
      </a>

      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside
        aria-label="Main"
        className={`fixed inset-y-0 start-0 z-40 flex w-60 flex-col border-e border-line bg-surface transition-transform lg:translate-x-0 lg:rtl:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Logo className="h-9 w-9 shrink-0 text-ink" />
          <div className="min-w-0">
            <div dir="ltr" className="text-start font-head text-sm font-bold tracking-wide">{t('app.name')}</div>
            <div className="truncate text-[10px] uppercase tracking-[0.14em] text-muted">{t('app.sub')}</div>
          </div>
          <button type="button" className="ms-auto text-muted transition-colors hover:text-ink lg:hidden" onClick={() => setOpen(false)} aria-label={t('shell.closeMenu')}>
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((g, gi) => {
            const items = g.items.filter((it) => visible(it.href));
            if (items.length === 0) return null;
            return (
              <div key={gi} className="mb-3">
                {g.group && <div className="px-2 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{t(g.group)}</div>}
                {items.map((it) => {
                  const active = isActive(it.href);
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={`mb-0.5 block border-s-2 px-3 py-2 text-sm font-medium transition-all duration-150 ${
                        active
                          ? 'border-accent bg-accent-soft text-accent-strong'
                          : 'border-transparent text-ink-2 hover:border-line-strong hover:bg-surface-2 hover:ps-4 hover:text-ink'
                      }`}
                    >
                      {t(it.key)}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-line px-5 py-3 text-[11px] text-muted">{t('shell.footer')}</div>
      </aside>

      <div className="lg:ps-60">
        <header className="sticky top-0 z-20 border-b border-header-line bg-header text-header-ink">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 lg:px-6">
            <button type="button" className={`${hdrBtn} lg:hidden`} onClick={() => setOpen(true)} aria-label={t('shell.menu')} aria-expanded={open}>
              ☰
            </button>

            <span className="border border-[#7c4a1e] bg-[#241304] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#fdba74]" title={t('shell.demoTitle')}>
              {t('shell.demoBadge')}
            </span>

            <div className="ms-auto flex flex-wrap items-center gap-x-3 gap-y-2">
              <RefreshStatus />

              <div role="group" aria-label={t('shell.currency')} className="flex border border-header-line">
                {(['LYD', 'USD'] as const).map((c) => (
                  <button key={c} type="button" aria-pressed={currency === c} onClick={() => setCurrency(c)} className={`${segBase} ${currency === c ? segOn : segOff}`}>
                    {c}
                  </button>
                ))}
              </div>

              <div role="group" aria-label={t('shell.language')} className="flex border border-header-line">
                <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')} className={`${segBase} ${lang === 'en' ? segOn : segOff}`}>EN</button>
                <button type="button" aria-pressed={lang === 'ar'} onClick={() => setLang('ar')} className={`${segBase} ${lang === 'ar' ? segOn : segOff}`}>عربي</button>
              </div>

              <button type="button" onClick={toggleTheme} aria-label={t('shell.theme')} title={t('shell.theme')} className={hdrBtn}>
                <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
              </button>

              <AccountMenu />
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
