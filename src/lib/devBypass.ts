import { ROLES, type Role } from './permissions.ts';

/**
 * DEVELOPMENT-ONLY test harness: lets automated UI checks run without a Clerk session.
 * Hard-gated on NODE_ENV === 'development' (never true in `next build`, `next start` or on Workers),
 * and DEV_AUTH_BYPASS_ROLE is not defined in any .env file. Covered by a unit test.
 */
export function devBypassRole(env: Record<string, string | undefined> = process.env): Role | null {
  if (env.NODE_ENV !== 'development') return null;
  const r = env.DEV_AUTH_BYPASS_ROLE as Role | undefined;
  return r && (ROLES as string[]).includes(r) ? r : null;
}