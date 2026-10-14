'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAccess } from '@/components/providers/AccessProvider';
import { useApp } from '@/components/providers/AppProvider';
import { permissionForPath } from '@/lib/permissions';
import { Card, EmptyState, ErrorState, PageSkeleton } from '@/components/ui/primitives';

/**
 * Page-level access gate: shows "no access" instead of a page the role cannot use.
 * (Usability only: the API routes behind each page return 403 regardless.)
 */
export default function RouteGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me, loading, errorStatus, can } = useAccess();
  const { t } = useApp();

  if (loading) return <PageSkeleton />;
  if (errorStatus === 401) {
    return <ErrorState message={t('err.unauthorized')} onRetry={() => router.push('/sign-in')} />;
  }
  if (errorStatus === 403) return <EmptyState title={t('access.title')} body={t('err.forbidden')} />;
  if (errorStatus !== null || !me) return <ErrorState message={errorStatus === 0 ? t('err.network') : t('err.server')} onRetry={() => window.location.reload()} />;

  const needed = permissionForPath(pathname);
  if (needed && !can(needed)) {
    return (
      <Card>
        <EmptyState title={t('access.title')} body={t('access.body')} />
      </Card>
    );
  }
  return <>{children}</>;
}
