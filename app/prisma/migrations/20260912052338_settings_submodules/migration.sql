-- CreateTable
CREATE TABLE "Bank" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "branch" TEXT,
    "swiftCode" TEXT,
    "ledgerId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomStatus" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CustomStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarcodeSetting" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "symbology" TEXT NOT NULL DEFAULT 'CODE128',
    "prefix" TEXT,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "labelWidthMm" INTEGER NOT NULL DEFAULT 40,
    "labelHeightMm" INTEGER NOT NULL DEFAULT 25,
    "showPrice" BOOLEAN NOT NULL DEFAULT true,
    "showName" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarcodeSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSetting" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "showHsCode" BOOLEAN NOT NULL DEFAULT true,
    "showDiscountColumn" BOOLEAN NOT NULL DEFAULT true,
    "showBankDetails" BOOLEAN NOT NULL DEFAULT true,
    "showQrCode" BOOLEAN NOT NULL DEFAULT true,
    "defaultTermsText" TEXT,
    "defaultNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceImportTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "columnMap" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InvoiceImportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillFooterSetting" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "termsAndConditions" TEXT,
    "bankAccountId" TEXT,
    "authorizedSignatory" TEXT,
    "footerNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillFooterSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bank_companyId_idx" ON "Bank"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Bank_companyId_name_key" ON "Bank"("companyId", "name");

-- CreateIndex
CREATE INDEX "BankAccount_companyId_idx" ON "BankAccount"("companyId");

-- CreateIndex
CREATE INDEX "BankAccount_bankId_idx" ON "BankAccount"("bankId");

-- CreateIndex
CREATE INDEX "CustomField_companyId_module_idx" ON "CustomField"("companyId", "module");

-- CreateIndex
CREATE INDEX "CustomStatus_companyId_module_idx" ON "CustomStatus"("companyId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "BarcodeSetting_companyId_key" ON "BarcodeSetting"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSetting_companyId_key" ON "InvoiceSetting"("companyId");

-- CreateIndex
CREATE INDEX "InvoiceImportTemplate_companyId_idx" ON "InvoiceImportTemplate"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "BillFooterSetting_companyId_key" ON "BillFooterSetting"("companyId");

-- AddForeignKey
ALTER TABLE "Bank" ADD CONSTRAINT "Bank_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomStatus" ADD CONSTRAINT "CustomStatus_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarcodeSetting" ADD CONSTRAINT "BarcodeSetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceSetting" ADD CONSTRAINT "InvoiceSetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceImportTemplate" ADD CONSTRAINT "InvoiceImportTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillFooterSetting" ADD CONSTRAINT "BillFooterSetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillFooterSetting" ADD CONSTRAINT "BillFooterSetting_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
