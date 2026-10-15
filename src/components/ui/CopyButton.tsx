'use client';

import React, { useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useToast } from '@/components/providers/ToastProvider';

/** Small "copy" control for ids, emails and invoice numbers. Falls back silently where the clipboard is blocked. */
export default function CopyButton({ value, label }: { value: string; label?: string }) {
  const { t } = useApp();
  const toast = useToast();
  const [done, setDone] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      toast.success(t('copy.done'));
      window.setTimeout(() => setDone(false), 1500);
    } catch {
      toast.error(t('copy.failed'));
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${t('copy.label')}${label ? `: ${label}` : ''}`}
      title={t('copy.label')}
      className="ms-1.5 inline-grid h-5 w-5 place-items-center border border-transparent align-middle text-[11px] text-muted transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink"
    >
      <span aria-hidden="true">{done ? '✓' : '⧉'}</span>
    </button>
  );
}
