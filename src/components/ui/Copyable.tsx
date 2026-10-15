'use client';

import React from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useToast } from '@/components/providers/ToastProvider';

/**
 * Click-to-copy text (names, ids, emails, phone numbers, invoice numbers). Read-only text in the app shows a normal
 * pointer and cannot be dragged into a selection; items that are worth copying show a "copy" cursor instead.
 */
export default function Copyable({ value, children, className = '', label }: { value: string; children?: React.ReactNode; className?: string; label?: string }) {
  const { t } = useApp();
  const toast = useToast();

  const copy = async (e: React.SyntheticEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${t('copy.done')}: ${value.length > 40 ? `${value.slice(0, 40)}…` : value}`);
    } catch {
      toast.error(t('copy.failed'));
    }
  };

  return (
    <span
      role="button"
      tabIndex={0}
      data-copy
      title={`${t('copy.click')}${label ? ` (${label})` : ''}`}
      onClick={copy}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          void copy(e);
        }
      }}
      className={`rounded-sm transition-colors hover:bg-accent-soft hover:text-accent-strong focus-visible:bg-accent-soft ${className}`}
    >
      {children ?? value}
    </span>
  );
}
