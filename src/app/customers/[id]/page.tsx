import { Suspense } from 'react';
import CustomerDetail from '@/components/ops/CustomerDetail';
import { PageSkeleton } from '@/components/ui/primitives';
import { CUSTOMERS } from '@/lib/subscriptionDemo';

export function generateStaticParams() {
  return CUSTOMERS.map((c) => ({ id: c.id }));
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetail id={id} />;
}

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}
