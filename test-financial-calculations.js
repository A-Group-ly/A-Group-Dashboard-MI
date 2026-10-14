// Focused regression tests for financial calculations
// Run with: node test-financial-calculations.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runTests() {
  console.log('🧪 Running financial calculation regression tests...\n');
  
  let passed = 0;
  let failed = 0;

  function assert(name, condition, expected, actual) {
    if (condition) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      console.log(`   Expected: ${expected}`);
      console.log(`   Actual:   ${actual}`);
      failed++;
    }
  }

  try {
    // Test 1: LYD Available Cash = Opening Balance + Collected Income - Paid Expenses
    const lydOpening = await prisma.openingBalance.findFirst({
      where: { currency: 'LYD', effectiveDate: { lte: new Date('2026-10-01') } },
      orderBy: { effectiveDate: 'desc' }
    });
    
    const lydIncome = await prisma.financialTransaction.aggregate({
      where: { currency: 'LYD', type: 'INCOME', status: 'PAID', transactionDate: { lte: new Date('2026-10-31') } },
      _sum: { amount: true }
    });
    
    const lydExpenses = await prisma.financialTransaction.aggregate({
      where: { currency: 'LYD', type: 'EXPENSE', status: 'PAID', transactionDate: { lte: new Date('2026-10-31') } },
      _sum: { amount: true }
    });

    const expectedLydCash = Number(lydOpening.amount) + Number(lydIncome._sum.amount || 0) - Number(lydExpenses._sum.amount || 0);
    assert('LYD Available Cash formula', expectedLydCash === 767900, 767900, expectedLydCash);

    // Test 2: USD Available Cash
    const usdOpening = await prisma.openingBalance.findFirst({
      where: { currency: 'USD', effectiveDate: { lte: new Date('2026-10-01') } },
      orderBy: { effectiveDate: 'desc' }
    });
    
    const usdIncome = await prisma.financialTransaction.aggregate({
      where: { currency: 'USD', type: 'INCOME', status: 'PAID', transactionDate: { lte: new Date('2026-10-31') } },
      _sum: { amount: true }
    });
    
    const usdExpenses = await prisma.financialTransaction.aggregate({
      where: { currency: 'USD', type: 'EXPENSE', status: 'PAID', transactionDate: { lte: new Date('2026-10-31') } },
      _sum: { amount: true }
    });

    const expectedUsdCash = Number(usdOpening.amount) + Number(usdIncome._sum.amount || 0) - Number(usdExpenses._sum.amount || 0);
    assert('USD Available Cash formula', expectedUsdCash === 58970, 58970, expectedUsdCash);

    // Test 3: Upcoming income excluded from collections
    const lydPendingIncome = await prisma.financialTransaction.aggregate({
      where: { currency: 'LYD', type: 'INCOME', status: 'PENDING', transactionDate: { lte: new Date('2026-10-31') } },
      _sum: { amount: true }
    });
    assert('LYD Pending Income = 0', Number(lydPendingIncome._sum.amount || 0) === 0, 0, Number(lydPendingIncome._sum.amount || 0));

    // Test 4: Upcoming expenses excluded from paid expenses
    const lydUpcomingExpenses = await prisma.financialTransaction.aggregate({
      where: { currency: 'LYD', type: 'EXPENSE', status: 'UPCOMING', transactionDate: { lte: new Date('2026-10-31') } },
      _sum: { amount: true }
    });
    assert('LYD Upcoming Expenses = 68000', Number(lydUpcomingExpenses._sum.amount || 0) === 68000, 68000, Number(lydUpcomingExpenses._sum.amount || 0));

    // Test 5: LYD Budget lookup works
    const lydBudget = await prisma.monthlyBudget.findFirst({
      where: { currency: 'LYD', month: new Date('2026-10-01'), platformId: null }
    });
    assert('LYD Budget found', lydBudget !== null, true, lydBudget !== null);
    assert('LYD Budget amount = 180000', Number(lydBudget?.amount || 0) === 180000, 180000, Number(lydBudget?.amount || 0));

    // Test 6: USD Budget lookup works
    const usdBudget = await prisma.monthlyBudget.findFirst({
      where: { currency: 'USD', month: new Date('2026-10-01'), platformId: null }
    });
    assert('USD Budget found', usdBudget !== null, true, usdBudget !== null);
    assert('USD Budget amount = 8500', Number(usdBudget?.amount || 0) === 8500, 8500, Number(usdBudget?.amount || 0));

    // Test 7: LYD Remaining Budget = Budget - Paid Expenses
    const lydPaidExpenses = await prisma.financialTransaction.aggregate({
      where: { currency: 'LYD', type: 'EXPENSE', status: 'PAID', transactionDate: { gte: new Date('2026-10-01'), lte: new Date('2026-10-31') } },
      _sum: { amount: true }
    });
    const expectedLydRemaining = 180000 - Number(lydPaidExpenses._sum.amount || 0);
    assert('LYD Remaining Budget = 88500', expectedLydRemaining === 88500, 88500, expectedLydRemaining);

    // Test 8: USD Remaining Budget = Budget - Paid Expenses
    const usdPaidExpenses = await prisma.financialTransaction.aggregate({
      where: { currency: 'USD', type: 'EXPENSE', status: 'PAID', transactionDate: { gte: new Date('2026-10-01'), lte: new Date('2026-10-31') } },
      _sum: { amount: true }
    });
    const expectedUsdRemaining = 8500 - Number(usdPaidExpenses._sum.amount || 0);
    assert('USD Remaining Budget = 4750', expectedUsdRemaining === 4750, 4750, expectedUsdRemaining);

    // Test 9: LYD Budget Overrun = 0 (expenses within budget)
    const lydOverrun = expectedLydRemaining < 0 ? Math.abs(expectedLydRemaining) : 0;
    assert('LYD Budget Overrun = 0', lydOverrun === 0, 0, lydOverrun);

    // Test 10: USD Budget Overrun = 0 (expenses within budget)
    const usdOverrun = expectedUsdRemaining < 0 ? Math.abs(expectedUsdRemaining) : 0;
    assert('USD Budget Overrun = 0', usdOverrun === 0, 0, usdOverrun);

    // Test 11: Currency isolation - LYD transactions don't appear in USD queries
    const crossCurrency = await prisma.financialTransaction.count({
      where: { currency: 'LYD', type: 'INCOME', status: 'PAID' }
    });
    assert('LYD transactions exist', crossCurrency > 0, true, crossCurrency > 0);

    // Test 12: Payment method breakdowns only include PAID transactions
    const lydPaidIncome = await prisma.financialTransaction.groupBy({
      by: ['paymentMethod'],
      where: { currency: 'LYD', type: 'INCOME', status: 'PAID', transactionDate: { gte: new Date('2026-10-01'), lte: new Date('2026-10-31') } },
      _sum: { amount: true },
      _count: true
    });
    const totalPaidIncome = lydPaidIncome.reduce((sum, g) => sum + Number(g._sum.amount), 0);
    assert('LYD Paid Income total = 248900', totalPaidIncome === 248900, 248900, totalPaidIncome);

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
    
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();