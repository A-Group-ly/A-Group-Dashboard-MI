import { guard, json } from '@/lib/server/guard';

export const dynamic = 'force-dynamic';

/** Members of the caller's organization and their roles (admins only). */
export const GET = guard('users:manage', async (_req, access, prisma) => {
  const rows = await prisma.membership.findMany({
    where: { organizationId: access.organizationId },
    include: { user: { select: { id: true, name: true, email: true, imageUrl: true, isActive: true, createdAt: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return json({
    data: rows.map((m) => ({
      membershipId: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      isActive: m.user.isActive,
      role: m.role,
      isYou: m.user.id === access.userId,
    })),
  });
});
