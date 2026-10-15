'use client';

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

/**
 * Position a popover under its trigger but always inside the viewport (any screen width, LTR or RTL).
 * The panel is `position: fixed`, aligned to the trigger's inline end, then clamped 8px from both screen edges.
 */
export function useAnchoredPopover(open: boolean, trigger: RefObject<HTMLElement | null>, width: number): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', visibility: 'hidden' });

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = trigger.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const w = Math.min(width, vw - 16);
      const rtl = document.documentElement.dir === 'rtl';
      const preferred = rtl ? r.left : r.right - w;
      const left = Math.max(8, Math.min(preferred, vw - w - 8));
      setStyle({ position: 'fixed', top: Math.round(r.bottom + 8), left: Math.round(left), width: w, maxHeight: `calc(100dvh - ${Math.round(r.bottom + 16)}px)`, overflowY: 'auto', visibility: 'visible' });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, trigger, width]);

  return style;
}
