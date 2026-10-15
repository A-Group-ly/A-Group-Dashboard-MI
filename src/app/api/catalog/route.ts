import { guard, json } from '@/lib/server/guard';
import { Reader, readJson } from '@/lib/server/validate';
import { auditOp } from '@/lib/server/audit';

export const dynamic = 'force-dynamic';

/** Products and their plans, for the "new subscription" pickers and the catalog view. */
export const GET = guard('subscriptions:view', async (_req, access, prisma) => {
  const products = await prisma.product.findMany({
    where: { organizationId: access.organizationId },
    orderBy: { name: 'asc' },
    include: { plans: { orderBy: [{ currency: 'asc' }, { price: 'asc' }] } },
  });
  return json({
    data: products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      status: p.status.toLowerCase(),
      plans: p.plans.map((pl) => ({
        id: pl.id,
        name: pl.name,
        interval: pl.interval.toLowerCase(),
        price: Number(pl.price.toString()),
        currency: pl.currency,
        trialDays: pl.trialDays,
        status: pl.status.toLowerCase(),
      })),
    })),
  });
});

/** Add a plan to an existing product, or create a new product together with its first plan (admins only). */
export const POST = guard('plans:write', async (req, access, prisma) => {
  const org = access.organizationId;
  const r = new Reader(await readJson(req));
  const productId = r.str('productId', { max: 80 });
  const productName = r.str('productName', { min: 2, max: 120 });
  const category = r.str('category', { max: 80 });
  const name = r.str('name', { min: 1, max: 80, required: true });
  const interval = r.oneOf('interval', ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const);
  const price = r.money('price');
  const currency = r.oneOf('currency', ['LYD', 'USD'] as const);
  const trialDays = r.int('trialDays', { min: 0, max: 90 }, false) ?? 0;
  if (!productId && !productName) r.errors.productId = 'required';
  if (!r.ok || !name || !interval || price === undefined || !currency) return json({ error: 'Validation failed', fields: r.errors }, 422);

  if (productId) {
    const p = await prisma.product.findFirst({ where: { id: productId, organizationId: org }, select: { id: true } });
    if (!p) return json({ error: 'Product not found', fields: { productId: 'not_found' } }, 404);
  }
  const dup = await prisma.plan.findFirst({
    where: { organizationId: org, name: { equals: name, mode: 'insensitive' }, currency, interval, product: productId ? { is: { id: productId } } : { is: { name: { equals: productName!, mode: 'insensitive' } } } },
    select: { id: true },
  });
  if (dup) return json({ error: 'A plan with this name, interval and currency already exists for the product', fields: { name: 'duplicate' } }, 409);

  const plan = await prisma.$transaction(async (tx) => {
    const pid = productId ?? (await tx.product.create({ data: { organizationId: org, name: productName!, category: category ?? null } })).id;
    const pl = await tx.plan.create({ data: { organizationId: org, productId: pid, name, interval, price, currency, trialDays } });
    await auditOp(tx, access, 'plan.create', 'Plan', pl.id, `Created plan ${name} (${price} ${currency}/${interval.toLowerCase()})`);
    return pl;
  });
  return json({ id: plan.id }, 201);
});
