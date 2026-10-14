import { badRequest, guard, json, parseCurrency, parseRanges, todayIso } from '@/lib/server/guard';
import { financeBreakdown, financeOverview, financeSeries } from '@/lib/server/finance';
import { loadBillingRows } from '@/lib/server/billingData';
import { financialPosition } from '@/lib/billing';

export const dynamic = 'force-dynamic';

/**
 * One request powers the whole dashboard: KPIs, trend series, breakdowns and the financial position
 * (paid / outstanding / due by month end). One auth check, queries run in parallel and are tenant-scoped.
 */
export const GET = guard('dashboard:view', async (req, access, prisma) => {
  const sp = new URL(req.url).searchParams;
  const currency = parseCurrency(sp.get('currency'));
  if (!currency) return badRequest('Invalid currency. Must be LYD or USD');
  const ranges = parseRanges(sp);
  if (!ranges) return badRequest('Invalid period. Use from/to as YYYY-MM-DD');
  const { range, prev } = ranges;
  const org = access.organizationId;

  const [fin, series, breakdown, billing] = await Promise.all([
    financeOverview(prisma, org, currency, range, prev),
    financeSeries(prisma, org, currency, range, prev),
    financeBreakdown(prisma, org, currency, range, prev),
    loadBillingRows(prisma, org),
  ]);

  const position = financialPosition({
    currency,
    invoices: billing.invoices,
    payments: billing.payments,
    range,
    previousRange: prev,
    today: todayIso(sp),
  });

  // Upcoming payables: scheduled expenses that fall due by the end of the current month.
  const upcoming = await prisma.financialTransaction.aggregate({
    where: {
      organizationId: org,
      currency,
      type: 'EXPENSE',
      status: 'UPCOMING',
      transactionDate: { lte: new Date(`${position.monthEnd}T00:00:00Z`) },
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  return json({
    range,
    previousRange: prev,
    currency,
    ...fin,
    series,
    breakdown,
    position: {
      ...position,
      upcomingPayables: Number(upcoming._sum.amount?.toString() ?? 0),
      upcomingPayablesCount: upcoming._count._all,
    },
  });
});
