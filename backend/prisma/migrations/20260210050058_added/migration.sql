-- CreateEnum
CREATE TYPE "FundRequestSource" AS ENUM ('STRUCTURED', 'MANUAL');

-- AlterTable
ALTER TABLE "FundRequest" ADD COLUMN     "source" "FundRequestSource" NOT NULL DEFAULT 'STRUCTURED';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "readAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FundRequestHistory" (
    "id" TEXT NOT NULL,
    "fundRequestId" TEXT NOT NULL,
    "purchaseOrderLineId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedAmount" DECIMAL(65,30) NOT NULL,
    "requestPurpose" TEXT NOT NULL,
    "status" "FundRequestStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundRequestHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FundRequestHistory_fundRequestId_idx" ON "FundRequestHistory"("fundRequestId");

-- CreateIndex
CREATE INDEX "FundRequestHistory_purchaseOrderLineId_idx" ON "FundRequestHistory"("purchaseOrderLineId");

-- CreateIndex
CREATE INDEX "FundRequestHistory_requestedBy_idx" ON "FundRequestHistory"("requestedBy");

-- CreateIndex
CREATE INDEX "Notification_fundRequestId_idx" ON "Notification"("fundRequestId");

-- CreateIndex
CREATE INDEX "Notification_sentAt_idx" ON "Notification"("sentAt");

-- CreateIndex
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "FundRequestHistory" ADD CONSTRAINT "FundRequestHistory_fundRequestId_fkey" FOREIGN KEY ("fundRequestId") REFERENCES "FundRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundRequestHistory" ADD CONSTRAINT "FundRequestHistory_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES "PurchaseOrderLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundRequestHistory" ADD CONSTRAINT "FundRequestHistory_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
