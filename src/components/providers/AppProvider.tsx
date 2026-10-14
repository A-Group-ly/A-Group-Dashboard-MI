'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Currency, Language } from '@/types/dashboard';
import { translate } from '@/lib/opsDict';
import { translations } from '@/lib/translations';

export type Theme = 'light' | 'dark';
export type DataSourceMode = 'auto' | 'demo';

export const AVAILABLE_MONTHS = ['2026-10', '2026-09'] as const;
export const REFRESH_OPTIONS = [0, 30, 60, 120, 300] as const;

interface Prefs {
  lang: Language;
  theme: Theme;
  currency: Currency;
  month: string;
  platform: string; // 'all' or a platform label
  dataSource: DataSourceMode;
  refreshSeconds: number;
}

const DEFAULT_PREFS: Prefs = {
  lang: 'en',
  theme: 'light',
  currency: 'LYD',
  month: '2026-10',
  platform: 'all',
  dataSource: 'auto',
  refreshSeconds: 120,
};

const STORAGE_KEY = 'ag_prefs_v1';

interface AppContextValue extends Prefs {
  setLang: (l: Language) => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setCurrency: (c: Currency) => void;
  setMonth: (m: string) => void;
  setPlatform: (p: string) => void;
  setDataSource: (d: DataSourceMode) => void;
  setRefreshSeconds: (s: number) => void;
  /** UI string lookup for shell / operations pages. */
  t: (key: string) => string;
  /** Finance-widget strings (translations.ts). */
  tr: (typeof translations)['en'];
  dir: 'ltr' | 'rtl';
}

const AppContext = createContext<AppContextValue | null>(null);

function sanitize(raw: unknown): Partial<Prefs> {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<Prefs> = {};
  if (r.lang === 'en' || r.lang === 'ar') out.lang = r.lang;
  if (r.theme === 'light' || r.theme === 'dark') out.theme = r.theme;
  if (r.currency === 'LYD' || r.currency === 'USD') out.currency = r.currency;
  if (typeof r.month === 'string' && (AVAILABLE_MONTHS as readonly string[]).includes(r.month)) out.month = r.month;
  if (typeof r.platform === 'string') out.platform = r.platform;
  if (r.dataSource === 'auto' || r.dataSource === 'demo') out.dataSource = r.dataSource;
  if (typeof r.refreshSeconds === 'number' && (REFRESH_OPTIONS as readonly number[]).includes(r.refreshSeconds)) {
    out.refreshSeconds = r.refreshSeconds;
  }
  return out;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  // Load saved preferences after mount (keeps server and first client render identical).
  useEffect(() => {
    try {
      const saved = sanitize(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}'));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
      if (Object.keys(saved).length) setPrefs((p) => ({ ...p, ...saved }));
    } catch {
      /* storage unavailable or corrupt: keep defaults */
    }
  }, []);

  // Reflect language / theme on <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = prefs.lang;
    root.dir = prefs.lang === 'ar' ? 'rtl' : 'ltr';
    root.classList.toggle('dark', prefs.theme === 'dark');
  }, [prefs.lang, prefs.theme]);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ...prefs,
      setLang: (lang) => update({ lang }),
      setTheme: (theme) => update({ theme }),
      toggleTheme: () => update({ theme: prefs.theme === 'dark' ? 'light' : 'dark' }),
      setCurrency: (currency) => update({ currency }),
      setMonth: (month) => update({ month }),
      setPlatform: (platform) => update({ platform }),
      setDataSource: (dataSource) => update({ dataSource }),
      setRefreshSeconds: (refreshSeconds) => update({ refreshSeconds }),
      t: (key) => translate(prefs.lang, key),
      tr: translations[prefs.lang],
      dir: prefs.lang === 'ar' ? 'rtl' : 'ltr',
    }),
    [prefs, update]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
