-- CreateEnum
CREATE TYPE "JobCardStatus" AS ENUM ('OPEN', 'BILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobCardItemType" AS ENUM ('PART', 'LABOR');

-- CreateTable
CREATE TABLE "Technician" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "specialization" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCard" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "customerLedgerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "vehicleRegNo" TEXT NOT NULL,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "odometerReading" DECIMAL(18,2),
    "complaint" TEXT NOT NULL,
    "status" "JobCardStatus" NOT NULL DEFAULT 'OPEN',
    "invoiceId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCardItem" (
    "id" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "itemType" "JobCardItemType" NOT NULL,
    "productId" TEXT,
    "technicianId" TEXT,
    "description" TEXT NOT NULL,
    "qty" DECIMAL(18,3) NOT NULL,
    "rate" DECIMAL(18,4) NOT NULL,
    "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxRateId" TEXT,
    "isNonTaxable" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobCardItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Technician_companyId_idx" ON "Technician"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "JobCard_invoiceId_key" ON "JobCard"("invoiceId");

-- CreateIndex
CREATE INDEX "JobCard_companyId_status_idx" ON "JobCard"("companyId", "status");

-- CreateIndex
CREATE INDEX "JobCard_companyId_vehicleRegNo_idx" ON "JobCard"("companyId", "vehicleRegNo");

-- CreateIndex
CREATE UNIQUE INDEX "JobCard_companyId_number_key" ON "JobCard"("companyId", "number");

-- CreateIndex
CREATE INDEX "JobCardItem_jobCardId_idx" ON "JobCardItem"("jobCardId");

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCardItem" ADD CONSTRAINT "JobCardItem_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCardItem" ADD CONSTRAINT "JobCardItem_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;
