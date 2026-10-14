import { auth, currentUser } from '@clerk/nextjs/server';
import { cache } from 'react';
import type { PrismaClient } from '@prisma/client';
import { TENANT_ORG_ID } from '../constants';
import type { Role } from '../permissions';
import { devBypassRole } from '../devBypass';
import { getPrisma } from './db';

export interface Access {
  userId: string;
  organizationId: string;
  role: Role;
  email: string | null;
  name: string | null;
  imageUrl: string | null;
}

export type AccessResult =
  | { status: 'ok'; access: Access }
  | { status: 'unauthenticated' }
  | { status: 'forbidden'; reason: 'inactive' | 'no-membership' };

async function ensureLocalUser(prisma: PrismaClient, clerkUserId: string) {
  const existing = await prisma.user.findUnique({
    where: { clerkUserId },
    include: { memberships: { where: { organizationId: TENANT_ORG_ID }, take: 1 } },
  });
  if (existing?.memberships[0]) return { user: existing, membership: existing.memberships[0] };

  // First sign-in: mirror the Clerk user locally (the webhook does the same, idempotently).
  const cu = await currentUser();
  const email = cu?.primaryEmailAddress?.emailAddress ?? cu?.emailAddresses?.[0]?.emailAddress ?? null;
  const name = [cu?.firstName, cu?.lastName].filter(Boolean).join(' ') || cu?.username || null;

  const user =
    existing ??
    (await prisma.user.upsert({
      where: { clerkUserId },
      update: {},
      create: { clerkUserId, email, name, imageUrl: cu?.imageUrl ?? null },
    }));

  // The very first person to sign in becomes ADMIN; everyone after starts as READ_ONLY and is promoted by an admin.
  const admins = await prisma.membership.count({ where: { organizationId: TENANT_ORG_ID, role: 'ADMIN' } });
  const membership = await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: TENANT_ORG_ID } },
    update: {},
    create: { userId: user.id, organizationId: TENANT_ORG_ID, role: admins === 0 ? 'ADMIN' : 'READ_ONLY' },
  });
  return { user, membership };
}

/** Resolve who is calling and what they may do. Fails closed. Memoised per request. */
export const getAccess = cache(async (): Promise<AccessResult> => {
  const bypass = devBypassRole();
  if (bypass) {
    return {
      status: 'ok',
      access: { userId: 'dev-user', organizationId: TENANT_ORG_ID, role: bypass, email: 'dev@example.test', name: 'Dev (test harness)', imageUrl: null },
    };
  }

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return { status: 'unauthenticated' };

  const prisma = getPrisma();
  const { user, membership } = await ensureLocalUser(prisma, clerkUserId);
  if (!user.isActive) return { status: 'forbidden', reason: 'inactive' };
  if (!membership) return { status: 'forbidden', reason: 'no-membership' };

  return {
    status: 'ok',
    access: {
      userId: user.id,
      organizationId: membership.organizationId,
      role: membership.role as Role,
      email: user.email,
      name: user.name,
      imageUrl: user.imageUrl,
    },
  };
});
