import { guard, json } from '@/lib/server/guard';
import { readJson } from '@/lib/server/validate';
import { auditOp } from '@/lib/server/audit';
import { checkRefs, readTransaction } from '@/lib/server/transactions';

export const dynamic = 'force-dynamic';

/** Transactions booked from an invoice payment are owned by billing and cannot be edited or deleted here. */
async function billingManaged(prisma: import('@prisma/client').PrismaClient, org: string, reference: string | null) {
  if (!reference) return false;
  return (await prisma.invoice.count({ where: { organizationId: org, number: reference } })) > 0;
}

export const PATCH = guard<{ id: string }>('transactions:write', async (req, access, prisma, ctx) => {
  const { id } = await ctx.params;
  const org = access.organizationId;
  const existing = await prisma.financialTransaction.findFirst({ where: { id, organizationId: org } });
  if (!existing) return json({ error: 'Not found' }, 404);
  if (await billingManaged(prisma, org, existing.reference)) return json({ error: 'This transaction is booked from an invoice payment and is managed by billing' }, 409);

  const { r, data } = readTransaction(await readJson(req), true);
  if (!r.ok) return json({ error: 'Validation failed', fields: r.errors }, 422);
  if (Object.keys(data).length === 0) return json({ error: 'Nothing to change' }, 422);
  const refErrors = await checkRefs(prisma, org, data, (data.currency as string) ?? existing.currency);
  if (Object.keys(refErrors).length) return json({ error: 'Validation failed', fields: refErrors }, 422);

  const patch: Record<string, unknown> = { ...data };
  if (typeof data.transactionDate === 'string') patch.transactionDate = new Date(`${data.transactionDate}T00:00:00Z`);
  if ('dueDate' in data) patch.dueDate = data.dueDate ? new Date(`${data.dueDate}T00:00:00Z`) : null;

  await prisma.$transaction(async (tx) => {
    await tx.financialTransaction.update({ where: { id }, data: patch as never });
    await auditOp(tx, access, 'transaction.update', 'FinancialTransaction', id, `Edited transaction "${existing.description}"`);
  });
  return json({ id });
});

export const DELETE = guard<{ id: string }>('transactions:write', async (_req, access, prisma, ctx) => {
  const { id } = await ctx.params;
  const org = access.organizationId;
  const existing = await prisma.financialTransaction.findFirst({ where: { id, organizationId: org } });
  if (!existing) return json({ error: 'Not found' }, 404);
  if (await billingManaged(prisma, org, existing.reference)) return json({ error: 'This transaction is booked from an invoice payment and is managed by billing' }, 409);

  await prisma.$transaction(async (tx) => {
    await tx.financialTransaction.delete({ where: { id } });
    await auditOp(tx, access, 'transaction.delete', 'FinancialTransaction', id, `Deleted transaction "${existing.description}" (${existing.amount.toString()} ${existing.currency})`);
  });
  return json({ id });
});
