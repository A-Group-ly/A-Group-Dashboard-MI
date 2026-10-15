import type { NextRequest } from 'next/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { withDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

/**
 * Clerk -> local user sync. The signature is verified (CLERK_WEBHOOK_SIGNING_SECRET) before anything is read.
 * Idempotent: upsert on the unique clerkUserId. user.deleted deactivates (soft delete), never removes history.
 */
export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    if (evt.type === 'user.created' || evt.type === 'user.updated') {
      const u = evt.data;
      const email = u.email_addresses?.find((e) => e.id === u.primary_email_address_id)?.email_address ?? u.email_addresses?.[0]?.email_address ?? null;
      const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || null;
      await withDb((prisma) =>
        prisma.user.upsert({
          where: { clerkUserId: u.id },
          update: { email, name, imageUrl: u.image_url ?? null, isActive: true },
          create: { clerkUserId: u.id, email, name, imageUrl: u.image_url ?? null },
        })
      );
    } else if (evt.type === 'user.deleted' && evt.data.id) {
      const clerkUserId = evt.data.id;
      await withDb((prisma) => prisma.user.updateMany({ where: { clerkUserId }, data: { isActive: false } }));
    }
    return new Response(null, { status: 200 });
  } catch (e) {
    console.error('Webhook processing failed:', e instanceof Error ? e.name : 'Error');
    return new Response('Webhook processing failed', { status: 500 });
  }
}
