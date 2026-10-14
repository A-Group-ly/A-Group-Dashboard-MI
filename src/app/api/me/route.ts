import { guard, json } from '@/lib/server/guard';
import { ROLE_PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/** Who am I and what may I do. The UI uses this only to decide what to show; the server enforces everything. */
export const GET = guard(null, async (_req, access) =>
  json({
    name: access.name,
    email: access.email,
    imageUrl: access.imageUrl,
    role: access.role,
    permissions: ROLE_PERMISSIONS[access.role],
  })
);
