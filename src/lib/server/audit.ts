import type { Prisma } from '@prisma/client';
import type { Access } from './access';

/**
 * Audit trail entry for a successful change. Returned as a Prisma operation so it can run in the SAME
 * transaction as the change itself: if the audit row cannot be written, the change is rolled back (fail closed).
 * Summaries are short and never contain secrets or contact details.
 */
/** Works with the client or with an interactive-transaction client. */
export type AuditDb = Pick<Prisma.TransactionClient, 'auditLog'>;

export function auditOp(prisma: AuditDb, access: Access, action: string, entity: string, entityId: string | null, summary: string) {
  return prisma.auditLog.create({
    data: {
      organizationId: access.organizationId,
      actorUserId: access.userId,
      actorName: access.name,
      actorRole: access.role,
      action,
      entity,
      entityId,
      summary: summary.slice(0, 240),
    },
  });
}
