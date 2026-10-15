import { PrismaClient } from '@prisma/client';
// workerd resolves '@prisma/client' to the Node engine, which cannot run there; the wasm build can.
import { PrismaClient as PrismaClientWasm } from '@prisma/client/wasm';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool } from '@neondatabase/serverless';

const globalForPrisma = globalThis as unknown as { __agPrisma?: PrismaClient };

/** True inside a Cloudflare Worker (workerd). */
export function isWorkers(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
}

/**
 * Database client.
 * - Cloudflare Workers: a new client per request over Neon's serverless driver (WebSockets). Workers must
 *   not reuse I/O objects across requests, so nothing is cached.
 * - Node (local dev, seed, CI): one shared client using Prisma's standard engine.
 */
export function getPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  if (isWorkers()) {
    const adapter = new PrismaNeon(new Pool({ connectionString: url }));
    return new PrismaClientWasm({ adapter, log: ['error'] }) as unknown as PrismaClient;
  }

  if (!globalForPrisma.__agPrisma) {
    globalForPrisma.__agPrisma = new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'] });
  }
  return globalForPrisma.__agPrisma;
}

/** Run `fn` with a client and release it afterwards on Workers. */
export async function withDb<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  const prisma = getPrisma();
  try {
    return await fn(prisma);
  } finally {
    if (isWorkers()) await prisma.$disconnect().catch(() => {});
  }
}
