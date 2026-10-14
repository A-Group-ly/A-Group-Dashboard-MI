import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMonthRangeUtc, getPreviousMonth, isValidMonth } from '@/lib/month';

interface FinancialOverview {
  totalIncome: MetricSummary;
  totalExpenses: MetricSummary;
  netResult: MetricSummary;
  availableCash: MetricSummary;
  remainingBudget: MetricSummary;
  customerCollections: MetricSummary;
  upcomingObligationsTotal: number;
  cashCollected: MetricSummary;
  pendingIncomeTotal: number;
  budgetOverrun: number;
  // Payment channel breakdowns
  incomeByPaymentMethod: PaymentChannelBreakdown[];
  expensesByPaymentMethod: PaymentChannelBreakdown[];
}

interface MetricSummary {
  current: number;
  previous: number;
  absoluteChange: number;
  percentageChange: number | null;
  isIncrease: boolean;
  currency: 'LYD' | 'USD';
}

interface PaymentChannelBreakdown {
  paymentMethod: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

interface TransactionRecord {
  id: string;
  description: string;
  descriptionAr: string | null;
  amount: { toNumber: () => number } | number;
  currency: string;
  type: string;
  status: string;
  category: string;
  categoryAr: string | null;
  transactionDate: Date;
  dueDate: Date | null;
  reference: string | null;
  platformId: string | null;
  paymentMethod: string;
  paymentProvider: string | null;
  accountId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function calculateMoM(current: number, previous: number, currency: 'LYD' | 'USD'): MetricSummary {
  const absoluteChange = current - previous;
  let percentageChange: number | null = null;

  if (previous !== 0) {
    percentageChange = ((current - previous) / Math.abs(previous)) * 100;
  }

  return {
    current,
    previous,
    absoluteChange,
    percentageChange,
    isIncrease: absoluteChange >= 0,
    currency,
  };
}

function toNumber(amount: { toNumber: () => number } | number): number {
  return typeof amount === 'number' ? amount : amount.toNumber();
}

function buildPaymentChannelBreakdown(
  transactions: TransactionRecord[],
  type: 'INCOME' | 'EXPENSE',
  statusFilter?: string
): PaymentChannelBreakdown[] {
  const filtered = transactions.filter((t) => {
    if (t.type !== type) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    return true;
  });

  const grouped = new Map<string, { amount: number; count: number }>();

  for (const tx of filtered) {
    const method = tx.paymentMethod || 'NOT_APPLICABLE';
    const existing = grouped.get(method) || { amount: 0, count: 0 };
    existing.amount += toNumber(tx.amount);
    existing.count += 1;
    grouped.set(method, existing);
  }

  const total = Array.from(grouped.values()).reduce((sum, v) => sum + v.amount, 0);

  return Array.from(grouped.entries())
    .map(([paymentMethod, { amount, count }]) => ({
      paymentMethod,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
      transactionCount: count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const month = searchParams.get('month') || '2026-10';
    const currency = searchParams.get('currency') || 'LYD';

    if (!['LYD', 'USD'].includes(currency)) {
      return NextResponse.json(
        { error: 'Invalid currency. Must be LYD or USD' },
        { status: 400 }
      );
    }

    if (!isValidMonth(month)) {
      return NextResponse.json(
        { error: 'Invalid month. Use YYYY-MM format' },
        { status: 400 }
      );
    }

    const prevMonth = getPreviousMonth(month);
    const { start: curStart, end: curEnd } = getMonthRangeUtc(month);
    const { start: prevStart, end: prevEnd } = getMonthRangeUtc(prevMonth);

    // Get all transactions for the currency (company-wide)
    const [curMonthTx, prevMonthTx, allMonthsUpToCur, allMonthsUpToPrev] = await Promise.all([
      prisma.financialTransaction.findMany({
        where: {
          currency: currency as 'LYD' | 'USD',
          transactionDate: { gte: curStart, lte: curEnd },
        },
      }),
      prisma.financialTransaction.findMany({
        where: {
          currency: currency as 'LYD' | 'USD',
          transactionDate: { gte: prevStart, lte: prevEnd },
        },
      }),
      prisma.financialTransaction.findMany({
        where: {
          currency: currency as 'LYD' | 'USD',
          transactionDate: { lte: curEnd },
        },
      }),
      prisma.financialTransaction.findMany({
        where: {
          currency: currency as 'LYD' | 'USD',
          transactionDate: { lte: prevEnd },
        },
      }),
    ]);

    // Get opening balance
    const openingBalance = await prisma.openingBalance.findFirst({
      where: {
        currency: currency as 'LYD' | 'USD',
        effectiveDate: { lte: curStart },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    // Get monthly budget - use UTC date to match DATE type in PostgreSQL
    const [year, monthNum] = month.split('-').map(Number);
    const utcMonthStart = new Date(Date.UTC(year, monthNum - 1, 1));
    const budget = await prisma.monthlyBudget.findFirst({
      where: {
        currency: currency as 'LYD' | 'USD',
        month: utcMonthStart,
        platformId: null,
      },
    });

    const baseCash = openingBalance ? toNumber(openingBalance.amount) : 0;
    const budgetCap = budget ? toNumber(budget.amount) : 0;

    // Current month calculations
    const curIncome = curMonthTx
      .filter((t: TransactionRecord) => t.type === 'INCOME' && t.status !== 'UPCOMING')
      .reduce((sum: number, t: TransactionRecord) => sum + toNumber(t.amount), 0);
    const curCashCollected = curMonthTx
      .filter((t: TransactionRecord) => t.type === 'INCOME' && t.status === 'PAID')
      .reduce((sum: number, t: TransactionRecord) => sum + toNumber(t.amount), 0);
    const curExpenses = curMonthTx
      .filter((t: TransactionRecord) => t.type === 'EXPENSE' && t.status === 'PAID')
      .reduce((sum: number, t: TransactionRecord) => sum + toNumber(t.amount), 0);
    const curCollections = curMonthTx
      .filter((t: TransactionRecord) => t.type === 'INCOME' && t.category === 'Customer Collection')
      .reduce((sum: number, t: TransactionRecord) => sum + toNumber(t.amount), 0);
    const curPendingIncome = curMonthTx
      .filter((t: TransactionRecord) => t.type === 'INCOME' && t.status === 'PENDING')
      .reduce((sum: number, t: TransactionRecord) => sum + toNumber(t.amount), 0);
    const curUpcomingObligations = curMonthTx
      .filter((t: TransactionRecord) => t.type === 'EXPENSE' && t.status === 'UPCOMING')
      .reduce((sum: number, t: TransactionRecord) => sum + toNumber(t.amount), 0);

    // Previous month calculations
    const prevIncome = prevMonthTx
      .filter((t: TransactionRecord) => t.type === 'INCOME' && t.status !== 'UPCOMING')
      .reduce((sum: number, t: TransactionRecord) => sum + toNumber(t.amount), 0);
    const prevCashCollected = prevMonthTx
      .filter((t: TransactionRecord) => t.type === 'INCOME' && t.status === 'PAID')
      .reduce((sum: number, t: TransactionRecord) => sum + toNumber(t.amount), 0);
    const prevExpenses = prevMonthTx
      .filter((t: TransactionRecord) => t.type === 'EXPENSE' && t.status === 'PAID')
      .reduce((sum: number, t: TransactionRecord) => sum + toNumber(t.amount), 0);
    const prevCollections = prevMonthTx
      .filter((t: TransactionRecord) => t.type === 'INCOME' && t.category === 'Customer Collection')
      .reduce((sum: number, t: TransactionRecord) => sum + toNumber(t.amount), 0);

    // Cumulative net for cash balance (illustrative)
    const cumulativeNetCur = allMonthsUpToCur
      .filter((t: TransactionRecord) => t.type === 'INCOME' && t.status !== 'UPCOMING')
      .reduce((sum: number, t: TransactionRecord) => sum + toNumber(t.amount), 0) -
      allMonthsUpToCur
        .filter((t: TransactionRecord) => t.type === 'EXPENSE' && t.status === 'PAID')
        .reduce((sum: number, t: TransactionRecord) => sum + toNumber(t.amount), 0);

    const cumulativeNetPrev = allMonthsUpToPrev
      .filter((t: TransactionRecord) => t.type === 'INCOME' && t.status !== 'UPCOMING')
      .reduce((sum: number, t: TransactionRecord) => sum + toNumber(t.amount), 0) -
      allMonthsUpToPrev
        .filter((t: TransactionRecord) => t.type === 'EXPENSE' && t.status === 'PAID')
        .reduce((sum: number, t: TransactionRecord) => sum + toNumber(t.amount), 0);

    const curCash = baseCash + cumulativeNetCur;
    const prevCash = baseCash + cumulativeNetPrev;

    // Budget remaining (can be negative = overrun)
    const curBudgetRemaining = budgetCap - curExpenses;
    const prevBudgetRemaining = budgetCap - prevExpenses;
    const budgetOverrun = curBudgetRemaining < 0 ? Math.abs(curBudgetRemaining) : 0;

    // Payment channel breakdowns
    // Income: only PAID transactions (collected)
    const incomeByPaymentMethod = buildPaymentChannelBreakdown(curMonthTx, 'INCOME', 'PAID');
    // Expenses: only PAID transactions
    const expensesByPaymentMethod = buildPaymentChannelBreakdown(curMonthTx, 'EXPENSE', 'PAID');

    const overview: FinancialOverview = {
      totalIncome: calculateMoM(curIncome, prevIncome, currency as 'LYD' | 'USD'),
      totalExpenses: calculateMoM(curExpenses, prevExpenses, currency as 'LYD' | 'USD'),
      netResult: calculateMoM(curIncome - curExpenses, prevIncome - prevExpenses, currency as 'LYD' | 'USD'),
      availableCash: calculateMoM(curCash, prevCash, currency as 'LYD' | 'USD'),
      remainingBudget: calculateMoM(curBudgetRemaining, prevBudgetRemaining, currency as 'LYD' | 'USD'),
      customerCollections: calculateMoM(curCollections, prevCollections, currency as 'LYD' | 'USD'),
      upcomingObligationsTotal: curUpcomingObligations,
      cashCollected: calculateMoM(curCashCollected, prevCashCollected, currency as 'LYD' | 'USD'),
      pendingIncomeTotal: curPendingIncome,
      budgetOverrun,
      incomeByPaymentMethod,
      expensesByPaymentMethod,
    };

    return NextResponse.json({
      overview,
      month,
      currency,
      previousMonth: prevMonth,
      meta: {
        openingBalance: baseCash,
        budgetCap,
        isIllustrative: true,
        note: 'All figures are illustrative sample data for demonstration purposes only.',
      },
    });
  } catch (error) {
    // Let Next.js's own prerender bail-out signal through; it is not a failure.
    if ((error as { digest?: string })?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}