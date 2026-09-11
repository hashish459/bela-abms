-- CreateEnum
CREATE TYPE "PurchaseDocType" AS ENUM ('PURCHASE_ORDER', 'INVOICE', 'DEBIT_NOTE');

-- CreateEnum
CREATE TYPE "PurchaseDocStatus" AS ENUM ('DRAFT', 'OPEN', 'PARTIALLY_PAID', 'PAID', 'CONVERTED', 'CANCELLED', 'RETURNED');

-- CreateTable
CREATE TABLE "PurchaseDoc" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "type" "PurchaseDocType" NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "supplierLedgerId" TEXT,
    "supplierName" TEXT,
    "supplierPan" TEXT,
    "supplierInvoiceNumber" TEXT,
    "deliveryDate" DATE,
    "referenceNo" TEXT,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CREDIT',
    "paymentLedgerId" TEXT,
    "notes" TEXT,
    "convertedFromId" TEXT,
    "reversesDocId" TEXT,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lineDiscountTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "invoiceDiscount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalExciseDuty" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCustomDuty" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "nonTaxableTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxableTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "PurchaseDocStatus" NOT NULL DEFAULT 'DRAFT',
    "voucherId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseDocItem" (
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
    "exciseDuty" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "customDuty" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxRateId" TEXT,
    "taxRatePct" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "isNonTaxable" BOOLEAN NOT NULL DEFAULT false,
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "netAmount" DECIMAL(18,2) NOT NULL,
    "landedAmount" DECIMAL(18,2) NOT NULL,
    "landedUnitCost" DECIMAL(18,4) NOT NULL,
    "lineVat" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseDocItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "supplierLedgerId" TEXT NOT NULL,
    "paymentLedgerId" TEXT NOT NULL,
    "againstDocId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "voucherId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseDoc_voucherId_key" ON "PurchaseDoc"("voucherId");

-- CreateIndex
CREATE INDEX "PurchaseDoc_companyId_type_date_idx" ON "PurchaseDoc"("companyId", "type", "date");

-- CreateIndex
CREATE INDEX "PurchaseDoc_supplierLedgerId_idx" ON "PurchaseDoc"("supplierLedgerId");

-- CreateIndex
CREATE INDEX "PurchaseDoc_convertedFromId_idx" ON "PurchaseDoc"("convertedFromId");

-- CreateIndex
CREATE INDEX "PurchaseDoc_reversesDocId_idx" ON "PurchaseDoc"("reversesDocId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseDoc_companyId_number_key" ON "PurchaseDoc"("companyId", "number");

-- CreateIndex
CREATE INDEX "PurchaseDocItem_docId_idx" ON "PurchaseDocItem"("docId");

-- CreateIndex
CREATE INDEX "PurchaseDocItem_productId_idx" ON "PurchaseDocItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_voucherId_key" ON "SupplierPayment"("voucherId");

-- CreateIndex
CREATE INDEX "SupplierPayment_companyId_date_idx" ON "SupplierPayment"("companyId", "date");

-- CreateIndex
CREATE INDEX "SupplierPayment_supplierLedgerId_idx" ON "SupplierPayment"("supplierLedgerId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_companyId_number_key" ON "SupplierPayment"("companyId", "number");

-- AddForeignKey
ALTER TABLE "PurchaseDoc" ADD CONSTRAINT "PurchaseDoc_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDoc" ADD CONSTRAINT "PurchaseDoc_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDocItem" ADD CONSTRAINT "PurchaseDocItem_docId_fkey" FOREIGN KEY ("docId") REFERENCES "PurchaseDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_againstDocId_fkey" FOREIGN KEY ("againstDocId") REFERENCES "PurchaseDoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;
