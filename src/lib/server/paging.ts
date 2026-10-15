/** Query-string paging helpers for server-side tables. Everything is validated against whitelists. */
export interface Paging {
  page: number;
  pageSize: number;
  sort: string;
  dir: 'asc' | 'desc';
  q: string;
}

export function parsePaging(sp: URLSearchParams, sorts: readonly string[], defaultSort: string, defaultDir: 'asc' | 'desc' = 'asc'): Paging {
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
  const rawSize = parseInt(sp.get('pageSize') ?? '25', 10);
  const pageSize = Number.isFinite(rawSize) ? Math.min(100, Math.max(1, rawSize)) : 25;
  const sortParam = sp.get('sort') ?? '';
  const sort = sorts.includes(sortParam) ? sortParam : defaultSort;
  const dir = sp.get('dir') === 'asc' ? 'asc' : sp.get('dir') === 'desc' ? 'desc' : defaultDir;
  // Search text is only ever used inside Prisma `contains` filters (parameterised); cap the length anyway.
  const q = (sp.get('q') ?? '').trim().slice(0, 80);
  return { page, pageSize, sort, dir, q };
}

/** Accept a value only if it is one of the allowed (upper-case) enum members; otherwise null. */
export function enumParam<T extends string>(v: string | null, allowed: readonly T[]): T | null {
  if (!v) return null;
  const up = v.toUpperCase() as T;
  return allowed.includes(up) ? up : null;
}
