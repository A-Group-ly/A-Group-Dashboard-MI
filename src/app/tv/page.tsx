'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CurrencyScope, useApp } from '@/components/providers/AppProvider';
import { useAccess } from '@/components/providers/AccessProvider';
import { useDashboardData, type OverviewBundle } from '@/components/providers/DashboardDataProvider';
import { formatCurrency } from '@/lib/calculations';
import { formatRange } from '@/lib/period';
import { pctChange } from '@/lib/analytics';
import LineChart from '@/components/charts/LineChart';
import { shortDate } from '@/components/charts/chartUtils';
import Logo from '@/components/Logo';
import { ErrorState, PageSkeleton } from '@/components/ui/primitives';

const SLIDE_MS = 12000;
const REFRESH_MS = 60000;
const SLIDES = ['position', 'spending', 'trend', 'pulse'] as const;
type Slide = (typeof SLIDES)[number];

/** Big number that can be blurred for shared-screen safety. */
function Big({ value, hide, tone = '' }: { value: string; hide: boolean; tone?: string }) {
  return (
    <div dir="ltr" className={`whitespace-nowrap text-start font-head text-[clamp(1.25rem,9cqw,6rem)] font-bold leading-none tabular-nums tracking-tight transition-[filter] duration-200 rtl:text-end ${tone || 'text-ink'} ${hide ? 'select-none blur-md' : ''}`}>
      {value}
    </div>
  );
}

function Stat({ label, value, hide, tone }: { label: string; value: string; hide: boolean; tone?: string }) {
  return (
    <div className="min-w-0 border-s-[0.35vw] border-accent ps-[1.2vw] [container-type:inline-size]">
      <div className="text-[clamp(0.7rem,1.05vw,1.4rem)] font-bold uppercase tracking-[0.1em] text-muted">{label}</div>
      <Big value={value} hide={hide} tone={tone} />
    </div>
  );
}

function SlideBody({ slide, data, hide, chartHeight }: { slide: Slide; data: OverviewBundle; hide: boolean; chartHeight: number }) {
  const { currency, lang, t } = useApp();
  const fmt = (v: number) => formatCurrency(v, currency);
  const p = data.position;
  const s = data.spending;
  const o = data.overview;

  if (slide === 'position') {
    const change = pctChange(p.paid, p.paidPrevious);
    return (
      <div className="space-y-[clamp(1rem,3vh,3rem)]">
        <Stat label={t('pos.paid')} value={fmt(p.paid)} hide={hide} />
        <p dir="ltr" className={`text-[clamp(0.9rem,1.4vw,1.8rem)] font-bold ${change === null ? 'text-muted' : change >= 0 ? 'text-ok-ink' : 'text-bad-ink'}`}>
          {change === null ? `[${t('cmp.na')}]` : `[${change > 0 ? '+' : ''}${change.toFixed(1)}%]`} <span className="font-normal text-muted">{t('scope.vs')} {hide ? '•••' : fmt(p.paidPrevious)}</span>
        </p>
        <Stat label={t('pos.outstanding')} value={fmt(p.outstanding)} hide={hide} tone={p.overdue > 0 ? 'text-bad-ink' : ''} />
        <Stat label={t('pos.expected')} value={fmt(p.expectedByMonthEnd)} hide={hide} />
      </div>
    );
  }
  if (slide === 'spending') {
    const pct = s.budgetConfigured && s.budgetCap > 0 ? (s.projected / s.budgetCap) * 100 : null;
    const share = pct === null ? null : Math.min(100, pct);
    return (
      <div className="space-y-[clamp(1rem,3vh,3rem)]">
        <Stat label={t('pos.spent')} value={fmt(s.spentToDate)} hide={hide} />
        <Stat label={t('pos.spendScheduled')} value={fmt(s.scheduledToMonthEnd)} hide={hide} />
        <Stat label={t('pos.spendProjected')} value={fmt(s.projected)} hide={hide} tone={s.budgetConfigured && s.projected > s.budgetCap ? 'text-bad-ink' : ''} />
        {share !== null && (
          <div>
            <div className="h-4 w-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(share)} aria-valuemin={0} aria-valuemax={100} aria-label={t('pos.ofBudget')}>
              <div className={`h-full transition-all duration-700 ${s.projected > s.budgetCap ? 'bg-bad-ink' : 'bg-accent'}`} style={{ width: `${share}%` }} />
            </div>
            <div className="mt-1 text-sm text-muted"><span dir="ltr" className="tabular-nums">{(pct ?? share).toFixed(0)}%</span> {t('pos.ofBudget')}</div>
          </div>
        )}
      </div>
    );
  }
  if (slide === 'trend') {
    const pts = data.series.points;
    return (
      <div className={`min-w-0 ${hide ? 'blur-md' : ''}`}>
        <LineChart
          labels={pts.map((x) => shortDate(x.start, lang, data.series.bucket))}
          series={[
            { key: 'inc', name: t('tx.income'), color: 'var(--chart-2)', values: pts.map((x) => x.income) },
            { key: 'exp', name: t('tx.expense'), color: 'var(--chart-1)', values: pts.map((x) => x.expenses) },
          ]}
          format={fmt}
          ariaLabel={`${t('chart.trend')} — ${currency}`}
          height={chartHeight}
        />
        <div className="mt-6 grid grid-cols-2 gap-[clamp(1rem,2vw,3rem)] [&>*]:min-w-0">
          <Stat label={t('tx.income')} value={fmt(o.totalIncome.current)} hide={hide} />
          <Stat label={t('tx.expense')} value={fmt(o.totalExpenses.current)} hide={hide} />
        </div>
      </div>
    );
  }
  return null;
}

