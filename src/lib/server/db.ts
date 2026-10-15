import { PrismaClient } from '@prisma/client';
// workerd resolves '@prisma/client' to the Node engine, which cannot run there; the wasm build can.
import { PrismaClient as PrismaClientWasm } from '@prisma/client/wasm';
import { PrismaNeon, PrismaNeonHTTP } from '@prisma/adapter-neon';
import { Pool, neon, types as neonTypes } from '@neondatabase/serverless';

const globalForPrisma = globalThis as unknown as { __agPrisma?: PrismaClient; __agPrismaRead?: PrismaClient };

/** True inside a Cloudflare Worker (workerd). */
export function isWorkers(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
}

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return url;
}

/**
 * Neon's HTTP driver parses dates into JS Date objects, but Prisma's adapter expects the raw text (the WebSocket
 * variant of the adapter configures this itself; the HTTP variant does not). These parsers mirror the adapter's own
 * for the types this app uses, so reads through the HTTP client return exactly what the WebSocket client returns.
 */
const RAW_TEXT_OIDS = new Set([1082 /* date */, 1083 /* time */, 1114 /* timestamp */, 114 /* json */, 3802 /* jsonb */, 1700 /* numeric */]);
const SPLIT_PLUS_OIDS = new Set([1184 /* timestamptz */, 1266 /* timetz */]);
const httpTypes = {
  getTypeParser: (oid: number, format?: string) => {
    if (format === undefined || format === 'text') {
      if (RAW_TEXT_OIDS.has(oid)) return (v: string) => v;
      if (SPLIT_PLUS_OIDS.has(oid)) return (v: string) => v.split('+')[0];
    }
    return neonTypes.getTypeParser(oid, format as 'text');
  },
};

/**
 * READ client. On Cloudflare Workers this is ONE client per Worker instance over Neon's HTTP driver (plain `fetch`
 * requests, no open sockets), so it is safe to reuse across requests: the expensive Prisma start-up happens once per
 * instance instead of on every request, which is what keeps reads inside the free plan's tiny CPU budget.
 * HTTP cannot run interactive transactions, so this client is for reads only. On Node it is the shared standard client.
 */
export function getReadPrisma(): PrismaClient {
  if (!isWorkers()) return getPrisma();
  if (!globalForPrisma.__agPrismaRead) {
    const base = neon(databaseUrl(), { arrayMode: false, fullResults: true });
    const withTypes = ((text: string, params?: unknown[], opts?: object) => base(text, params as unknown[], { ...opts, types: httpTypes } as never)) as unknown as typeof base;
    const adapter = new PrismaNeonHTTP(withTypes);
    globalForPrisma.__agPrismaRead = new PrismaClientWasm({ adapter, log: ['error'] }) as unknown as PrismaClient;
  }
  return globalForPrisma.__agPrismaRead;
}

/**
 * WRITE client (supports interactive transactions).
 * - Cloudflare Workers: a new client per request over Neon's WebSocket driver. Workers must not reuse sockets
 *   across requests, so it is created for the request and released afterwards (see `release`).
 * - Node (local dev, seed, CI): one shared client using Prisma's standard engine.
 */
export function getPrisma(): PrismaClient {
  const url = databaseUrl();

  if (isWorkers()) {
    const adapter = new PrismaNeon(new Pool({ connectionString: url }));
    return new PrismaClientWasm({ adapter, log: ['error'] }) as unknown as PrismaClient;
  }

  if (!globalForPrisma.__agPrisma) {
    globalForPrisma.__agPrisma = new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'] });
  }
  return globalForPrisma.__agPrisma;
}

/** Release a per-request client on Workers (a no-op for the shared clients). */
export async function release(prisma: PrismaClient | null): Promise<void> {
  if (prisma && isWorkers() && prisma !== globalForPrisma.__agPrismaRead) await prisma.$disconnect().catch(() => {});
}

/** Run `fn` with a write client and release it afterwards on Workers. */
export async function withDb<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  const prisma = getPrisma();
  try {
    return await fn(prisma);
  } finally {
    await release(prisma);
  }
}

/** Run `fn` with the shared read client (health checks, cached reads). */
export async function withReadDb<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  return fn(getReadPrisma());
}
