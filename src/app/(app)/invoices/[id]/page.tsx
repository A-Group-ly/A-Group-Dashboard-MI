import InvoiceDocument from '@/components/ops/InvoiceDocument';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceDocument id={id} />;
}
