/**
 * Date rules for new subscriptions and invoices (pure, unit-tested).
 * Anniversaries use a day-of-month capped at 28 so every month has the same renewal day.
 */
import { addDays } from './period.ts';

export type BillingInterval = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export function addMonthsCapped(iso: string, months: number): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1 + months;
  const day = Math.min(Number(iso.slice(8, 10)), 28);
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  return `${yy}-${String(mm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** The renewal that follows `start` for the interval. */
export function nextRenewalAfter(start: string, interval: BillingInterval): string {
  switch (interval) {
    case 'WEEKLY':
      return addDays(start, 7);
    case 'MONTHLY':
      return addMonthsCapped(start, 1);
    case 'QUARTERLY':
      return addMonthsCapped(start, 3);
    default:
      return addMonthsCapped(start, 12);
  }
}

/** Renewal date for a subscription that starts on `start`: after the trial when the plan has one. */
export function initialRenewal(start: string, interval: BillingInterval, trialDays: number): string {
  return trialDays > 0 ? addDays(start, trialDays) : nextRenewalAfter(start, interval);
}

export const DEFAULT_DUE_DAYS = 14;

export function defaultDueDate(issue: string): string {
  return addDays(issue, DEFAULT_DUE_DAYS);
}

/** Collision-resistant, human-readable invoice number: INV-YYYYMMDD-XXXXXX (the database also enforces uniqueness). */
export function newInvoiceNumber(issue: string, random: () => number = Math.random): string {
  const suffix = Math.floor(random() * 36 ** 6)
    .toString(36)
    .toUpperCase()
    .padStart(6, '0');
  return `INV-${issue.replace(/-/g, '')}-${suffix}`;
}

/** Account that receives a collection, by currency and payment method (matches the seeded accounts). */
export function accountForCollection(currency: 'LYD' | 'USD', method: 'CASH' | 'LOCAL_CARD' | 'INTERNATIONAL_CARD' | 'BANK_TRANSFER' | 'DIGITAL_WALLET'): string {
  if (currency === 'LYD') return method === 'CASH' ? 'acc-lyd-cash-main' : 'acc-lyd-bank-main';
  return method === 'LOCAL_CARD' || method === 'INTERNATIONAL_CARD' ? 'acc-usd-card-processor' : 'acc-usd-bank-main';
}

/** Demo mapping of catalog products to business platforms (seeded ids); unknown products go to Corporate. */
export const PRODUCT_PLATFORM: Record<string, string> = {
  prd_001: 'plat-tech-infra',
  prd_002: 'plat-tech-infra',
  prd_003: 'plat-tech-infra',
  prd_004: 'plat-corporate',
  prd_005: 'plat-a-market',
  prd_006: 'plat-a-space',
};
export const platformForProduct = (productId: string | null | undefined) => (productId && PRODUCT_PLATFORM[productId]) || 'plat-corporate';
