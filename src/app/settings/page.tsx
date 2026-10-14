'use client';

import React from 'react';
import { REFRESH_OPTIONS, useApp } from '@/components/providers/AppProvider';
import { Card, DemoNotice, PageHeader } from '@/components/ui/primitives';

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`border px-4 py-2 text-xs font-semibold ${
        on ? 'border-ink bg-ink text-ink-contrast' : 'border-line-strong bg-surface text-ink-2 hover:bg-surface-2'
      }`}
    >
      {children}
    </button>
  );
}

export default function SettingsPage() {
  const { t, theme, setTheme, lang, setLang, dataSource, setDataSource, refreshSeconds, setRefreshSeconds } = useApp();

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
        <p className="mt-3 text-xs text-muted">
          {t('set.direction')}: {lang === 'ar' ? 'RTL' : 'LTR'}
        </p>
      </Card>

      <Card title={t('set.dataSource')}>
        <div className="flex flex-wrap gap-2">
          <Choice on={dataSource === 'auto'} onClick={() => setDataSource('auto')}>{t('set.sourceAuto')}</Choice>
          <Choice on={dataSource === 'demo'} onClick={() => setDataSource('demo')}>{t('set.sourceDemo')}</Choice>
        </div>
      </Card>

      <Card title={t('set.refresh')} hint={t('set.refreshNote')}>
        <div className="flex flex-wrap gap-2">
          {REFRESH_OPTIONS.map((s) => (
            <Choice key={s} on={refreshSeconds === s} onClick={() => setRefreshSeconds(s)}>
              {refreshLabel(s)}
            </Choice>
          ))}
        </div>
      </Card>

      <Card title={t('set.access')}>
        <p className="text-sm text-muted">{t('set.accessBody')}</p>
      </Card>
    </>
  );
}
