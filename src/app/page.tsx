'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Currency, Language, MetricSummary, FinancialOverview, Transaction } from '@/types/dashboard';
import { INITIAL_TRANSACTIONS } from '@/lib/demoData';
import { computeFinancialOverview } from '@/lib/calculations';
import { translations } from '@/lib/translations';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import KpiCard from '@/components/KpiCard';
import CashFlowChart from '@/components/CashFlowChart';
import BudgetBurndown from '@/components/BudgetBurndown';
import TransactionsTable from '@/components/TransactionsTable';

interface DashboardApiResponse {
  overview: FinancialOverview;
  month: string;
  currency: Currency;
  previousMonth: string;
  meta: {
    openingBalance: number;
    budgetCap: number;
    isIllustrative: boolean;
    note: string;
  };
}

interface TransactionsApiResponse {
  data: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function DashboardPage() {
  const [language, setLanguage] = useState<Language>('en');
  const [currency, setCurrency] = useState<Currency>('LYD');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [useApi, setUseApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const t = translations[language];

  // Company-wide transactions (for KPIs) - always use ALL transactions for the selected currency
  const companyTransactions = useMemo(() => {
    return INITIAL_TRANSACTIONS.filter(t => t.currency === currency);
  }, [currency]);

  // Platform-filtered transactions (for charts, tables)
  const filteredTransactions = useMemo(() => {
    if (selectedPlatform === 'all') return companyTransactions;
    return companyTransactions.filter((t) => t.source === selectedPlatform);
  }, [companyTransactions, selectedPlatform]);

  // Compute overview numbers based on ALL company transactions for the currency (demo data fallback)
  const demoOverview = useMemo(() => {
    return computeFinancialOverview(companyTransactions, selectedMonth, currency);
  }, [companyTransactions, selectedMonth, currency]);

  // State for API data
  const [apiOverview, setApiOverview] = useState<FinancialOverview | null>(null);
  const [apiTransactions, setApiTransactions] = useState<Transaction[] | null>(null);

  // Fetch from API when useApi is true
  useEffect(() => {
    if (!useApi) return;

    const fetchData = async () => {
      setIsLoading(true);
      setApiError(null);

      try {
        const [overviewRes, transactionsRes] = await Promise.all([
          fetch(`/api/dashboard?month=${selectedMonth}&currency=${currency}`),
          fetch(`/api/transactions?month=${selectedMonth}&currency=${currency}&limit=100`),
        ]);

        if (!overviewRes.ok) {
          throw new Error(`Dashboard API error: ${overviewRes.status}`);
        }
        if (!transactionsRes.ok) {
          throw new Error(`Transactions API error: ${transactionsRes.status}`);
        }

        const overviewData: DashboardApiResponse = await overviewRes.json();
        const transactionsData: TransactionsApiResponse = await transactionsRes.json();

        setApiOverview(overviewData.overview);
        setApiTransactions(transactionsData.data);
      } catch (error) {
        console.error('API fetch failed:', error);
        setApiError(error instanceof Error ? error.message : 'Failed to fetch from API');
        setUseApi(false); // Fall back to demo data
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [useApi, selectedMonth, currency]);

  // Use API data if available, otherwise demo data
  const overview = apiOverview || demoOverview;
  const transactions = apiTransactions || filteredTransactions;

  // Check if database is configured by testing health endpoint
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          if (data.database === 'connected') {
            setUseApi(true);
          }
        }
      } catch {
        // Database not configured, use demo data
        setUseApi(false);
      }
    };

    checkHealth();
  }, []);

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-all font-sans"
    >
      {/* Navigation Sidebar */}
      <Sidebar
        language={language}
        currentPlatform={selectedPlatform}
        onSelectPlatform={setSelectedPlatform}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          language={language}
          onLanguageChange={setLanguage}
          currency={currency}
          onCurrencyChange={setCurrency}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />

