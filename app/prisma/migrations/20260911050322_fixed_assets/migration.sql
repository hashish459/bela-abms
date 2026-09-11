-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('BUILDING', 'COMPUTER', 'FURNITURE_FIXTURE', 'LAND', 'LEASEHOLD_DEVELOPMENT', 'OFFICE_EQUIPMENT', 'OTHER_ASSETS', 'PLANT_MACHINERY', 'VEHICLES');

-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'WRITTEN_DOWN_VALUE');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'DISPOSED');

-- CreateEnum
CREATE TYPE "DisposalType" AS ENUM ('SOLD', 'SCRAPPED', 'LOST_STOLEN_BROKEN');

-- CreateTable
CREATE TABLE "FixedAsset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AssetCategory" NOT NULL,
    "serialNumber" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "acquisitionDate" DATE NOT NULL,
    "acquisitionCost" DECIMAL(18,2) NOT NULL,
    "salvageValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "depreciationMethod" "DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "usefulLifeMonths" INTEGER,
    "depreciationRatePct" DECIMAL(7,4),
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CREDIT',
    "paymentLedgerId" TEXT,
    "supplierLedgerId" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "disposalDate" DATE,
    "disposalType" "DisposalType",
    "disposalProceeds" DECIMAL(18,2),
    "disposalLedgerId" TEXT,
    "disposalVoucherId" TEXT,
    "voucherId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetDepreciationEntry" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetDepreciationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepreciationRun" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "asOfDate" DATE NOT NULL,
    "assetCount" INTEGER NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "voucherId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepreciationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FixedAsset_disposalVoucherId_key" ON "FixedAsset"("disposalVoucherId");

-- CreateIndex
CREATE UNIQUE INDEX "FixedAsset_voucherId_key" ON "FixedAsset"("voucherId");

-- CreateIndex
CREATE INDEX "FixedAsset_companyId_category_idx" ON "FixedAsset"("companyId", "category");

-- CreateIndex
CREATE INDEX "FixedAsset_companyId_status_idx" ON "FixedAsset"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FixedAsset_companyId_assetCode_key" ON "FixedAsset"("companyId", "assetCode");

-- CreateIndex
CREATE INDEX "AssetDepreciationEntry_assetId_idx" ON "AssetDepreciationEntry"("assetId");

-- CreateIndex
CREATE INDEX "AssetDepreciationEntry_runId_idx" ON "AssetDepreciationEntry"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "DepreciationRun_voucherId_key" ON "DepreciationRun"("voucherId");

-- CreateIndex
CREATE INDEX "DepreciationRun_companyId_fiscalYearId_idx" ON "DepreciationRun"("companyId", "fiscalYearId");

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDepreciationEntry" ADD CONSTRAINT "AssetDepreciationEntry_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FixedAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDepreciationEntry" ADD CONSTRAINT "AssetDepreciationEntry_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DepreciationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepreciationRun" ADD CONSTRAINT "DepreciationRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepreciationRun" ADD CONSTRAINT "DepreciationRun_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
