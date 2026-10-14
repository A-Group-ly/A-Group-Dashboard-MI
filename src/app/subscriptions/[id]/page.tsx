import { Suspense } from 'react';
import SubscriptionDetail from '@/components/ops/SubscriptionDetail';
import { PageSkeleton } from '@/components/ui/primitives';
import { SUBSCRIPTIONS } from '@/lib/subscriptionDemo';

export function generateStaticParams() {
  return SUBSCRIPTIONS.map((s) => ({ id: s.id }));
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SubscriptionDetail id={id} />;
}

export default function SubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}
