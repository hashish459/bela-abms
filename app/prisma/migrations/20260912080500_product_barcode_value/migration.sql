-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "barcodeValue" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_companyId_barcodeValue_key" ON "Product"("companyId", "barcodeValue");
