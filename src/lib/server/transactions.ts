import type { PrismaClient } from '@prisma/client';
import { Reader } from './validate';

const TYPES = ['INCOME', 'EXPENSE'] as const;
const CURRENCIES = ['LYD', 'USD'] as const;
const STATUSES = ['PAID', 'PENDING', 'UPCOMING'] as const;
const METHODS = ['CASH', 'LOCAL_CARD', 'INTERNATIONAL_CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET', 'OTHER', 'NOT_APPLICABLE'] as const;

/** Parse + validate a transaction body (shared by create and edit). Returns the fields or the errors. */
export function readTransaction(body: unknown, partial: boolean) {
  const r = new Reader(body);
  const data: Record<string, unknown> = {};
  const set = (key: string, v: unknown) => {
    if (v !== undefined) data[key] = v;
  };
  const take = (key: string) => !partial || r.has(key);
  if (take('description')) set('description', r.str('description', { min: 2, max: 200, required: true }));
  if (take('descriptionAr')) set('descriptionAr', r.nullableStr('descriptionAr', 200));
  if (take('amount')) set('amount', r.money('amount'));
  if (take('currency')) set('currency', r.oneOf('currency', CURRENCIES));
  if (take('type')) set('type', r.oneOf('type', TYPES));
  if (take('status')) set('status', r.oneOf('status', STATUSES));
  if (take('category')) set('category', r.str('category', { min: 1, max: 80, required: true }));
  if (take('categoryAr')) set('categoryAr', r.nullableStr('categoryAr', 80));
  if (take('transactionDate')) set('transactionDate', r.date('transactionDate'));
  if (r.has('dueDate')) set('dueDate', r.date('dueDate', false) ?? null);
  if (r.has('reference')) set('reference', r.nullableStr('reference', 80));
  if (r.has('platformId')) set('platformId', r.nullableStr('platformId', 80));
  if (r.has('accountId')) set('accountId', r.nullableStr('accountId', 80));
  if (take('paymentMethod') || r.has('paymentMethod')) set('paymentMethod', r.oneOf('paymentMethod', METHODS, false) ?? (partial ? undefined : 'NOT_APPLICABLE'));
  return { r, data };
}

/** Check platform / account belong to the tenant and the account matches the currency. */
export async function checkRefs(prisma: PrismaClient, org: string, data: Record<string, unknown>, currency: string): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};
  if (typeof data.platformId === 'string') {
    const p = await prisma.platform.findFirst({ where: { id: data.platformId, organizationId: org }, select: { id: true } });
    if (!p) errors.platformId = 'not_found';
  }
  if (typeof data.accountId === 'string') {
    const a = await prisma.financialAccount.findFirst({ where: { id: data.accountId, organizationId: org }, select: { currency: true } });
    if (!a) errors.accountId = 'not_found';
    else if (a.currency !== currency) errors.accountId = 'currency_mismatch';
  }
  return errors;
}

