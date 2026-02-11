/*
  Warnings:

  - You are about to drop the column `pm` on the `PurchaseOrder` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "PurchaseOrder_pm_idx";

-- AlterTable
ALTER TABLE "PurchaseOrder" DROP COLUMN "pm";

-- AlterTable
ALTER TABLE "PurchaseOrderLine" ADD COLUMN     "pm" TEXT;

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_pm_idx" ON "PurchaseOrderLine"("pm");
