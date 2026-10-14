'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useApp } from '@/components/providers/AppProvider';
import { useAccess } from '@/components/providers/AccessProvider';

function initials(name: string | null, email: string | null): string {
  const src = (name || email || '?').trim();
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
}

/**
 * Account menu: identity and role live here as information (a label, not a button), with the actions
 * (account settings, sign out) below it. Closes on outside click and Escape.
 */
export default function AccountMenu() {
  const { t } = useApp();
  const { me } = useAccess();
  const { signOut, openUserProfile } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!me) return <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" aria-hidden="true" />;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('acct.menu')}
        className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-accent text-xs font-bold text-black transition hover:ring-2 hover:ring-white/40 focus-visible:ring-2"
      >
        {me.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- small remote avatar from Clerk
          <img src={me.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials(me.name, me.email)
        )}
      </button>

      {open && (
        <div role="menu" className="absolute end-0 top-full z-50 mt-2 w-64 border border-line bg-surface text-ink shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <div className="truncate text-sm font-semibold" dir="auto">{me.name || me.email}</div>
            {me.name && me.email && <div dir="ltr" className="truncate text-xs text-muted">{me.email}</div>}
            {/* Informational only: not interactive */}
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted">{t('acct.role')}</span>
              <span className="border border-line bg-surface-2 px-2 py-0.5 font-semibold text-ink-2" aria-label={`${t('acct.role')}: ${t(`role.${me.role}`)}`}>
                {t(`role.${me.role}`)}
              </span>
            </div>
          </div>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              openUserProfile();
            }}
            className="block w-full px-4 py-2.5 text-start text-sm transition-colors hover:bg-surface-2"
          >
            {t('acct.manage')}
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => signOut({ redirectUrl: '/sign-in' })}
            className="block w-full border-t border-line px-4 py-2.5 text-start text-sm text-bad-ink transition-colors hover:bg-bad-soft"
          >
            {t('acct.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}
