'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useAnchoredPopover } from './useAnchoredPopover';

/**
 * "Filters" button with a badge for the number of active filters; opens a panel that always stays on screen
 * (any width, LTR or RTL). Closes on outside click or Escape.
 */
export default function FilterPopover({ count, onReset, children, width = 360, title }: { count: number; onReset?: () => void; children: React.ReactNode; width?: number; title?: string }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useAnchoredPopover(open, trigger, width);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex items-center gap-2 border px-3 py-1.5 text-xs font-semibold transition-colors ${open || count > 0 ? 'border-ink bg-surface-2 text-ink' : 'border-line-strong bg-surface text-ink hover:bg-surface-2'}`}
      >
        <span aria-hidden="true">⚙</span>
        {t('flt.button')}
        {count > 0 && <span dir="ltr" className="grid min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-[18px] text-black">{count}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label={title ?? t('flt.button')} style={pop} className="z-50 border border-line-strong bg-surface text-ink shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
            <span className="font-head text-sm font-bold">{title ?? t('flt.button')}</span>
            {onReset && count > 0 && (
              <button type="button" onClick={onReset} className="text-xs font-semibold text-accent-strong hover:underline">{t('flt.reset')}</button>
            )}
          </div>
          <div className="space-y-4 px-4 py-4">{children}</div>
          <div className="flex justify-end border-t border-line px-4 py-2.5">
            <button type="button" onClick={() => setOpen(false)} className="border border-ink bg-ink px-3.5 py-1.5 text-xs font-semibold text-ink-contrast hover:opacity-85">{t('flt.done')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Label above a control inside the panel. */
export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block [&_input]:w-full [&_select]:w-full">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</span>
      {children}
    </div>
  );
}
