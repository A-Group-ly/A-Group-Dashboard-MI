/**
 * Role -> permission matrix (plans/category-4: Admin, Finance, Analyst, Read-only).
 * Pure module: used by API guards (authoritative) and by the UI (convenience only; hiding a link is
 * never a security boundary).
 */
export type Role = 'ADMIN' | 'FINANCE' | 'ANALYST' | 'READ_ONLY';

export type Permission =
  | 'dashboard:view'
  | 'transactions:view'
  | 'budgets:view'
  | 'reports:view'
  | 'export:csv'
  | 'customers:view'
  | 'subscriptions:view'
  | 'alerts:view'
  | 'organizations:view'
  | 'users:manage'
  | 'settings:view';

const READ_ONLY: Permission[] = ['dashboard:view', 'settings:view'];
const ANALYST: Permission[] = [...READ_ONLY, 'transactions:view', 'budgets:view', 'reports:view', 'export:csv'];
const FINANCE: Permission[] = [...ANALYST, 'customers:view', 'subscriptions:view', 'alerts:view'];
const ADMIN: Permission[] = [...FINANCE, 'organizations:view', 'users:manage'];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  READ_ONLY,
  ANALYST,
  FINANCE,
  ADMIN,
};

export const ROLES: Role[] = ['ADMIN', 'FINANCE', 'ANALYST', 'READ_ONLY'];

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Which permission a UI route needs. Unlisted routes only need a signed-in user. */
export const ROUTE_PERMISSION: Record<string, Permission> = {
  '/': 'dashboard:view',
  '/transactions': 'transactions:view',
  '/budgets': 'budgets:view',
  '/reports': 'reports:view',
  '/customers': 'customers:view',
  '/subscriptions': 'subscriptions:view',
  '/alerts': 'alerts:view',
  '/organizations': 'organizations:view',
  '/settings': 'settings:view',
};

export function permissionForPath(pathname: string): Permission | null {
  if (pathname === '/') return ROUTE_PERMISSION['/'];
  const hit = Object.keys(ROUTE_PERMISSION)
    .filter((p) => p !== '/')
    .find((p) => pathname === p || pathname.startsWith(`${p}/`));
  return hit ? ROUTE_PERMISSION[hit] : null;
}
