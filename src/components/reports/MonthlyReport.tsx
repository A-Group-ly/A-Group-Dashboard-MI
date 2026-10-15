'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import { useApiData } from '@/components/providers/useApiData';
import { mapApiTransaction, type ApiTransaction } from '@/lib/mapApi';
import { formatCurrency } from '@/lib/calculations';
import { formatRange } from '@/lib/period';
import { monthInNumbers, pctChange } from '@/lib/analytics';
import { ErrorState, PageSkeleton } from '@/components/ui/primitives';
import type { Currency, Transaction } from '@/types/dashboard';

/* ---------- draft (manager-written text, kept in this browser only) ---------- */

interface Proposal {
  id: string;
  proposal: string;
  why: string;
  impact: string;
  cost: string;
  priority: 'high' | 'medium' | 'low';
  decision: '' | 'approve' | 'decline';
}

interface Draft {
  dept: string;
  preparedBy: string;
  forWho: string;
  issued: string;
  problems: string;
  team: string;
  strengths: string;
  weaknesses: string;
  proposals: Proposal[];
}

const EMPTY: Draft = { dept: '', preparedBy: '', forWho: '', issued: '', problems: '', team: '', strengths: '', weaknesses: '', proposals: [] };

const inputCls =
  'w-full border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-ink transition-colors focus:border-accent focus:outline-none print:border-0 print:p-0';

/** Wrapped in LRI/PDI so the sign and % keep their order inside Arabic sentences. */
function pctText(change: number | null, na: string): string {
  const body = change === null ? na : `${change > 0 ? '+' : ''}${change.toFixed(0)}%`;
  return `⁦[${body}]⁩`;
}

