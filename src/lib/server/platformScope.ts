import { Prisma } from '@prisma/client';
import { PRODUCT_PLATFORM } from '../billingDates.ts';

/**
 * Platform scope for the dashboard (company-wide or one A-Group platform).
 * Finance rows carry a platformId; billing rows (subscriptions, invoices, payments) belong to a platform through
 * their product (see PRODUCT_PLATFORM). The platform code is whitelisted, so only known seeded ids reach SQL.
 */
export const PLATFORM_ID_BY_CODE: Record<string, string> = {
  'A-STAY': 'plat-a-stay',
  'A-MARKET': 'plat-a-market',
  'A-SPACE': 'plat-a-space',
  CORPORATE: 'plat-corporate',
  'TECH-INFRA': 'plat-tech-infra',
};

/** `?platform=TECH-INFRA` -> 'plat-tech-infra'; anything unknown or absent means company-wide (null). */
export function platformIdFromParam(v: string | null): string | null {
  return v && Object.prototype.hasOwnProperty.call(PLATFORM_ID_BY_CODE, v) ? PLATFORM_ID_BY_CODE[v] : null;
}

/** Predicate on a Plan alias (`pl`): is this product part of the platform? */
function productCondition(platformId: string): Prisma.Sql {
  const explicit = Object.entries(PRODUCT_PLATFORM).filter(([, p]) => p === platformId).map(([id]) => id);
  const mapped = Object.keys(PRODUCT_PLATFORM);
  if (platformId === 'plat-corporate') {
    // Corporate also owns every product that is not mapped to another platform.
    return explicit.length
      ? Prisma.sql`(pl."productId" IN (${Prisma.join(explicit)}) OR pl."productId" NOT IN (${Prisma.join(mapped)}))`
      : Prisma.sql`pl."productId" NOT IN (${Prisma.join(mapped)})`;
  }
  return explicit.length ? Prisma.sql`pl."productId" IN (${Prisma.join(explicit)})` : Prisma.sql`FALSE`;
}

/** `s."id"`-style column holding a subscription id: restrict to the platform's subscriptions (one-off invoices count as Corporate). */
export function subscriptionScope(org: string, platformId: string | null, column: Prisma.Sql): Prisma.Sql {
  if (!platformId) return Prisma.sql`TRUE`;
  const scoped = Prisma.sql`${column} IN (SELECT s."id" FROM "Subscription" s JOIN "Plan" pl ON pl."id" = s."planId" WHERE s."organizationId" = ${org} AND ${productCondition(platformId)})`;
  return platformId === 'plat-corporate' ? Prisma.sql`(${scoped} OR ${column} IS NULL)` : scoped;
}

/** Condition on the Subscription / Plan aliases used by the pulse queries. */
export function productScope(platformId: string | null): Prisma.Sql {
  return platformId ? productCondition(platformId) : Prisma.sql`TRUE`;
}
