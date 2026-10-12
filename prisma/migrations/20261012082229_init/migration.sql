-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('LYD', 'USD');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PAID', 'PENDING', 'UPCOMING');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'LOCAL_CARD', 'INTERNATIONAL_CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET', 'OTHER', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CASH_REGISTER', 'BANK_ACCOUNT', 'DIGITAL_WALLET', 'OTHER');

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" "Currency" NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PAID',
    "category" TEXT NOT NULL,
    "categoryAr" TEXT,
    "transactionDate" DATE NOT NULL,
    "dueDate" DATE,
    "reference" TEXT,
    "platformId" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "paymentProvider" TEXT,
    "accountId" TEXT,
    "externalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "currency" "Currency" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyBudget" (
    "id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "platformId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningBalance" (
    "id" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpeningBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Platform_code_key" ON "Platform"("code");

-- CreateIndex
CREATE INDEX "Platform_code_idx" ON "Platform"("code");

-- CreateIndex
CREATE INDEX "Platform_active_idx" ON "Platform"("active");

-- CreateIndex
CREATE INDEX "FinancialTransaction_currency_idx" ON "FinancialTransaction"("currency");

-- CreateIndex
CREATE INDEX "FinancialTransaction_type_idx" ON "FinancialTransaction"("type");

-- CreateIndex
CREATE INDEX "FinancialTransaction_status_idx" ON "FinancialTransaction"("status");

-- CreateIndex
CREATE INDEX "FinancialTransaction_category_idx" ON "FinancialTransaction"("category");

-- CreateIndex
CREATE INDEX "FinancialTransaction_platformId_idx" ON "FinancialTransaction"("platformId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_transactionDate_idx" ON "FinancialTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "FinancialTransaction_currency_transactionDate_idx" ON "FinancialTransaction"("currency", "transactionDate");

-- CreateIndex
CREATE INDEX "FinancialTransaction_platformId_currency_transactionDate_idx" ON "FinancialTransaction"("platformId", "currency", "transactionDate");

-- CreateIndex
CREATE INDEX "FinancialTransaction_paymentMethod_idx" ON "FinancialTransaction"("paymentMethod");

-- CreateIndex
CREATE INDEX "FinancialTransaction_accountId_idx" ON "FinancialTransaction"("accountId");

-- CreateIndex
CREATE INDEX "FinancialAccount_currency_idx" ON "FinancialAccount"("currency");

-- CreateIndex
CREATE INDEX "FinancialAccount_type_idx" ON "FinancialAccount"("type");

-- CreateIndex
CREATE INDEX "FinancialAccount_active_idx" ON "FinancialAccount"("active");

-- CreateIndex
CREATE INDEX "MonthlyBudget_month_idx" ON "MonthlyBudget"("month");

-- CreateIndex
CREATE INDEX "MonthlyBudget_currency_idx" ON "MonthlyBudget"("currency");

-- CreateIndex
CREATE INDEX "MonthlyBudget_platformId_idx" ON "MonthlyBudget"("platformId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyBudget_month_currency_platformId_key" ON "MonthlyBudget"("month", "currency", "platformId");

-- CreateIndex
CREATE INDEX "OpeningBalance_effectiveDate_idx" ON "OpeningBalance"("effectiveDate");

-- CreateIndex
CREATE INDEX "OpeningBalance_currency_idx" ON "OpeningBalance"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningBalance_effectiveDate_currency_key" ON "OpeningBalance"("effectiveDate", "currency");

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyBudget" ADD CONSTRAINT "MonthlyBudget_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
