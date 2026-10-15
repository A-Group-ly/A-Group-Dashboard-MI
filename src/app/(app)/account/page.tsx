'use client';

import React from 'react';
import { UserProfile } from '@clerk/nextjs';
import { useApp } from '@/components/providers/AppProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { ROUTE_PERMISSION, type Permission } from '@/lib/permissions';
import { Badge, Card, PageHeader, PageSkeleton } from '@/components/ui/primitives';
import Copyable from '@/components/ui/Copyable';

const PAGES: [string, string][] = [
  ['/', 'nav.overview'],
  ['/customers', 'nav.customers'],
  ['/subscriptions', 'nav.subscriptions'],
  ['/invoices', 'nav.invoices'],
  ['/transactions', 'nav.transactions'],
  ['/budgets', 'nav.budgets'],
  ['/reports', 'nav.reports'],
  ['/alerts', 'nav.alerts'],
  ['/organizations', 'nav.organizations'],
  ['/audit', 'nav.audit'],
];
const ACTIONS: [Permission, string][] = [
  ['customers:write', 'cust.add'],
  ['subscriptions:write', 'sub.add'],
  ['invoices:write', 'inv.add'],
  ['payments:record', 'inv.recordPayment'],
  ['transactions:write', 'tx.add'],
  ['budgets:write', 'bud.set'],
  ['plans:write', 'plan.add'],
  ['users:manage', 'users.title'],
  ['export:csv', 'act.exportCsv'],
];

/** Own account page: who you are, what your role allows, and (via Clerk) password and sign-in settings. */
export default function AccountPage() {
  const { t, theme } = useApp();
  const { me, can } = useAccess();
  if (!me) return <PageSkeleton />;

  const dark = theme === 'dark';
  const pages = PAGES.filter(([href]) => can((ROUTE_PERMISSION[href] ?? 'dashboard:view') as Permission));
  const actions = ACTIONS.filter(([perm]) => can(perm));

  return (
    <>
      <PageHeader title={t('acct.title')} subtitle={t('acct.sub')} />

      <Card title={t('acct.profile')}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-lg font-bold text-black">
            {me.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- small remote avatar from Clerk
              <img src={me.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (me.name || me.email || '?').slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="break-words font-head text-lg font-bold text-ink" dir="auto"><Copyable value={me.name || me.email || ''} /></div>
            {me.email && <div dir="ltr" className="break-all text-sm text-muted"><Copyable value={me.email} /></div>}
          </div>
          <div className="ms-auto text-end">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{t('acct.role')}</div>
            <Badge tone="accent">{t(`role.${me.role}`)}</Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title={t('acct.pages')}>
          <ul className="flex flex-wrap gap-2">
            {pages.map(([href, key]) => (
              <li key={href}><Badge tone="neutral">{t(key)}</Badge></li>
            ))}
          </ul>
        </Card>
        <Card title={t('acct.actions')}>
          {actions.length === 0 ? (
            <p className="text-sm text-muted">{t('acct.viewOnly')}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {actions.map(([perm, key]) => (
                <li key={perm}><Badge tone="ok">{t(key)}</Badge></li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title={t('acct.security')} hint={t('acct.securityHint')} flush>
        <div className="p-3 sm:p-5">
          <UserProfile
            routing="hash"
            appearance={{
              variables: {
                colorPrimary: '#f05e49',
                borderRadius: '4px',
                colorBackground: dark ? '#272727' : '#ffffff',
                colorForeground: dark ? '#f2f2f2' : '#212121',
                colorMutedForeground: dark ? '#b5b5b5' : '#5c5c5c',
                colorInput: dark ? '#1a1a1a' : '#ffffff',
                colorInputForeground: dark ? '#f2f2f2' : '#212121',
                colorNeutral: dark ? '#f2f2f2' : '#212121',
                fontFamily: 'var(--font-hanken), system-ui, sans-serif',
              },
              elements: {
                rootBox: { width: '100%' },
                cardBox: { width: '100%', maxWidth: '100%', boxShadow: 'none', border: '1px solid var(--line)', borderRadius: '0' },
              },
            }}
          />
        </div>
      </Card>
    </>
  );
}