export default function TvPage() {
  const router = useRouter();
  const { t, lang, range, period } = useApp();
  const { can, loading: accessLoading, errorStatus } = useAccess();
  const { all, pulse, status, lastSuccessAt, refresh } = useDashboardData();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hide, setHide] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [isFs, setIsFs] = useState(false);
  const [vh, setVh] = useState(800);

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    router.push('/');
  }, [router]);

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  // Track full screen and the real viewport height so the layout (and the chart) re-fit when either changes.
  useEffect(() => {
    const measure = () => {
      setIsFs(!!document.fullscreenElement);
      setVh(window.innerHeight);
    };
    measure();
    document.addEventListener('fullscreenchange', measure);
    window.addEventListener('resize', measure);
    return () => {
      document.removeEventListener('fullscreenchange', measure);
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Rotate slides, refresh data and keep the clock honest.
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => window.clearInterval(id);
  }, [paused]);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden) refresh();
      setNow(Date.now());
    }, REFRESH_MS);
    const tick = window.setInterval(() => setNow(Date.now()), 15000);
    return () => {
      window.clearInterval(id);
      window.clearInterval(tick);
    };
  }, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exit();
      else if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % SLIDES.length);
      else if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + SLIDES.length) % SLIDES.length);
      else if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key.toLowerCase() === 'h') setHide((h) => !h);
      else if (e.key.toLowerCase() === 'f') fullscreen();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [exit]);

  if (accessLoading) return <PageSkeleton />;
  if (errorStatus !== null || !can('dashboard:view')) return <div className="p-8"><ErrorState message={t('err.forbidden')} onRetry={exit} /></div>;
  if (!all || !pulse) return status === 'error' ? <div className="p-8"><ErrorState message={t('err.server')} onRetry={refresh} /></div> : <PageSkeleton />;

  const slide = SLIDES[idx];
  const stale = lastSuccessAt !== null && now - lastSuccessAt > 3 * REFRESH_MS;
  const periodText = formatRange(range, lang, period.granularity);
  const title = { position: t('pos.title'), spending: t('pos.spendTitle'), trend: t('chart.trend'), pulse: t('pulse.title') }[slide];

  return (
    <main className="flex min-h-dvh flex-col overflow-x-hidden bg-bg p-4 text-ink sm:p-6 2xl:p-10" aria-label={t('tv.title')}>
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <Logo className="h-10 w-10 text-ink" />
        <div className="min-w-0">
          <h1 className="font-head text-xl font-bold sm:text-2xl">{title}</h1>
          <p className="text-xs text-muted sm:text-sm" dir="auto">A-Group · {periodText} · <span dir="ltr" className="tabular-nums">{lastSuccessAt ? new Date(lastSuccessAt).toLocaleTimeString(lang === 'ar' ? 'ar-LY-u-nu-latn' : 'en-GB') : '—'}</span></p>
        </div>
        {stale && <span role="alert" className="bg-warn px-2 py-1 text-xs font-bold text-black">{t('tv.stale')}</span>}
        <div className="ms-auto flex flex-wrap items-center gap-2 text-xs">
          <button type="button" onClick={() => setPaused((p) => !p)} className="border border-line-strong bg-surface px-3 py-1.5 font-semibold transition-colors hover:bg-surface-2">{paused ? `▶ ${t('tv.play')}` : `❚❚ ${t('tv.pause')}`}</button>
          <button type="button" onClick={() => setHide((h) => !h)} aria-pressed={hide} className="border border-line-strong bg-surface px-3 py-1.5 font-semibold transition-colors hover:bg-surface-2">{hide ? t('tv.show') : t('tv.hide')}</button>
          <button type="button" onClick={fullscreen} className="border border-line-strong bg-surface px-3 py-1.5 font-semibold transition-colors hover:bg-surface-2">{isFs ? t('tv.exitFullscreen') : t('tv.fullscreen')}</button>
          <button type="button" onClick={exit} className="border border-ink bg-ink px-3 py-1.5 font-semibold text-ink-contrast transition-opacity hover:opacity-85">{t('tv.exit')}</button>
        </div>
      </header>

      <div className="flex flex-1 flex-col justify-center gap-[clamp(1rem,3vh,3rem)]">
      {slide === 'pulse' ? (
        <section aria-live="polite" className="grid grid-cols-1 gap-[clamp(1.5rem,4vh,4rem)] md:grid-cols-2">
          <Stat label={t('pulse.customers')} value={pulse.customers.toLocaleString('en-US')} hide={false} />
          <Stat label={t('pulse.activeSubs')} value={pulse.subscriptions.active.toLocaleString('en-US')} hide={false} />
          <Stat label={`${t('pulse.mrr')} · USD`} value={formatCurrency(pulse.mrr.USD, 'USD')} hide={hide} />
          <Stat label={`${t('pulse.mrr')} · LYD`} value={formatCurrency(pulse.mrr.LYD, 'LYD')} hide={hide} />
          <Stat label={t('status.past_due')} value={pulse.subscriptions.pastDue.toLocaleString('en-US')} hide={false} tone={pulse.subscriptions.pastDue ? 'text-bad-ink' : ''} />
          <Stat label={t('pulse.newInPeriod')} value={`+${pulse.newCustomers.toLocaleString('en-US')}`} hide={false} tone="text-ok-ink" />
        </section>
      ) : (
        /* Physical order is fixed in both languages: USD on the left, LYD on the right. */
        <section dir="ltr" aria-live="polite" className="grid grid-cols-1 gap-[clamp(2rem,5vw,6rem)] lg:grid-cols-2">
          {(['USD', 'LYD'] as const).map((c) => (
            <CurrencyScope key={c} currency={c}>
              <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-w-0 overflow-hidden">
                <div className="mb-5 flex items-baseline justify-between border-b-2 border-ink pb-2">
                  <span dir="ltr" className="font-head text-[clamp(1.25rem,2.2vw,3rem)] font-bold">{c}</span>
                  <span className="text-[clamp(0.8rem,1.1vw,1.5rem)] font-semibold text-muted">{t(c === 'USD' ? 'cur.usd' : 'cur.lyd')}</span>
                </div>
                <SlideBody slide={slide} data={all[c]} hide={hide} chartHeight={Math.max(200, Math.min(620, Math.round(vh * 0.34)))} />
              </div>
            </CurrencyScope>
          ))}
        </section>
      )}

      </div>

      <nav aria-label={t('tv.slides')} className="mt-6 flex items-center justify-center gap-2">
        {SLIDES.map((s, i) => (
          <button key={s} type="button" onClick={() => setIdx(i)} aria-label={`${i + 1}`} aria-current={i === idx} className={`h-2.5 transition-all duration-300 ${i === idx ? 'w-10 bg-accent' : 'w-2.5 bg-line-strong hover:bg-muted'}`} />
        ))}
      </nav>
      {!isFs && <p className="mt-4 text-center text-[11px] text-muted">{t('tv.keys')}</p>}
    </main>
  );
}
