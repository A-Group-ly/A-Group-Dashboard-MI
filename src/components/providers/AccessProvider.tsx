'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { can as canRole, type Permission, type Role } from '@/lib/permissions';

export interface Me {
  name: string | null;
  email: string | null;
  imageUrl: string | null;
  role: Role;
  permissions: Permission[];
}

interface AccessValue {
  me: Me | null;
  loading: boolean;
  /** 401 / 403 from /api/me, otherwise null. */
  errorStatus: number | null;
  can: (p: Permission) => boolean;
}

const Ctx = createContext<AccessValue | null>(null);

/**
 * Loads the caller's profile and role once. This only drives what the UI shows;
 * every API route re-checks the role on the server.
 */
export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ me: Me | null; loading: boolean; errorStatus: number | null }>({ me: null, loading: true, errorStatus: null });

  useEffect(() => {
    const c = new AbortController();
    fetch('/api/me', { signal: c.signal, cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw Object.assign(new Error('http'), { status: res.status });
        setState({ me: (await res.json()) as Me, loading: false, errorStatus: null });
      })
      .catch((e: { name?: string; status?: number }) => {
        if (e?.name !== 'AbortError') setState({ me: null, loading: false, errorStatus: e?.status ?? 0 });
      });
    return () => c.abort();
  }, []);

  const value = useMemo<AccessValue>(
    () => ({ ...state, can: (p) => canRole(state.me?.role, p) }),
    [state]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccess(): AccessValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAccess must be used inside <AccessProvider>');
  return ctx;
}
