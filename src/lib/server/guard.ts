import type { NextRequest } from 'next/server';
import type { PrismaClient } from '@prisma/client';
import { can, type Permission } from '../permissions';
import { isIsoDate, previousRange, resolveRange, type PeriodSpec, type Range } from '../period';
import { getAccess, type Access } from './access';
import { cached, invalidateOrg } from './cache';
import { getPrisma, getReadPrisma, release } from './db';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export const badRequest = (message: string) => json({ error: message }, 400);

type Ctx<P> = { params: Promise<P> };

/**
 * Wraps a Route Handler with authentication (401), authorization by role (403), tenant scoping
 * (the handler only ever receives the caller's organizationId) and safe error handling.
 * `permission = null` means "any signed-in, active user".
 */
export function guard<P = Record<string, never>>(
  permission: Permission | null,
  handler: (req: NextRequest, access: Access, prisma: PrismaClient, ctx: Ctx<P>) => Promise<Response>,
  /** `cacheMs`: keep the JSON of successful GETs for this long (per organization and URL). `?fresh=1` bypasses it. */
  options: { cacheMs?: number } = {}
) {
  return async (req: NextRequest, ctx: Ctx<P>): Promise<Response> => {
    let prisma: PrismaClient | null = null;
    try {
      const result = await getAccess();
      if (result.status === 'unauthenticated') return json({ error: 'Unauthorized' }, 401);
      if (result.status === 'forbidden') return json({ error: 'Forbidden' }, 403);
      if (permission && !can(result.access.role, permission)) return json({ error: 'Forbidden' }, 403);

      // Reads share one long-lived HTTP client; writes get a per-request client that supports transactions.
      prisma = req.method === 'GET' ? getReadPrisma() : getPrisma();
      const run = async () => {
        try {
          return await handler(req, result.access, prisma!, ctx);
        } catch (first) {
          // A sleeping free-tier database or a cold Worker can fail the very first query. Reads are safe to repeat once.
          if (req.method !== 'GET' || (first as { digest?: string })?.digest) throw first;
          await new Promise((r) => setTimeout(r, 400));
          return await handler(req, result.access, prisma!, ctx);
        }
      };

      if (req.method === 'GET' && options.cacheMs) {
        const url = new URL(req.url);
        const fresh = url.searchParams.get('fresh') === '1';
        url.searchParams.delete('fresh');
        url.searchParams.sort();
        const out = await cached(result.access.organizationId, `${permission ?? 'any'}:${url.pathname}`, url.searchParams.toString(), options.cacheMs, fresh, async () => {
          const res = await run();
          return { status: res.status, body: await res.text() };
        });
        return new Response(out.body, { status: out.status, headers: { 'Content-Type': 'application/json', ...NO_STORE } });
      }

      const res = await run();
      // A successful write changes what the cached reads should say: drop this organization's entries now.
      if (req.method !== 'GET' && res.status < 400) invalidateOrg(result.access.organizationId);
      return res;
    } catch (e) {
      // Let Next.js's own control-flow signals through (e.g. prerender bail-out).
      if ((e as { digest?: string })?.digest) throw e;
      // Log the class only: messages from the database layer can contain connection details.
      console.error('API error:', e instanceof Error ? e.name : 'Error', (e as { code?: string })?.code ?? '');
      return json({ error: 'Internal error' }, 500);
    } finally {
      await release(prisma);
    }
  };
}

export function parseCurrency(v: string | null): 'LYD' | 'USD' | null {
  return v === 'LYD' || v === 'USD' ? v : null;
}

/** Parse ?from&to[&prevFrom&prevTo]. Without prev*, the previous period is the same length right before `from`. */
export function parseRanges(sp: URLSearchParams): { range: Range; prev: Range } | null {
  const from = sp.get('from');
  const to = sp.get('to');
  if (!isIsoDate(from) || !isIsoDate(to) || from > to) return null;
  const range = { from, to };

  const pf = sp.get('prevFrom');
  const pt = sp.get('prevTo');
  if (pf !== null || pt !== null) {
    if (!isIsoDate(pf) || !isIsoDate(pt) || pf > pt) return null;
    return { range, prev: { from: pf, to: pt } };
  }
  const spec: PeriodSpec = { granularity: 'custom', anchor: from, customFrom: from, customTo: to };
  return { range, prev: previousRange(spec) ?? resolveRange(spec) };
}

/** Real "today" as an ISO date, overridable with ?asOf for tests. */
export function todayIso(sp?: URLSearchParams): string {
  const asOf = sp?.get('asOf');
  if (isIsoDate(asOf)) return asOf;
  return new Date().toISOString().slice(0, 10);
}
