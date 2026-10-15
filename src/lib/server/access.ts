import { auth, currentUser } from '@clerk/nextjs/server';
import { cache } from 'react';
import type { PrismaClient } from '@prisma/client';
import { TENANT_ORG_ID } from '../constants';
import type { Role } from '../permissions';
import { devBypassRole } from '../devBypass';
import { getPrisma, getReadPrisma, release } from './db';

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

async function ensureLocalUserOnce(read: PrismaClient, clerkUserId: string) {
  const existing = await read.user.findUnique({
    where: { clerkUserId },
    include: { memberships: { where: { organizationId: TENANT_ORG_ID }, take: 1 } },
  });
  if (existing?.memberships[0]) return { user: existing, membership: existing.memberships[0] };

  // First sign-in: mirror the Clerk user locally (the webhook does the same, idempotently).
  const cu = await currentUser();
  const email = cu?.primaryEmailAddress?.emailAddress ?? cu?.emailAddresses?.[0]?.emailAddress ?? null;
  const name = [cu?.firstName, cu?.lastName].filter(Boolean).join(' ') || cu?.username || null;

  const prisma = getPrisma(); // write client: needed only the very first time a person signs in
  try {
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
  } finally {
    await release(prisma);
  }
}

/**
 * The first page load fires several API calls at once; on a brand-new account each one tries to create the same
 * local user / membership. The database's unique keys let exactly one win, so the others (P2002) simply read the
 * rows the winner created.
 */
async function ensureLocalUser(prisma: PrismaClient, clerkUserId: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await ensureLocalUserOnce(prisma, clerkUserId);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code !== 'P2002' && code !== 'P2034') throw e;
      await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
    }
  }
  return ensureLocalUserOnce(prisma, clerkUserId);
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

  const { user, membership } = await ensureLocalUser(getReadPrisma(), clerkUserId);
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
