import { ROLES, type Role } from '@/lib/permissions';
import { badRequest, guard, json } from '@/lib/server/guard';

export const dynamic = 'force-dynamic';

/** Change a member's role (admins only). The organization is taken from the session, never from the request. */
export const PATCH = guard<{ id: string }>('users:manage', async (req, access, prisma, ctx) => {
  const { id: membershipId } = await ctx.params;
  let body: { role?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const role = body.role as Role | undefined;
  if (!role || !ROLES.includes(role)) return badRequest('Invalid role');

  const target = await prisma.membership.findFirst({ where: { id: membershipId, organizationId: access.organizationId } });
  if (!target) return json({ error: 'Not found' }, 404);

  if (target.role === 'ADMIN' && role !== 'ADMIN') {
    const admins = await prisma.membership.count({ where: { organizationId: access.organizationId, role: 'ADMIN' } });
    if (admins <= 1) return json({ error: 'There must be at least one admin' }, 409);
  }

  const updated = await prisma.membership.update({ where: { id: target.id }, data: { role } });
  return json({ membershipId: updated.id, role: updated.role });
});
