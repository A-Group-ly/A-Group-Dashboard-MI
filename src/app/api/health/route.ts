import { withDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

/** Public liveness / readiness probe. Reveals nothing beyond "connected or not". */
export async function GET() {
  try {
    await withDb((prisma) => prisma.$queryRaw`SELECT 1`);
    return Response.json({ status: 'healthy', timestamp: new Date().toISOString(), database: 'connected' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if ((e as { digest?: string })?.digest) throw e;
    console.error('Health check failed:', e instanceof Error ? e.name : 'Error');
    return Response.json(
      { status: 'unhealthy', timestamp: new Date().toISOString(), database: 'disconnected' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
