export type Currency = 'LYD' | 'USD';
export type Language = 'en' | 'ar';
export type PlatformSource = 'A-Stay' | 'A-Market' | 'A-Space' | 'Corporate' | 'Tech Infrastructure';

export type TransactionType = 'inflow' | 'outflow';
export type TransactionStatus = 'paid' | 'pending' | 'upcoming';
export type TransactionCategory = 
  | 'Customer Collection'
  | 'Cloud & Tech Stack'
  | 'Office & Facilities'
  | 'Salaries & Contractors'
  | 'Marketing & Ads'
  | 'Merchant Payout';

export type PaymentMethod = 
  | 'CASH'
  | 'LOCAL_CARD'
  | 'INTERNATIONAL_CARD'
  | 'BANK_TRANSFER'
  | 'DIGITAL_WALLET'
  | 'OTHER'
  | 'NOT_APPLICABLE';

export interface Transaction {
  id: string;
  description: string;
  descriptionAr: string;
  source: PlatformSource;
  type: TransactionType;
  category: TransactionCategory;
  categoryAr: string;
  amount: number;
  currency: Currency;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  status: TransactionStatus;
  paymentMethod: PaymentMethod;
  paymentProvider?: string;
  accountId?: string;
  accountName?: string;
  accountType?: string;
  externalReference?: string;
}

export interface MetricSummary {
  current: number;
  previous: number;
  absoluteChange: number;
  percentageChange: number | null; // null if previous === 0
  isIncrease: boolean;
  currency: Currency;
}

export interface PaymentChannelBreakdown {
  paymentMethod: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface FinancialOverview {
  totalIncome: MetricSummary;
  totalExpenses: MetricSummary;
  netResult: MetricSummary;
  availableCash: MetricSummary;
  remainingBudget: MetricSummary;
  customerCollections: MetricSummary;
  upcomingObligationsTotal: number;
  // New fields for clarity
  cashCollected: MetricSummary;
  pendingIncomeTotal: number;
  budgetOverrun: number;
  // Payment channel breakdowns
  incomeByPaymentMethod: PaymentChannelBreakdown[];
  expensesByPaymentMethod: PaymentChannelBreakdown[];
}