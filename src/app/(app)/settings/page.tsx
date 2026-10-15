'use client';

import React, { useState } from 'react';
import { REFRESH_OPTIONS, useApp } from '@/components/providers/AppProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { useApiData } from '@/components/providers/useApiData';
import { ApiGate, Card, DemoNotice, PageHeader, controlClass } from '@/components/ui/primitives';
import { ROLES, type Role } from '@/lib/permissions';
import { Button, apiSend, useErrorText } from '@/components/ui/forms';
import { useToast } from '@/components/providers/ToastProvider';

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`border px-4 py-2 text-xs font-semibold transition-all duration-150 active:scale-95 ${on ? 'border-ink bg-ink text-ink-contrast' : 'border-line-strong bg-surface text-ink-2 hover:bg-surface-2'}`}
    >
      {children}
    </button>
  );
}

interface Member {
  membershipId: string;
  name: string | null;
  email: string | null;
  role: Role;
  isActive: boolean;
  isYou: boolean;
}

function UsersPanel() {
  const { t } = useApp();
  const toast = useToast();
  const errorText = useErrorText();
  const state = useApiData<{ data: Member[] }>('/api/users');
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const changeRole = async (m: Member, role: Role) => {
    setBusy(m.membershipId);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${m.membershipId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
      if (res.ok) {
        setMessage({ kind: 'ok', text: t('users.updated') });
        state.retry();
      } else {
        setMessage({ kind: 'err', text: res.status === 409 ? t('users.lastAdmin') : t('users.failed') });
      }
    } catch {
      setMessage({ kind: 'err', text: t('users.failed') });
    } finally {
      setBusy(null);
    }
  };

  const setActive = async (m: Member, isActive: boolean) => {
    setBusy(m.membershipId);
    const res = await apiSend('PATCH', `/api/users/${m.membershipId}`, { isActive });
    setBusy(null);
    if (res.ok) {
      toast.success(isActive ? t('users.activated') : t('users.deactivated'));
      state.retry();
    } else toast.error(errorText(res));
  };

  return (
    <Card title={t('users.title')} hint={t('users.hint')} flush>
      <ApiGate state={state}>
        {(d) => (
          <>
            {d.data.length === 0 && <p className="px-5 py-4 text-sm text-muted">{t('users.empty')}</p>}
            <ul className="divide-y divide-line">
              {d.data.map((m) => (
                <li key={m.membershipId} className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-sm font-semibold text-ink" dir="auto">
                      {m.name || m.email}
                      {m.isYou && <span className="ms-2 text-xs font-normal text-muted">({t('users.you')})</span>}
                      {!m.isActive && <span className="ms-2 bg-bad-soft px-1.5 py-0.5 text-[10px] font-bold text-bad-ink">{t('users.inactive')}</span>}
                    </div>
                    {m.name && m.email && <div dir="ltr" className="break-all text-xs text-muted">{m.email}</div>}
                  </div>
                  <select
                    aria-label={`${t('acct.role')}: ${m.name || m.email}`}
                    value={m.role}
                    disabled={busy === m.membershipId}
                    onChange={(e) => changeRole(m, e.target.value as Role)}
                    className={controlClass}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{t(`role.${r}`)}</option>
                    ))}
                  </select>
                  {!m.isYou && (
                    <Button variant={m.isActive ? 'danger' : 'secondary'} disabled={busy === m.membershipId} onClick={() => setActive(m, !m.isActive)}>
                      {m.isActive ? t('users.deactivate') : t('users.activate')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {message && (
              <p role="status" className={`border-t border-line px-5 py-2 text-xs ${message.kind === 'ok' ? 'text-ok-ink' : 'text-bad-ink'}`}>{message.text}</p>
            )}
          </>
        )}
      </ApiGate>
    </Card>
  );
}

export default function SettingsPage() {
  const { t, theme, setTheme, lang, setLang, refreshSeconds, setRefreshSeconds, density, setDensity } = useApp();
  const { can } = useAccess();
  const refreshLabel = (s: number) => (s === 0 ? t('set.refreshOff') : t(`set.refresh${s}`));

  return (
    <>
      <PageHeader title={t('set.title')} subtitle={t('set.sub')} />
      <DemoNotice />

      <Card title={t('set.theme')}>
        <div className="flex gap-2">
          <Choice on={theme === 'light'} onClick={() => setTheme('light')}>{t('set.light')}</Choice>
          <Choice on={theme === 'dark'} onClick={() => setTheme('dark')}>{t('set.dark')}</Choice>
        </div>
      </Card>

      <Card title={t('set.language')}>
        <div className="flex gap-2">
          <Choice on={lang === 'en'} onClick={() => setLang('en')}>English</Choice>
          <Choice on={lang === 'ar'} onClick={() => setLang('ar')}>العربية</Choice>
        </div>
        <p className="mt-3 text-xs text-muted">{t('set.direction')}: {lang === 'ar' ? 'RTL' : 'LTR'}</p>
      </Card>

      <Card title={t('set.refresh')} hint={t('set.refreshNote')}>
        <div className="flex flex-wrap gap-2">
          {REFRESH_OPTIONS.map((s) => (
            <Choice key={s} on={refreshSeconds === s} onClick={() => setRefreshSeconds(s)}>{refreshLabel(s)}</Choice>
          ))}
        </div>
      </Card>

      <Card title={t('set.density')} hint={t('set.densityHint')}>
        <div className="flex flex-wrap gap-2">
          <Choice on={density === 'comfortable'} onClick={() => setDensity('comfortable')}>{t('set.densityComfortable')}</Choice>
          <Choice on={density === 'compact'} onClick={() => setDensity('compact')}>{t('set.densityCompact')}</Choice>
        </div>
      </Card>

      {can('users:manage') && <UsersPanel />}
    </>
  );
}
