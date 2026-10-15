'use client';

import React, { useCallback, useEffect, useState } from 'react';

export interface TabDef<K extends string> {
  key: K;
  label: string;
}

/**
 * Accessible tab bar (arrow keys, Home / End). Scrolls sideways on narrow screens instead of wrapping.
 * `storageKey` remembers the last tab in this browser; the saved value is applied after mount so server and
 * client render the same first paint.
 */
export function useRememberedTab<K extends string>(storageKey: string, valid: readonly K[], fallback: K): [K, (k: K) => void] {
  const [tab, setTab] = useState<K>(fallback);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey) as K | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the saved tab after mount (storage is client-only)
      if (saved && valid.includes(saved)) setTab(saved);
    } catch {
      /* storage unavailable: stays on the default */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once
  }, []);
  const choose = useCallback(
    (k: K) => {
      setTab(k);
      try {
        window.localStorage.setItem(storageKey, k);
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );
  return [tab, choose];
}

export default function Tabs<K extends string>({ tabs, value, onChange, label }: { tabs: TabDef<K>[]; value: K; onChange: (k: K) => void; label: string }) {
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const next = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
    if (next === null) return;
    // In right-to-left pages the arrows are mirrored.
    const dir = document.documentElement.dir === 'rtl' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') ? -1 : 1;
    const target = next === 0 || next === tabs.length - 1 ? next : i + (next - i) * dir;
    const idx = (target + tabs.length) % tabs.length;
    e.preventDefault();
    onChange(tabs[idx].key);
    (e.currentTarget.parentElement?.children[idx] as HTMLElement | undefined)?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="no-print mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab, i) => (
        <button
          key={tab.key}
          role="tab"
          type="button"
          aria-selected={value === tab.key}
          tabIndex={value === tab.key ? 0 : -1}
          onClick={() => onChange(tab.key)}
          onKeyDown={(e) => onKey(e, i)}
          className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${value === tab.key ? 'border-accent text-accent-strong' : 'border-transparent text-muted hover:text-ink'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
