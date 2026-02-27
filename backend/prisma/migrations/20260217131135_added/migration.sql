-- AlterTable
ALTER TABLE "PurchaseOrderLine" ADD COLUMN     "totalRejectedAmount" DECIMAL(15,2),
ADD COLUMN     "totalRequestedAmount" DECIMAL(15,2);
