import SubscriptionDetail from '@/components/ops/SubscriptionDetail';

export default async function SubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SubscriptionDetail id={id} />;
}
