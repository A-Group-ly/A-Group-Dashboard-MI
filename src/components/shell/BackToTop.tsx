'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';

/** Floating "back to top" button, shown after scrolling down on long pages. */
export default function BackToTop() {
  const { t } = useApp();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={t('act.top')}
      title={t('act.top')}
      className="no-print fixed bottom-5 end-5 z-40 grid h-11 w-11 place-items-center border border-line-strong bg-surface text-lg text-ink shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:bg-accent hover:text-black"
    >
      <span aria-hidden="true">↑</span>
    </button>
  );
}
