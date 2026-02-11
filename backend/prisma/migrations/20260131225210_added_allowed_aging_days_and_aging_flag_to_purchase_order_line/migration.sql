-- CreateEnum
CREATE TYPE "PoAgingFlag" AS ENUM ('GREEN', 'WARNING', 'RED');

-- AlterTable
ALTER TABLE "PurchaseOrderLine" ADD COLUMN     "agingFlag" "PoAgingFlag" NOT NULL DEFAULT 'GREEN',
ADD COLUMN     "allowedOpenDays" INTEGER,
ADD COLUMN     "lastAgingNotifiedFlag" "PoAgingFlag",
ADD COLUMN     "poInvoiceDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_poLineStatus_allowedOpenDays_idx" ON "PurchaseOrderLine"("poLineStatus", "allowedOpenDays");