        <main className="p-6 md:p-8 space-y-8 flex-1 overflow-y-auto">
          {/* Data Source Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold ${
                useApi && !apiError
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${useApi && !apiError ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span>
                  {useApi && !apiError
                    ? 'Live Database (Supabase PostgreSQL)'
                    : 'Demo Data — Illustrative Sample Only'}
                </span>
              </div>
              {isLoading && (
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </div>
              )}
              {apiError && (
                <div className="inline-flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  API Error: {apiError}
                </div>
              )}
            </div>

            <button
              onClick={() => setUseApi(!useApi)}
              disabled={isLoading}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                useApi
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                  : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-950'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {useApi ? 'Switch to Demo Data' : 'Try Live Database'}
            </button>
          </div>

          {/* Executive Overview Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {t.overview}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedPlatform === 'all'
                  ? `${t.allPlatforms} — ${t.companyWideScope}`
                  : `${selectedPlatform} — ${t.platformScope}`}
              </p>
            </div>
            <div className="text-xs font-mono font-medium text-slate-400">
              Active Scope: <span className="font-bold text-indigo-600 dark:text-indigo-400">{currency}</span>
            </div>
          </div>

          {/* Scope Indicator */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 max-w-fit">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>
              {selectedPlatform === 'all'
                ? `${t.companyWideMetrics} (${currency})`
                : `${t.platformMetrics}: ${selectedPlatform} (${currency})`}
            </span>
          </div>

          {/* First Screen: 6 Executive Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard
              title={t.kpiIncome}
              metric={overview.totalIncome}
              subtitle={t.vsLastMonth}
              language={language}
              sentimentType="income"
            />
            <KpiCard
              title={t.kpiExpenses}
              metric={overview.totalExpenses}
              subtitle={t.vsLastMonth}
              language={language}
              sentimentType="expense"
            />
            <KpiCard
              title={t.kpiNetResult}
              metric={overview.netResult}
              subtitle={t.vsLastMonth}
              language={language}
              sentimentType="net"
            />
            <KpiCard
              title={t.kpiAvailableCash}
              metric={overview.availableCash}
              subtitle={t.illustrativeEstimate}
              language={language}
              sentimentType="neutral"
            />
            <KpiCard
              title={t.kpiRemainingBudget}
              metric={overview.remainingBudget}
              subtitle={overview.budgetOverrun > 0 ? t.budgetOverrunLabel : t.allocatedCap}
              language={language}
              sentimentType={overview.budgetOverrun > 0 ? 'expense' : 'neutral'}
            />
            <KpiCard
              title={t.kpiCustomerCollections}
              metric={overview.customerCollections}
              subtitle={t.collectedFromCustomers}
              language={language}
              sentimentType="income"
            />
          </div>

          {/* Additional Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard
              title={t.kpiCashCollected}
              metric={overview.cashCollected}
              subtitle={t.actualReceived}
              language={language}
              sentimentType="income"
            />
            <KpiCard
              title={t.kpiPendingIncome}
              metric={{
                current: overview.pendingIncomeTotal,
                previous: 0,
                absoluteChange: 0,
                percentageChange: null,
                isIncrease: false,
                currency,
              }}
              subtitle={t.notYetCollected}
              language={language}
              sentimentType="neutral"
            />
            {overview.budgetOverrun > 0 && (
              <KpiCard
                title={t.kpiBudgetOverrun}
                metric={{
                  current: overview.budgetOverrun,
                  previous: 0,
                  absoluteChange: 0,
                  percentageChange: null,
                  isIncrease: true,
                  currency,
                }}
                subtitle={t.overBudget}
                language={language}
                sentimentType="expense"
              />
            )}
          </div>

          {/* Analytics & Budget Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CashFlowChart
                transactions={transactions}
                currency={currency}
                language={language}
                selectedMonth={selectedMonth}
              />
            </div>
            <div>
              <BudgetBurndown
                currentExpenses={overview.totalExpenses.current}
                remainingBudget={overview.remainingBudget.current}
                upcomingTotal={overview.upcomingObligationsTotal}
                budgetOverrun={overview.budgetOverrun}
                currency={currency}
                language={language}
              />
            </div>
          </div>

          {/* Unified Transactions & Subscription Activity */}
          <div>
            <TransactionsTable
              transactions={transactions}
              currency={currency}
              language={language}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
