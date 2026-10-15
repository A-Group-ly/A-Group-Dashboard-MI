import type { Prisma } from '@prisma/client';
import { guard, json } from '@/lib/server/guard';
import { parsePaging } from '@/lib/server/paging';

export const dynamic = 'force-dynamic';

const SORTS = ['time'] as const;

/** Who changed what, newest first (admins only). Paginated, searchable, filterable by entity. */
export const GET = guard('audit:view', async (req, access, prisma) => {
  const sp = new URL(req.url).searchParams;
  const p = parsePaging(sp, SORTS, 'time', 'desc');
  const where: Prisma.AuditLogWhereInput = { organizationId: access.organizationId };
  const entity = sp.get('entity');
  if (entity) where.entity = entity;
  if (p.q) {
    const c = { contains: p.q, mode: 'insensitive' as const };
    where.OR = [{ action: c }, { summary: c }, { actorName: c }, { entityId: c }];
  }
  const [rows, total, entities] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: [{ createdAt: p.dir }, { id: 'asc' }], skip: (p.page - 1) * p.pageSize, take: p.pageSize }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ['entity'], where: { organizationId: access.organizationId }, orderBy: { entity: 'asc' } }),
  ]);
  return json({
    data: rows.map((a) => ({ id: a.id, at: a.createdAt.toISOString(), actorName: a.actorName, actorRole: a.actorRole, action: a.action, entity: a.entity, entityId: a.entityId, summary: a.summary })),
    total,
    page: p.page,
    pageSize: p.pageSize,
    facets: { entities: entities.map((e) => e.entity) },
  });
});
