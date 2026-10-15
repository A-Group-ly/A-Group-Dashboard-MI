import type { Currency } from '@prisma/client';
import { badRequest, guard, json, parseRanges, todayIso } from '@/lib/server/guard';
import { financeAll } from '@/lib/server/financeSql';
import { financialPositions, pulseStats } from '@/lib/server/billingSql';
import { platformIdFromParam } from '@/lib/server/platformScope';

export const dynamic = 'force-dynamic';

const CURRENCIES: Currency[] = ['LYD', 'USD'];

/**
 * One request powers the whole dashboard, for BOTH currencies side by side (they are never combined):
 * KPIs, trend series, breakdowns, the financial position (paid / outstanding / due by month end) and
 * month spending (spent so far, scheduled to month end, projected). One auth check, tenant-scoped.
 */
export const GET = guard('dashboard:view', async (req, access, prisma) => {
  const sp = new URL(req.url).searchParams;
  const ranges = parseRanges(sp);
  if (!ranges) return badRequest('Invalid period. Use from/to as YYYY-MM-DD');
  const { range, prev } = ranges;
  const org = access.organizationId;
  const today = todayIso(sp);
  const platformId = platformIdFromParam(sp.get('platform'));

  // About a dozen SQL statements in total (both currencies at once): the Worker's CPU budget is small.
  const [finance, positions, pulse] = await Promise.all([
    financeAll(prisma, org, range, prev, today, platformId),
    financialPositions(prisma, org, range, prev, today, platformId),
    pulseStats(prisma, org, range, platformId),
  ]);

  const currencies = Object.fromEntries(
    CURRENCIES.map((currency) => {
      const f = finance[currency];
      const position = positions[currency];
      return [
        currency,
        {
          range,
          previousRange: prev,
          currency,
          overview: f.overview,
          meta: f.meta,
          series: f.series,
          breakdown: f.breakdown,
          position: { ...position, upcomingPayables: f.spending.scheduledToMonthEnd, upcomingPayablesCount: f.spending.scheduledCount },
          spending: f.spending,
          platforms: f.platforms,
        },
      ];
    })
  );

  return json({ range, previousRange: prev, platform: platformId, pulse, currencies });
}, { cacheMs: 45000 });
