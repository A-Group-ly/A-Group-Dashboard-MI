import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMonthRangeUtc, isValidMonth } from '@/lib/month';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const month = searchParams.get('month'); // YYYY-MM format
    const currency = searchParams.get('currency'); // LYD or USD
    const status = searchParams.get('status'); // PAID, PENDING, UPCOMING
    const category = searchParams.get('category');
    const platformId = searchParams.get('platformId');
    const paymentMethod = searchParams.get('paymentMethod');
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (month) {
      if (!isValidMonth(month)) {
        return NextResponse.json(
          { error: 'Invalid month. Use YYYY-MM format' },
          { status: 400 }
        );
      }
      const { start, end } = getMonthRangeUtc(month);
      where.transactionDate = { gte: start, lte: end };
    }

    if (currency && ['LYD', 'USD'].includes(currency)) {
      where.currency = currency;
    }

    if (status && ['PAID', 'PENDING', 'UPCOMING'].includes(status)) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (platformId) {
      where.platformId = platformId;
    }

    if (paymentMethod && ['CASH', 'LOCAL_CARD', 'INTERNATIONAL_CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET', 'OTHER', 'NOT_APPLICABLE'].includes(paymentMethod)) {
      where.paymentMethod = paymentMethod;
    }

    // Execute queries
    const [transactions, total] = await Promise.all([
      prisma.financialTransaction.findMany({
        where,
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          account: {
            select: {
              id: true,
              name: true,
              type: true,
              currency: true,
            },
          },
        },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.financialTransaction.count({ where }),
    ]);

    // Convert Decimal to number for JSON serialization
    const serializedTransactions = transactions.map((tx: {
      id: string;
      description: string;
      descriptionAr: string | null;
      amount: { toNumber: () => number } | number;
      currency: string;
      type: string;
      status: string;
      category: string;
      categoryAr: string | null;
      transactionDate: Date;
      dueDate: Date | null;
      reference: string | null;
      platformId: string | null;
      platform: { id: string; name: string; code: string } | null;
      paymentMethod: string;
      paymentProvider: string | null;
      accountId: string | null;
      account: { id: string; name: string; type: string; currency: string } | null;
      externalReference: string | null;
      createdAt: Date;
      updatedAt: Date;
    }) => ({
      ...tx,
      amount: typeof tx.amount === 'number' ? tx.amount : tx.amount.toNumber(),
    }));

    return NextResponse.json({
      data: serializedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    // Let Next.js's own prerender bail-out signal through; it is not a failure.
    if ((error as { digest?: string })?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Transactions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}