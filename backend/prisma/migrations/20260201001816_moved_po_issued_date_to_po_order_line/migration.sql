/*
  Warnings:

  - You are about to drop the column `poIssuedDate` on the `PurchaseOrder` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "PurchaseOrder_poIssuedDate_idx";

-- AlterTable
ALTER TABLE "PurchaseOrder" DROP COLUMN "poIssuedDate";

-- AlterTable
ALTER TABLE "PurchaseOrderLine" ADD COLUMN     "poIssuedDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_poIssuedDate_idx" ON "PurchaseOrderLine"("poIssuedDate");
