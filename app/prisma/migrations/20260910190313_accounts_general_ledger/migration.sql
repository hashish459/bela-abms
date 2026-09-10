-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('AS', 'LI', 'EQ', 'IN', 'EX');

-- CreateEnum
CREATE TYPE "CurrentType" AS ENUM ('CU', 'NC', 'O');

-- CreateEnum
CREATE TYPE "FinancialType" AS ENUM ('FI', 'NF', 'O');

-- CreateEnum
CREATE TYPE "BalanceType" AS ENUM ('DR', 'CR');

-- CreateEnum
CREATE TYPE "ContactKind" AS ENUM ('CUSTOMER', 'SUPPLIER', 'BOTH');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('OPENING', 'JOURNAL', 'CONTRA', 'STOCK', 'SALES', 'PURCHASE', 'RECEIPT', 'PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'EXPENSE');

-- CreateTable
CREATE TABLE "AccountHead" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "currentType" "CurrentType" NOT NULL DEFAULT 'O',
    "financialType" "FinancialType" NOT NULL DEFAULT 'O',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountHead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountGroup" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "accountHeadId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ledger" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "accountGroupId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "openingType" "BalanceType" NOT NULL DEFAULT 'DR',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contactKind" "ContactKind",
    "panNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "creditLimit" DECIMAL(18,2),
    "iecNo" TEXT,
    "gstin" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "VoucherType" NOT NULL,
    "narration" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherLine" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "narration" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VoucherLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberSequence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fiscalYearId" TEXT,
    "key" TEXT NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountHead_companyId_accountType_idx" ON "AccountHead"("companyId", "accountType");

-- CreateIndex
CREATE UNIQUE INDEX "AccountHead_companyId_code_key" ON "AccountHead"("companyId", "code");

-- CreateIndex
CREATE INDEX "AccountGroup_accountHeadId_idx" ON "AccountGroup"("accountHeadId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountGroup_companyId_code_key" ON "AccountGroup"("companyId", "code");

-- CreateIndex
CREATE INDEX "Ledger_accountGroupId_idx" ON "Ledger"("accountGroupId");

-- CreateIndex
CREATE INDEX "Ledger_companyId_contactKind_idx" ON "Ledger"("companyId", "contactKind");

-- CreateIndex
CREATE UNIQUE INDEX "Ledger_companyId_code_key" ON "Ledger"("companyId", "code");

-- CreateIndex
CREATE INDEX "Voucher_companyId_fiscalYearId_date_idx" ON "Voucher"("companyId", "fiscalYearId", "date");

-- CreateIndex
CREATE INDEX "Voucher_sourceType_sourceId_idx" ON "Voucher"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_companyId_number_key" ON "Voucher"("companyId", "number");

-- CreateIndex
CREATE INDEX "VoucherLine_voucherId_idx" ON "VoucherLine"("voucherId");

-- CreateIndex
CREATE INDEX "VoucherLine_ledgerId_idx" ON "VoucherLine"("ledgerId");

-- CreateIndex
CREATE UNIQUE INDEX "NumberSequence_companyId_fiscalYearId_key_key" ON "NumberSequence"("companyId", "fiscalYearId", "key");

-- AddForeignKey
ALTER TABLE "AccountHead" ADD CONSTRAINT "AccountHead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountGroup" ADD CONSTRAINT "AccountGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountGroup" ADD CONSTRAINT "AccountGroup_accountHeadId_fkey" FOREIGN KEY ("accountHeadId") REFERENCES "AccountHead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_accountGroupId_fkey" FOREIGN KEY ("accountGroupId") REFERENCES "AccountGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherLine" ADD CONSTRAINT "VoucherLine_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherLine" ADD CONSTRAINT "VoucherLine_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
