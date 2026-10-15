'use client';

import React, { useState } from 'react';
import { SECTIONS, useApp, type SectionKey } from '@/components/providers/AppProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button, Modal } from '@/components/ui/forms';
import { controlClass } from '@/components/ui/primitives';

/** Saved views: remember a period + platform scope under a name and re-apply it with one click. */
export function SavedViews() {
  const { t, views, saveView, deleteView, applyView } = useApp();
  const toast = useToast();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const commit = () => {
    if (!name.trim()) return;
    saveView(name);
    toast.success(t('view.saved'));
    setName('');
    setNaming(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {views.length > 0 && (
        <select
          aria-label={t('view.apply')}
          value=""
          onChange={(e) => {
            if (e.target.value) applyView(e.target.value);
          }}
          className={controlClass}
        >
          <option value="">{t('view.apply')}</option>
          {views.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      )}
      {naming ? (
        <span className="inline-flex items-center gap-1.5">
          <input
            autoFocus
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setNaming(false);
            }}
            placeholder={t('view.name')}
            aria-label={t('view.name')}
            className={`${controlClass} w-36`}
          />
          <Button onClick={commit} disabled={!name.trim()}>{t('act.save')}</Button>
          <Button variant="secondary" onClick={() => setNaming(false)}>{t('act.cancel')}</Button>
        </span>
      ) : (
        <button type="button" onClick={() => setNaming(true)} className="text-xs font-semibold text-accent-strong transition-colors hover:underline">
          ★ {t('view.save')}
        </button>
      )}
      {views.length > 0 && (
        <details className="relative">
          <summary className="cursor-pointer list-none text-xs font-semibold text-muted transition-colors hover:text-ink">{t('view.manage')}</summary>
          <ul className="absolute start-0 z-20 mt-1 w-56 max-w-[calc(100vw-2rem)] border border-line bg-surface p-1 shadow-lg">
            {views.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 px-2 py-1 text-xs">
                <span className="break-words text-ink" title={v.name}>{v.name}</span>
                <button type="button" onClick={() => deleteView(v.id)} className="shrink-0 font-semibold text-bad-ink hover:underline">{t('act.delete')}</button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Choose which overview sections are shown (stored in this browser). */
export function CustomizeButton() {
  const { t, hidden, toggleSection, showAllSections } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>⚙ {t('cz.button')}</Button>
      <Modal open={open} title={t('cz.title')} onClose={() => setOpen(false)}>
        <p className="mb-3 text-xs text-muted">{t('cz.hint')}</p>
        <ul className="divide-y divide-line border border-line">
          {SECTIONS.map((k: SectionKey) => (
            <li key={k}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-surface-2">
                <input type="checkbox" checked={!hidden.includes(k)} onChange={() => toggleSection(k)} className="h-4 w-4 accent-[var(--accent)]" />
                <span>{t(`cz.${k}`)}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={showAllSections}>{t('cz.reset')}</Button>
          <Button onClick={() => setOpen(false)}>{t('act.close')}</Button>
        </div>
      </Modal>
    </>
  );
}
