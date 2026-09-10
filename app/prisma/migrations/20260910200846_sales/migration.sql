-- CreateEnum
CREATE TYPE "SalesDocType" AS ENUM ('QUOTATION', 'SALES_ORDER', 'INVOICE', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "SalesDocStatus" AS ENUM ('DRAFT', 'OPEN', 'PARTIALLY_PAID', 'PAID', 'CONVERTED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CREDIT', 'CASH', 'BANK', 'CHEQUE', 'WALLET');

-- CreateTable
CREATE TABLE "SalesDoc" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "type" "SalesDocType" NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "customerLedgerId" TEXT,
    "customerName" TEXT,
    "customerPan" TEXT,
    "deliveryDate" DATE,
    "creditDays" INTEGER,
    "referenceNo" TEXT,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CREDIT',
    "paymentLedgerId" TEXT,
    "notes" TEXT,
    "convertedFromId" TEXT,
    "reversesDocId" TEXT,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lineDiscountTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "invoiceDiscount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "nonTaxableTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxableTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "SalesDocStatus" NOT NULL DEFAULT 'DRAFT',
    "voucherId" TEXT,
    "cogsVoucherId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesDocItem" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "hsCode" TEXT,
    "batchId" TEXT,
    "warehouseId" TEXT,
    "qty" DECIMAL(18,3) NOT NULL,
    "rate" DECIMAL(18,4) NOT NULL,
    "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxRateId" TEXT,
    "taxRatePct" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "isNonTaxable" BOOLEAN NOT NULL DEFAULT false,
    "priceInclusive" BOOLEAN NOT NULL DEFAULT false,
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "netAmount" DECIMAL(18,2) NOT NULL,
    "lineVat" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SalesDocItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "customerLedgerId" TEXT NOT NULL,
    "paymentLedgerId" TEXT NOT NULL,
    "againstDocId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "voucherId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesDoc_voucherId_key" ON "SalesDoc"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesDoc_cogsVoucherId_key" ON "SalesDoc"("cogsVoucherId");

-- CreateIndex
CREATE INDEX "SalesDoc_companyId_type_date_idx" ON "SalesDoc"("companyId", "type", "date");

-- CreateIndex
CREATE INDEX "SalesDoc_customerLedgerId_idx" ON "SalesDoc"("customerLedgerId");

-- CreateIndex
CREATE INDEX "SalesDoc_convertedFromId_idx" ON "SalesDoc"("convertedFromId");

-- CreateIndex
CREATE INDEX "SalesDoc_reversesDocId_idx" ON "SalesDoc"("reversesDocId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesDoc_companyId_number_key" ON "SalesDoc"("companyId", "number");

-- CreateIndex
CREATE INDEX "SalesDocItem_docId_idx" ON "SalesDocItem"("docId");

-- CreateIndex
CREATE INDEX "SalesDocItem_productId_idx" ON "SalesDocItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_voucherId_key" ON "Receipt"("voucherId");

-- CreateIndex
CREATE INDEX "Receipt_companyId_date_idx" ON "Receipt"("companyId", "date");

-- CreateIndex
CREATE INDEX "Receipt_customerLedgerId_idx" ON "Receipt"("customerLedgerId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_companyId_number_key" ON "Receipt"("companyId", "number");

-- AddForeignKey
ALTER TABLE "SalesDoc" ADD CONSTRAINT "SalesDoc_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesDoc" ADD CONSTRAINT "SalesDoc_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesDocItem" ADD CONSTRAINT "SalesDocItem_docId_fkey" FOREIGN KEY ("docId") REFERENCES "SalesDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_againstDocId_fkey" FOREIGN KEY ("againstDocId") REFERENCES "SalesDoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;
