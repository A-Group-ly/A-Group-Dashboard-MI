'use client';

import React, { forwardRef } from 'react';
import { useApp } from '@/components/providers/AppProvider';

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (v: string) => void;
  /** Show a small spinner (a request for this search is running). */
  busy?: boolean;
  /** Called when the user presses Enter. */
  onSubmit?: () => void;
}

/**
 * Search field used everywhere: magnifier, clear button, spinner while loading, Esc clears (or lets go of focus when
 * already empty), mobile "search" key, no autofill / spell-check noise. Text direction follows what the user types.
 */
const SearchBox = forwardRef<HTMLInputElement, Props>(function SearchBox({ value, onChange, busy, onSubmit, className = '', placeholder, ...rest }, ref) {
  const { t } = useApp();
  return (
    <div className={`relative ${className}`}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-muted">
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="M13 13l4 4" />
        </svg>
      </span>
      <input
        ref={ref}
        {...rest}
        type="text"
        role={rest.role ?? 'searchbox'}
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        dir="auto"
        value={value}
        placeholder={placeholder ?? t('f.search')}
        aria-label={rest['aria-label'] ?? placeholder ?? t('f.search')}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          rest.onKeyDown?.(e);
          if (e.defaultPrevented) return;
          if (e.key === 'Escape') {
            if (value) {
              e.preventDefault();
              e.stopPropagation();
              onChange('');
            } else (e.currentTarget as HTMLInputElement).blur();
          } else if (e.key === 'Enter') onSubmit?.();
        }}
        className="h-9 w-full border border-line-strong bg-surface ps-9 pe-9 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <span className="absolute inset-y-0 end-2 flex items-center">
        {busy ? (
          <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted border-t-transparent" />
        ) : value ? (
          <button type="button" onClick={() => onChange('')} aria-label={t('act.clear')} title={t('act.clear')} className="grid h-6 w-6 place-items-center text-muted hover:text-ink">
            <span aria-hidden="true">✕</span>
          </button>
        ) : null}
      </span>
    </div>
  );
});

export default SearchBox;
