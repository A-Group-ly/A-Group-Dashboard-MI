'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Currency, Language } from '@/types/dashboard';
import { translate } from '@/lib/opsDict';
import { translations } from '@/lib/translations';
import {
  GRANULARITIES,
  isIsoDate,
  previousRange,
  resolveRange,
  shiftPeriod,
  type Granularity,
  type PeriodSpec,
  type Range,
} from '@/lib/period';

export type Theme = 'light' | 'dark';

export const REFRESH_OPTIONS = [0, 30, 60, 120, 300] as const;

interface Prefs {
  lang: Language;
  theme: Theme;
  currency: Currency;
  period: PeriodSpec;
  platform: string; // 'all' or a platform label
  refreshSeconds: number;
}

/**
 * Fixed anchor used for the very first (server) render so hydration matches. After mount the
 * period is moved to the real current date unless the user already chose one.
 */
const INITIAL_ANCHOR = '2026-10-01';

const DEFAULT_PREFS: Prefs = {
  lang: 'en',
  theme: 'light',
  currency: 'LYD',
  period: { granularity: 'month', anchor: INITIAL_ANCHOR },
  platform: 'all',
  refreshSeconds: 120,
};

const STORAGE_KEY = 'ag_prefs_v2';

interface AppContextValue extends Prefs {
  range: Range;
  previous: Range;
  setLang: (l: Language) => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setCurrency: (c: Currency) => void;
  setGranularity: (g: Granularity) => void;
  setCustomRange: (from: string, to: string) => void;
  shift: (dir: -1 | 1) => void;
  goToToday: () => void;
  setPlatform: (p: string) => void;
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
  if (typeof r.platform === 'string') out.platform = r.platform;
  if (typeof r.refreshSeconds === 'number' && (REFRESH_OPTIONS as readonly number[]).includes(r.refreshSeconds)) {
    out.refreshSeconds = r.refreshSeconds;
  }
  const p = r.period as Record<string, unknown> | undefined;
  if (p && GRANULARITIES.includes(p.granularity as Granularity) && isIsoDate(p.anchor)) {
    out.period = {
      granularity: p.granularity as Granularity,
      anchor: p.anchor,
      customFrom: isIsoDate(p.customFrom) ? p.customFrom : undefined,
      customTo: isIsoDate(p.customTo) ? p.customTo : undefined,
    };
  }
  return out;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  const persist = useCallback((next: Prefs) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: preferences just are not remembered */
    }
  }, []);

  // After mount: load saved preferences; if there are none, start at the real current month.
  useEffect(() => {
    let saved: Partial<Prefs> = {};
    try {
      saved = sanitize(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}'));
    } catch {
      /* corrupt storage: keep defaults */
    }
    const today = new Date().toISOString().slice(0, 10);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage / real clock
    setPrefs((p) => ({ ...p, ...saved, period: saved.period ?? { granularity: 'month', anchor: today } }));
  }, []);

  // Reflect language / theme on <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = prefs.lang;
    root.dir = prefs.lang === 'ar' ? 'rtl' : 'ltr';
    root.classList.toggle('dark', prefs.theme === 'dark');
  }, [prefs.lang, prefs.theme]);

  const update = useCallback(
    (patch: Partial<Prefs> | ((p: Prefs) => Partial<Prefs>)) => {
      setPrefs((p) => {
        const next = { ...p, ...(typeof patch === 'function' ? patch(p) : patch) };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const value = useMemo<AppContextValue>(() => {
    const range = resolveRange(prefs.period);
    return {
      ...prefs,
      range,
      previous: previousRange(prefs.period),
      setLang: (lang) => update({ lang }),
      setTheme: (theme) => update({ theme }),
      toggleTheme: () => update((p) => ({ theme: p.theme === 'dark' ? 'light' : 'dark' })),
      setCurrency: (currency) => update({ currency }),
      setGranularity: (granularity) =>
        update((p) => {
          const cur = resolveRange(p.period);
          return {
            period:
              granularity === 'custom'
                ? { granularity, anchor: cur.from, customFrom: cur.from, customTo: cur.to }
                : { granularity, anchor: p.period.granularity === 'custom' ? cur.from : p.period.anchor },
          };
        }),
      setCustomRange: (from, to) => update({ period: { granularity: 'custom', anchor: from, customFrom: from, customTo: to } }),
      shift: (dir) => update((p) => ({ period: shiftPeriod(p.period, dir) })),
      goToToday: () =>
        update((p) => {
          const today = new Date().toISOString().slice(0, 10);
          return { period: p.period.granularity === 'custom' ? { granularity: 'month', anchor: today } : { ...p.period, anchor: today } };
        }),
      setPlatform: (platform) => update({ platform }),
      setRefreshSeconds: (refreshSeconds) => update({ refreshSeconds }),
      t: (key) => translate(prefs.lang, key),
      tr: translations[prefs.lang],
      dir: prefs.lang === 'ar' ? 'rtl' : 'ltr',
    };
  }, [prefs, update]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
