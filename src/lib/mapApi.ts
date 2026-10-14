import { keepBrandNames } from './brand.ts';
import type {
  PaymentMethod,
  PlatformSource,
  Transaction,
  TransactionCategory,
  TransactionStatus,
} from '@/types/dashboard';

/** Shape returned by GET /api/transactions (Prisma record with Decimal already converted to number). */
export interface ApiTransaction {
  id: string;
  description: string;
  descriptionAr: string | null;
  amount: number;
  currency: 'LYD' | 'USD';
  type: 'INCOME' | 'EXPENSE';
  status: 'PAID' | 'PENDING' | 'UPCOMING';
  category: string;
  categoryAr: string | null;
  transactionDate: string;
  paymentMethod: string;
  paymentProvider: string | null;
  externalReference: string | null;
  platform: { id: string; name: string; code: string } | null;
  account: { id: string; name: string; type: string; currency: string } | null;
  accountId: string | null;
}

export const PLATFORM_BY_CODE: Record<string, PlatformSource> = {
  'A-STAY': 'A-Stay',
  'A-MARKET': 'A-Market',
  'A-SPACE': 'A-Space',
  CORPORATE: 'Corporate',
  'TECH-INFRA': 'Tech Infrastructure',
};

const PAYMENT_METHODS: PaymentMethod[] = [
  'CASH',
  'LOCAL_CARD',
  'INTERNATIONAL_CARD',
  'BANK_TRANSFER',
  'DIGITAL_WALLET',
  'OTHER',
  'NOT_APPLICABLE',
];

/**
 * Convert an API transaction into the UI's `Transaction` shape.
 * The UI model uses inflow/outflow, lowercase statuses, a `month` key and a platform label;
 * without this mapping live data renders with blank dates/platforms and every amount as income.
 */
export function mapApiTransaction(tx: ApiTransaction): Transaction {
  const date = String(tx.transactionDate).slice(0, 10);
  const method = PAYMENT_METHODS.includes(tx.paymentMethod as PaymentMethod)
    ? (tx.paymentMethod as PaymentMethod)
    : 'OTHER';

  return {
    id: tx.id,
    description: tx.description,
    descriptionAr: keepBrandNames(tx.descriptionAr || tx.description),
    source: (tx.platform && PLATFORM_BY_CODE[tx.platform.code]) || 'Corporate',
    type: tx.type === 'INCOME' ? 'inflow' : 'outflow',
    category: tx.category as TransactionCategory,
    categoryAr: keepBrandNames(tx.categoryAr || tx.category),
    amount: Number(tx.amount),
    currency: tx.currency,
    date,
    month: date.slice(0, 7),
    status: tx.status.toLowerCase() as TransactionStatus,
    paymentMethod: method,
    paymentProvider: tx.paymentProvider ?? undefined,
    accountId: tx.accountId ?? undefined,
    accountName: tx.account?.name,
    accountType: tx.account?.type,
    externalReference: tx.externalReference ?? undefined,
  };
}
