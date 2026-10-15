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

export type Density = 'comfortable' | 'compact';
export const SECTIONS = ['pulse', 'position', 'kpis', 'charts', 'channels', 'budget', 'comparisons', 'actions', 'recent'] as const;
export type SectionKey = (typeof SECTIONS)[number];

export interface SavedView {
  id: string;
  name: string;
  period: PeriodSpec;
  platform: string;
}

interface Prefs {
  lang: Language;
  theme: Theme;
  density: Density;
  /** Overview sections the user chose to hide. */
  hidden: SectionKey[];
  views: SavedView[];
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
  density: 'comfortable',
  hidden: [],
  views: [],
  period: { granularity: 'month', anchor: INITIAL_ANCHOR },
  platform: 'all',
  refreshSeconds: 120,
};

const STORAGE_KEY = 'ag_prefs_v2';

interface AppContextValue extends Prefs {
  /** Currency of the enclosing <CurrencyScope> (LYD outside any scope). Currencies are never combined. */
  currency: Currency;
  range: Range;
  previous: Range;
  setLang: (l: Language) => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setDensity: (d: Density) => void;
  toggleSection: (k: SectionKey) => void;
  showAllSections: () => void;
  saveView: (name: string) => void;
  deleteView: (id: string) => void;
  applyView: (id: string) => void;
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
  if (typeof r.platform === 'string') out.platform = r.platform;
  if (r.density === 'comfortable' || r.density === 'compact') out.density = r.density;
  if (Array.isArray(r.hidden)) out.hidden = r.hidden.filter((x): x is SectionKey => (SECTIONS as readonly string[]).includes(x as string));
  if (Array.isArray(r.views)) {
    out.views = r.views
      .map((v): SavedView | null => {
        const o = v as Record<string, unknown>;
        const p = o?.period as Record<string, unknown> | undefined;
        if (typeof o?.id !== 'string' || typeof o?.name !== 'string' || !p || !GRANULARITIES.includes(p.granularity as Granularity) || !isIsoDate(p.anchor)) return null;
        return {
          id: o.id,
          name: o.name.slice(0, 40),
          platform: typeof o.platform === 'string' ? o.platform : 'all',
          period: { granularity: p.granularity as Granularity, anchor: p.anchor, customFrom: isIsoDate(p.customFrom) ? p.customFrom : undefined, customTo: isIsoDate(p.customTo) ? p.customTo : undefined },
        };
      })
      .filter((v): v is SavedView => v !== null)
      .slice(0, 12);
  }
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
    root.classList.toggle('density-compact', prefs.density === 'compact');
  }, [prefs.lang, prefs.theme, prefs.density]);

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
      currency: 'LYD' as Currency,
      range,
      previous: previousRange(prefs.period),
      setLang: (lang) => update({ lang }),
      setTheme: (theme) => update({ theme }),
      toggleTheme: () => update((p) => ({ theme: p.theme === 'dark' ? 'light' : 'dark' })),
      setDensity: (density) => update({ density }),
      toggleSection: (k) => update((p) => ({ hidden: p.hidden.includes(k) ? p.hidden.filter((x) => x !== k) : [...p.hidden, k] })),
      showAllSections: () => update({ hidden: [] }),
      saveView: (name) =>
        update((p) => ({
          views: [...p.views, { id: `v${Date.now().toString(36)}`, name: name.trim().slice(0, 40) || 'View', period: p.period, platform: p.platform }].slice(-12),
        })),
      deleteView: (id) => update((p) => ({ views: p.views.filter((v) => v.id !== id) })),
      applyView: (id) =>
        update((p) => {
          const v = p.views.find((x) => x.id === id);
          return v ? { period: v.period, platform: v.platform } : {};
        }),
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

const ScopeContext = createContext<Currency | null>(null);

/** Everything rendered inside sees `useApp().currency` and `useDashboardData().data` for this currency. */
export function CurrencyScope({ currency, children }: { currency: Currency; children: React.ReactNode }) {
  return <ScopeContext.Provider value={currency}>{children}</ScopeContext.Provider>;
}

export function useCurrencyScope(): Currency {
  return useContext(ScopeContext) ?? 'LYD';
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  const scoped = useContext(ScopeContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return useMemo(() => (scoped && scoped !== ctx.currency ? { ...ctx, currency: scoped } : ctx), [ctx, scoped]);
}
