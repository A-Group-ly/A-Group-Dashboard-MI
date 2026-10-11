import { Currency, MetricSummary, Transaction, FinancialOverview, PaymentChannelBreakdown } from '@/types/dashboard';
import { OPENING_LIQUIDITY, MONTHLY_BUDGET_CAP } from './demoData';

export function calculateMoM(current: number, previous: number, currency: Currency): MetricSummary {
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

export function computeFinancialOverview(
  transactions: Transaction[],
  selectedMonth: string,
  selectedCurrency: Currency
): FinancialOverview {
  // Determine previous month in YYYY-MM format
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const prevDate = new Date(year, month - 2, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  // Filter for currency - ALWAYS use ALL transactions for company-wide metrics
  const currencyTx = transactions.filter(t => t.currency === selectedCurrency);

  const curMonthTx = currencyTx.filter(t => t.month === selectedMonth);
  const prevMonthTx = currencyTx.filter(t => t.month === prevMonthStr);

  // Recognized Income (paid or pending inflows - recognized revenue)
  const curIncome = curMonthTx
    .filter(t => t.type === 'inflow' && t.status !== 'upcoming')
    .reduce((sum, t) => sum + t.amount, 0);
  const prevIncome = prevMonthTx
    .filter(t => t.type === 'inflow' && t.status !== 'upcoming')
    .reduce((sum, t) => sum + t.amount, 0);

  // Actual Cash Collected (only paid inflows)
  const curCashCollected = curMonthTx
    .filter(t => t.type === 'inflow' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);
  const prevCashCollected = prevMonthTx
    .filter(t => t.type === 'inflow' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  // Paid Expenses (actual cash outflows)
  const curExpenses = curMonthTx
    .filter(t => t.type === 'outflow' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);
  const prevExpenses = prevMonthTx
    .filter(t => t.type === 'outflow' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  // Upcoming obligations (expected future outflows)
  const upcomingObligationsTotal = curMonthTx
    .filter(t => t.type === 'outflow' && t.status === 'upcoming')
    .reduce((sum, t) => sum + t.amount, 0);

  // Pending income (recognized but not yet collected)
  const pendingIncomeTotal = curMonthTx
    .filter(t => t.type === 'inflow' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  // Net operating result (recognized income - paid expenses)
  const curNet = curIncome - curExpenses;
  const prevNet = prevIncome - prevExpenses;

  // Customer collections (A-Stay, A-Market, A-Space, etc.) - recognized
  const curCollections = curMonthTx
    .filter(t => t.type === 'inflow' && t.category === 'Customer Collection')
    .reduce((sum, t) => sum + t.amount, 0);
  const prevCollections = prevMonthTx
    .filter(t => t.type === 'inflow' && t.category === 'Customer Collection')
    .reduce((sum, t) => sum + t.amount, 0);

  // Actual Available Cash = Opening baseline + cumulative net (all months up to selected)
  // This is an ILLUSTRATIVE estimate, not verified bank balance
  const allCurrencyTx = transactions.filter(t => t.currency === selectedCurrency);
  const allMonthsUpToSelected = allCurrencyTx.filter(t => t.month <= selectedMonth);
  const cumulativeNet = allMonthsUpToSelected
    .filter(t => t.type === 'inflow' && t.status !== 'upcoming')
    .reduce((sum, t) => sum + t.amount, 0) -
    allMonthsUpToSelected
    .filter(t => t.type === 'outflow' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const baseCash = OPENING_LIQUIDITY[selectedCurrency];
  const curCash = baseCash + cumulativeNet;
  
  // Previous month cumulative
  const allMonthsUpToPrev = allCurrencyTx.filter(t => t.month <= prevMonthStr);
  const cumulativeNetPrev = allMonthsUpToPrev
    .filter(t => t.type === 'inflow' && t.status !== 'upcoming')
    .reduce((sum, t) => sum + t.amount, 0) -
    allMonthsUpToPrev
    .filter(t => t.type === 'outflow' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);
  const prevCash = baseCash + cumulativeNetPrev;

  // Remaining Budget = Monthly cap - actual paid expenses (can be negative = overrun)
  const budgetCap = MONTHLY_BUDGET_CAP[selectedCurrency];
  const curBudgetRemaining = budgetCap - curExpenses; // Allow negative to show overrun
  const prevBudgetRemaining = budgetCap - prevExpenses;

  // Demo data doesn't have real payment methods - return empty arrays
  // Real payment channel breakdowns come from the API when using the database
  const emptyPaymentBreakdown: PaymentChannelBreakdown[] = [];

  return {
    totalIncome: calculateMoM(curIncome, prevIncome, selectedCurrency),
    totalExpenses: calculateMoM(curExpenses, prevExpenses, selectedCurrency),
    netResult: calculateMoM(curNet, prevNet, selectedCurrency),
    availableCash: calculateMoM(curCash, prevCash, selectedCurrency),
    remainingBudget: calculateMoM(curBudgetRemaining, prevBudgetRemaining, selectedCurrency),
    customerCollections: calculateMoM(curCollections, prevCollections, selectedCurrency),
    upcomingObligationsTotal,
    // New fields for clarity
    cashCollected: calculateMoM(curCashCollected, prevCashCollected, selectedCurrency),
    pendingIncomeTotal,
    budgetOverrun: curBudgetRemaining < 0 ? Math.abs(curBudgetRemaining) : 0,
    // Payment channel breakdowns (empty for demo data)
    incomeByPaymentMethod: emptyPaymentBreakdown,
    expensesByPaymentMethod: emptyPaymentBreakdown,
  };
}

export function formatCurrency(amount: number, currency: Currency): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} ${currency}`;
}