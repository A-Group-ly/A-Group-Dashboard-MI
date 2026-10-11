'use client';

import React from 'react';
import { Language } from '@/types/dashboard';
import { translations } from '@/lib/translations';

interface SidebarProps {
  language: Language;
  currentPlatform: string;
  onSelectPlatform: (platform: string) => void;
}

export default function Sidebar({ language, currentPlatform, onSelectPlatform }: SidebarProps) {
  const t = translations[language];

  const menuItems = [
    { id: 'all', label: t.overview, count: null },
    { id: 'A-Stay', label: t.astay, count: 'Stay' },
    { id: 'A-Market', label: t.amarket, count: 'B2B' },
    { id: 'A-Space', label: t.aspace, count: 'Hub' },
    { id: 'Tech Infrastructure', label: t.expensesTab, count: 'SaaS' },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between shrink-0 min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-8 px-1">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-500/20">
            A
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-base tracking-tight leading-tight">
              A-Group Holding
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t.brandSubtitle}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          <div className="px-2 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            {t.platforms}
          </div>
          {menuItems.map((item) => {
            const active = currentPlatform === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPlatform(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {item.count && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Operational Badge */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-slate-700 dark:text-slate-300">HQ Tripoli / Znata</span>
        </div>
        <p className="text-[11px] text-slate-400">Next.js App Router • v1.0 MVP</p>
      </div>
    </aside>
  );
}