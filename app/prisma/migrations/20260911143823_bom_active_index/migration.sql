-- DropIndex
DROP INDEX "BillOfMaterial_companyId_idx";

-- CreateIndex
CREATE INDEX "BillOfMaterial_companyId_isActive_idx" ON "BillOfMaterial"("companyId", "isActive");
