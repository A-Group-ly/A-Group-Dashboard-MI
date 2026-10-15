import { ROLES, type Role } from '@/lib/permissions';
import { badRequest, guard, json } from '@/lib/server/guard';
import { auditOp } from '@/lib/server/audit';

export const dynamic = 'force-dynamic';

/**
 * Change a member's role and / or activate or deactivate their access (admins only).
 * The organization is taken from the session, never from the request. The last active admin can neither be
 * demoted nor deactivated, and nobody can deactivate themselves.
 */
export const PATCH = guard<{ id: string }>('users:manage', async (req, access, prisma, ctx) => {
  const { id: membershipId } = await ctx.params;
  let body: { role?: string; isActive?: boolean };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const role = body.role as Role | undefined;
  if (role !== undefined && !ROLES.includes(role)) return badRequest('Invalid role');
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') return badRequest('Invalid isActive');
  if (role === undefined && body.isActive === undefined) return badRequest('Nothing to change');

  const target = await prisma.membership.findFirst({ where: { id: membershipId, organizationId: access.organizationId }, include: { user: true } });
  if (!target) return json({ error: 'Not found' }, 404);

  const losesAdmin = target.role === 'ADMIN' && ((role !== undefined && role !== 'ADMIN') || body.isActive === false);
  if (losesAdmin) {
    const activeAdmins = await prisma.membership.count({ where: { organizationId: access.organizationId, role: 'ADMIN', user: { isActive: true } } });
    if (activeAdmins <= 1) return json({ error: 'There must be at least one active admin' }, 409);
  }
  if (body.isActive === false && target.userId === access.userId) return json({ error: 'You cannot deactivate your own account' }, 409);

  const result = await prisma.$transaction(async (tx) => {
    const m = role !== undefined ? await tx.membership.update({ where: { id: target.id }, data: { role } }) : target;
    const u = body.isActive !== undefined ? await tx.user.update({ where: { id: target.userId }, data: { isActive: body.isActive } }) : target.user;
    const who = target.user.name ?? 'user';
    if (role !== undefined && role !== target.role) await auditOp(tx, access, 'user.role', 'User', target.userId, `Changed role of ${who} from ${target.role} to ${role}`);
    if (body.isActive !== undefined && body.isActive !== target.user.isActive) await auditOp(tx, access, body.isActive ? 'user.activate' : 'user.deactivate', 'User', target.userId, `${body.isActive ? 'Activated' : 'Deactivated'} ${who}`);
    return { role: m.role, isActive: u.isActive };
  });
  return json({ membershipId, ...result });
});
