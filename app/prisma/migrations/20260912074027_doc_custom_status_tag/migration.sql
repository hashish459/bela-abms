-- AlterTable
ALTER TABLE "PurchaseDoc" ADD COLUMN     "customStatusId" TEXT;

-- AlterTable
ALTER TABLE "SalesDoc" ADD COLUMN     "customStatusId" TEXT;

-- AddForeignKey
ALTER TABLE "SalesDoc" ADD CONSTRAINT "SalesDoc_customStatusId_fkey" FOREIGN KEY ("customStatusId") REFERENCES "CustomStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDoc" ADD CONSTRAINT "PurchaseDoc_customStatusId_fkey" FOREIGN KEY ("customStatusId") REFERENCES "CustomStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