function Section({ title, children, breakBefore }: { title: string; children: React.ReactNode; breakBefore?: boolean }) {
  return (
    <section className={`mb-8 ${breakBefore ? 'print-break' : ''}`}>
      <h2 className="mb-3 border-b-2 border-ink pb-1.5 font-head text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 mt-5 bg-header px-3 py-1.5 font-head text-xs font-bold uppercase tracking-wider text-header-ink first:mt-0">{children}</div>;
}

export default function MonthlyReport() {
  const { t, tr, lang, range, previous, period } = useApp();
  const { all, loading, error, refresh } = useDashboardData();
  // Items still to be paid (pending / upcoming) in the period: a small, server-filtered list. Totals never come from rows.
  const pendingState = useApiData<{ data: ApiTransaction[]; total: number }>(
    `/api/transactions?${new URLSearchParams({ from: range.from, to: range.to, status: 'PENDING,UPCOMING', pageSize: '100', sort: 'date', dir: 'asc' })}`
  );
  const draftKey = `ag_report_draft_v2_${range.from}_${range.to}`;

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // Load the saved draft for this period (after mount; storage is client-only).
  useEffect(() => {
    let saved: Draft = EMPTY;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (raw) saved = { ...EMPTY, ...JSON.parse(raw) };
    } catch {
      /* ignore corrupt or unavailable storage */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate draft from localStorage when the period changes
    setDraft(saved);
    setLoadedKey(draftKey);
  }, [draftKey]);

  const update = (patch: Partial<Draft>) =>
    setDraft((d) => {
      const next = { ...d, ...patch };
      if (loadedKey === draftKey) {
        try {
          window.localStorage.setItem(draftKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
      return next;
    });

  if (loading) return <PageSkeleton />;
  if (!all) return <ErrorState message={error ?? t('err.server')} onRetry={refresh} />;

  const na = t('cmp.na');
  const periodText = formatRange(range, lang, period.granularity);
  const prevText = formatRange(previous, lang, period.granularity === 'custom' ? undefined : period.granularity);
  const txAll: Transaction[] = pendingState.data ? pendingState.data.data.map(mapApiTransaction) : [];
  const statusLabel = (s: string) => (s === 'upcoming' ? tr.statusUpcoming : tr.statusPending);

  /** Everything the report says about ONE currency. Currencies are never combined. */
  const build = (cur: Currency) => {
    const data = all[cur];
    const overview = data.overview;
    const fmt = (n: number) => formatCurrency(n, cur);
    const rows = monthInNumbers(overview, cur);
    const cap = data.meta.budgetCap;
    const budgetPct = data.meta.budgetConfigured && cap > 0 ? (overview.totalExpenses.current / cap) * 100 : null;

    const netChange = pctChange(overview.netResult.current, overview.netResult.previous);
    const incomeChange = pctChange(overview.totalIncome.current, overview.totalIncome.previous);
    const expChange = pctChange(overview.totalExpenses.current, overview.totalExpenses.previous);
    const headline = `${t('mr.headlineNet')} ${fmt(overview.netResult.current)} ${netChange === null ? `(${t('mr.noComparison')})` : pctText(netChange, na)}`;
    const resultsLine = `${tr.kpiIncome}: ${fmt(overview.totalIncome.current)} ${t('scope.vs')} ${fmt(overview.totalIncome.previous)} ${pctText(incomeChange, na)} · ${tr.kpiExpenses}: ${fmt(
      overview.totalExpenses.current
    )} ${t('scope.vs')} ${fmt(overview.totalExpenses.previous)} ${pctText(expChange, na)}`;

    const autoProblems: string[] = [];
    if (budgetPct !== null && budgetPct > 100) autoProblems.push(`${t('mr.negBudgetOver')} (${budgetPct.toFixed(0)}%)`);
    else if (budgetPct !== null && budgetPct >= 80) autoProblems.push(`${t('mr.negBudgetNear')} (${budgetPct.toFixed(0)}%)`);
    if (data.position.overdueCount > 0) autoProblems.push(`${t('status.overdue')}: ${fmt(data.position.overdue)} (${data.position.overdueCount})`);
    if (overview.pendingIncomeTotal > 0) autoProblems.push(`${t('mr.negPending')}: ${fmt(overview.pendingIncomeTotal)}`);

    const positives: string[] = [];
    const negatives: string[] = [...autoProblems];
    if (incomeChange !== null) (incomeChange >= 0 ? positives : negatives).push(incomeChange >= 0 ? t('mr.posIncomeUp') : t('mr.negIncomeDown'));
    if (expChange !== null) (expChange <= 0 ? positives : negatives).push(expChange <= 0 ? t('mr.posExpDown') : t('mr.negExpUp'));
    if (budgetPct !== null && budgetPct < 80) positives.push(t('mr.posBudgetOk'));

    const previousIncomeByPlatform = new Map(data.breakdown.incomeByPlatform.map((b) => [b.label, b.previous]));
    const delivered = data.platforms.map((p) => ({
      p: p.name,
      incNow: p.income,
      incPrev: previousIncomeByPlatform.get(p.name) ?? 0,
      expNow: p.expense,
      nInc: p.incomeCount,
      nExp: p.expenseCount,
      topInc: p.topIncome ? ([lang === 'ar' ? p.topIncome.categoryAr : p.topIncome.category, p.topIncome.amount] as [string, number]) : undefined,
      topExp: p.topExpense ? ([lang === 'ar' ? p.topExpense.categoryAr : p.topExpense.category, p.topExpense.amount] as [string, number]) : undefined,
    }));

    const sourceRows: [string, number][] = [
      [tr.kpiIncome, overview.totalIncome.current],
      [tr.kpiExpenses, overview.totalExpenses.current],
      [tr.kpiNetResult, overview.netResult.current],
      [tr.kpiCashCollected, overview.cashCollected.current],
      [tr.kpiPendingIncome, overview.pendingIncomeTotal],
      [tr.upcomingObligations, overview.upcomingObligationsTotal],
      [t('pos.paid'), data.position.paid],
      [t('pos.outstanding'), data.position.outstanding],
    ];
    return { cur, fmt, rows, headline, resultsLine, autoProblems, positives, negatives, delivered, sourceRows };
  };
  const blocks = (['USD', 'LYD'] as const).map(build);

  /* ---- carried over: anything not yet paid in the period (each row keeps its own currency) ---- */
  const carried = txAll.filter((x) => x.status !== 'paid').sort((a, b) => a.date.localeCompare(b.date));
  const anyProblems = blocks.some((b) => b.autoProblems.length > 0);

  const addProposal = () =>
    update({ proposals: [...draft.proposals, { id: String(Date.now()), proposal: '', why: '', impact: '', cost: '', priority: 'medium', decision: '' }] });
  const patchProposal = (id: string, patch: Partial<Proposal>) => update({ proposals: draft.proposals.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  return (
    <article aria-label={t('mr.title')}>
      <div className="no-print mb-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => window.print()} className="border border-ink bg-ink px-3 py-1.5 text-xs font-semibold text-ink-contrast transition-all duration-150 hover:opacity-85 active:scale-95">
          {t('mr.print')}
        </button>
        <p className="text-xs text-muted">{t('mr.draftNote')}</p>
      </div>

      <header className="mb-8 bg-header px-6 py-6 text-header-ink">
        <div className="flex flex-wrap justify-between gap-2 text-xs text-header-ink/70">
          <span className="font-semibold">A-Group</span>
          <span dir="auto">{draft.dept || t('mr.deptDefault')} · {periodText}</span>
        </div>
        <h1 className="mt-6 font-head text-3xl font-bold">{draft.dept || t('mr.deptDefault')}</h1>
        <div className="mt-2 h-[3px] w-24 bg-accent" aria-hidden="true" />
        <p className="mt-3 text-lg font-semibold" dir="auto">{periodText}</p>
        <p className="text-sm text-header-ink/70">{t('mr.reportTo')}</p>
        <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-header-line pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-header-ink/60">{t('mr.period')}</dt>
            <dd dir="auto" className="mt-1 font-semibold">{periodText} <span className="text-header-ink/60">({t('scope.vs')} {prevText})</span></dd>
          </div>
          {(
            [
              ['dept', t('mr.dept')],
              ['preparedBy', t('mr.preparedBy')],
              ['forWho', t('mr.for')],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <dt className="text-[11px] uppercase tracking-wider text-header-ink/60">{label}</dt>
              <dd className="mt-1">
                <input aria-label={label} value={draft[k]} onChange={(e) => update({ [k]: e.target.value })} className="w-full border-b border-header-line bg-transparent py-0.5 text-sm font-semibold text-header-ink placeholder:text-header-ink/40 focus:border-accent focus:outline-none" placeholder="…" />
              </dd>
            </div>
          ))}
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-header-ink/60">{t('mr.issued')}</dt>
            <dd className="mt-1">
              <input type="date" aria-label={t('mr.issued')} value={draft.issued} onChange={(e) => update({ issued: e.target.value })} className="w-full border-b border-header-line bg-transparent py-0.5 text-sm font-semibold text-header-ink focus:border-accent focus:outline-none" />
            </dd>
          </div>
        </dl>
      </header>

      <Section title={t('mr.exec')}>
        <dl className="divide-y divide-line border-y border-line text-sm">
          {[
            [t('mr.headline'), <div key="h" className="space-y-1">{blocks.map((b) => <p key={b.cur} dir="auto" className="font-semibold"><span dir="ltr" className="me-2 text-xs text-muted">{b.cur}</span>{b.headline}</p>)}</div>],
            [t('mr.results'), <div key="r" className="space-y-1">{blocks.map((b) => <p key={b.cur} dir="auto"><span dir="ltr" className="me-2 text-xs text-muted">{b.cur}</span>{b.resultsLine}</p>)}</div>],
            [
              t('mr.problems'),
              <div key="p" className="space-y-1">
                {!anyProblems && !draft.problems && <p className="text-muted">{t('mr.noIssues')}</p>}
                {blocks.flatMap((b) => b.autoProblems.map((p) => <p key={`${b.cur}-${p}`}>– <span dir="ltr" className="text-xs text-muted">{b.cur}</span> {p}</p>))}
                <textarea aria-label={t('mr.problems')} rows={2} value={draft.problems} onChange={(e) => update({ problems: e.target.value })} placeholder={t('mr.writeHere')} className={inputCls} />
              </div>,
            ],
            [
              t('mr.team'),
              <div key="t">
                {!draft.team && <p className="mb-1 text-muted">{t('mr.teamNa')}</p>}
                <textarea aria-label={t('mr.team')} rows={2} value={draft.team} onChange={(e) => update({ team: e.target.value })} placeholder={t('mr.writeHere')} className={inputCls} />
              </div>,
            ],
            [t('mr.decision'), <span key="d">{draft.proposals.length === 0 ? t('mr.decisionNone') : `${draft.proposals.length} ${t('mr.decisionSome')}`}</span>],
          ].map(([label, body], i) => (
            <div key={i} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="font-bold text-ink">{label}</dt>
              <dd className="text-ink-2">{body}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={t('mr.numbers')} breakBefore>
        {blocks.map((b) => (
          <div key={b.cur} className="mb-6 last:mb-0">
            <Pill>{b.cur}</Pill>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-ink text-xs text-muted">
                    <th scope="col" className="px-3 py-2 text-start font-semibold">{t('mr.metric')}</th>
                    <th scope="col" className="px-3 py-2 text-end font-semibold">{t('mr.last')}</th>
                    <th scope="col" className="px-3 py-2 text-end font-semibold">{t('mr.this')}</th>
                    <th scope="col" className="px-3 py-2 text-end font-semibold">{t('mr.chg')}</th>
                    <th scope="col" className="px-3 py-2 text-end font-semibold">{t('mr.target')}</th>
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r) => {
                    const hasPrev = Number.isFinite(r.metric.previous);
                    return (
                      <tr key={r.key} className="border-b border-line transition-colors hover:bg-surface-2">
                        <td className="px-3 py-3 font-bold text-ink">{(tr as Record<string, string>)[r.labelKey]}</td>
                        <td dir="ltr" className="px-3 py-3 text-end tabular-nums">{hasPrev ? b.fmt(r.metric.previous) : na}</td>
                        <td dir="ltr" className="px-3 py-3 text-end font-semibold tabular-nums">{b.fmt(r.metric.current)}</td>
                        <td dir="ltr" className="px-3 py-3 text-end font-bold tabular-nums">{hasPrev ? pctText(pctChange(r.metric.current, r.metric.previous), na) : na}</td>
                        <td className="px-3 py-3 text-end text-muted">{t('mr.targetNone')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </Section>

      <Section title={t('mr.delivered')}>
                {blocks.map((b) =>
          b.delivered.map((d) => (
            <div key={`${b.cur}-${d.p}`}>
              <Pill>{d.p} · {b.cur}</Pill>
              <p className="mb-1 text-xs italic text-muted">{t('mr.deliveredLine')}</p>
              <ul className="space-y-1 ps-4 text-sm">
                <li>– {tr.income}: <span dir="ltr" className="font-semibold tabular-nums">{b.fmt(d.incNow)}</span> {pctText(pctChange(d.incNow, d.incPrev), na)} · {d.nInc}</li>
                <li>– {tr.expenses}: <span dir="ltr" className="font-semibold tabular-nums">{b.fmt(d.expNow)}</span> · {d.nExp}</li>
                {d.topInc && <li>– {tr.income} / {d.topInc[0]}: <span dir="ltr" className="tabular-nums">{b.fmt(d.topInc[1])}</span></li>}
                {d.topExp && <li>– {tr.expenses} / {d.topExp[0]}: <span dir="ltr" className="tabular-nums">{b.fmt(d.topExp[1])}</span></li>}
              </ul>
            </div>
          ))
        )}
      </Section>

      <Section title={t('mr.carried')} breakBefore>
        {carried.length === 0 ? (
          <p className="text-sm text-muted">{t('mr.carriedNone')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-ink text-xs text-muted">
                  {[t('mr.task'), t('mr.owner'), t('mr.targetDate'), t('mr.note')].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 text-start font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carried.map((x) => (
                  <tr key={x.id} className="border-b border-line transition-colors hover:bg-surface-2">
                    <td className="px-3 py-3 font-semibold text-ink">{lang === 'ar' ? x.descriptionAr : x.description}</td>
                    <td className="px-3 py-3 text-muted">{t('mr.ownerNone')}</td>
                    <td className="px-3 py-3">{x.date ? <span dir="ltr" className="tabular-nums">{x.date}</span> : <span className="bg-warn px-2 py-0.5 text-xs font-bold text-black">{t('mr.noDate')}</span>}</td>
                    <td className="px-3 py-3 text-muted">{statusLabel(x.status)} · <span dir="ltr" className="tabular-nums">{formatCurrency(x.amount, x.currency)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={t('mr.assessment')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Pill>{t('mr.positives')}</Pill>
            <ul className="space-y-1 text-sm">{blocks.some((b) => b.positives.length) ? blocks.flatMap((b) => b.positives.map((p) => <li key={`${b.cur}-${p}`}>– <span dir="ltr" className="text-xs text-muted">{b.cur}</span> {p}</li>)) : <li className="text-muted">{na}</li>}</ul>
          </div>
          <div>
            <Pill>{t('mr.negatives')}</Pill>
            <ul className="space-y-1 text-sm">{blocks.some((b) => b.negatives.length) ? blocks.flatMap((b) => b.negatives.map((p) => <li key={`${b.cur}-${p}`}>– <span dir="ltr" className="text-xs text-muted">{b.cur}</span> {p}</li>)) : <li className="text-muted">{na}</li>}</ul>
          </div>
          <div>
            <Pill>{t('mr.strengths')}</Pill>
            <textarea aria-label={t('mr.strengths')} rows={3} value={draft.strengths} onChange={(e) => update({ strengths: e.target.value })} placeholder={t('mr.writeHere')} className={inputCls} />
          </div>
          <div>
            <Pill>{t('mr.weaknesses')}</Pill>
            <textarea aria-label={t('mr.weaknesses')} rows={3} value={draft.weaknesses} onChange={(e) => update({ weaknesses: e.target.value })} placeholder={t('mr.writeHere')} className={inputCls} />
          </div>
        </div>
      </Section>

      <Section title={t('mr.sources')}>
        {blocks.map((b) => (
          <div key={b.cur} className="mb-6 last:mb-0">
            <Pill>{b.cur}</Pill>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-ink text-xs text-muted">
                    {[t('mr.number'), t('mr.value'), t('mr.origin')].map((h) => (
                      <th key={h} scope="col" className="px-3 py-2 text-start font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.sourceRows.map(([label, v]) => (
                    <tr key={label} className="border-b border-line">
                      <td className="px-3 py-2.5 font-semibold">{label}</td>
                      <td dir="ltr" className="px-3 py-2.5 text-start tabular-nums">{b.fmt(v)}</td>
                      <td className="px-3 py-2.5 text-muted">{t('mr.originLive')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </Section>

      <Section title={t('mr.proposals')} breakBefore>
        <div className="space-y-4">
          {draft.proposals.map((p) => (
            <div key={p.id} className="border border-line p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {(
                  [
                    ['proposal', t('mr.proposal')],
                    ['why', t('mr.why')],
                    ['impact', t('mr.impact')],
                    ['cost', t('mr.cost')],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="block text-xs font-semibold text-muted">
                    {label}
                    <input value={p[k]} onChange={(e) => patchProposal(p.id, { [k]: e.target.value })} aria-invalid={k === 'cost' && p.cost.trim() === ''} className={`${inputCls} mt-1 font-normal`} />
                    {k === 'cost' && p.cost.trim() === '' && <span className="mt-1 block text-[11px] font-normal text-bad-ink">{t('mr.costRequired')}</span>}
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                <label className="font-semibold text-muted">
                  {t('mr.priority')}{' '}
                  <select value={p.priority} onChange={(e) => patchProposal(p.id, { priority: e.target.value as Proposal['priority'] })} className="ms-1 border border-line-strong bg-surface px-2 py-1 font-normal text-ink">
                    {(['high', 'medium', 'low'] as const).map((v) => (
                      <option key={v} value={v}>{t(`mr.${v}`)}</option>
                    ))}
                  </select>
                </label>
                {(['approve', 'decline'] as const).map((d) => (
                  <label key={d} className="flex items-center gap-1.5 text-ink">
                    <input type="checkbox" checked={p.decision === d} onChange={() => patchProposal(p.id, { decision: p.decision === d ? '' : d })} />
                    {t(`mr.${d}`)}
                  </label>
                ))}
                <button type="button" onClick={() => update({ proposals: draft.proposals.filter((x) => x.id !== p.id) })} className="no-print ms-auto font-semibold text-bad-ink hover:underline">
                  {t('mr.remove')}
                </button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addProposal} className="no-print mt-4 border border-line-strong px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-2">
          + {t('mr.addProposal')}
        </button>
      </Section>

      <Section title={t('mr.signoff')}>
        <div className="grid grid-cols-1 gap-8 bg-surface-2 p-6 sm:grid-cols-3">
          {[t('mr.preparedBy'), t('mr.approvedBy'), t('mr.date')].map((label) => (
            <div key={label}>
              <div className="h-10 border-b-2 border-ink" />
              <div className="mt-1.5 text-xs font-semibold text-muted">{label}</div>
            </div>
          ))}
        </div>
      </Section>
    </article>
  );
}
