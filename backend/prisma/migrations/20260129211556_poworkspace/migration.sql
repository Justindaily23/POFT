/*
  Warnings:

  - You are about to drop the column `invoiceStatus` on the `PurchaseOrderLine` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[duid,poNumber]` on the table `PurchaseOrder` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PoLineStatus" AS ENUM ('NOT_INVOICED', 'INVOICED');

-- CreateEnum
CREATE TYPE "FundRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FUND_REQUEST_CREATED', 'FUND_REQUEST_APPROVED', 'FUND_REQUEST_REJECTED', 'CONTRACT_AMENDED');

-- DropForeignKey
ALTER TABLE "PurchaseOrderLine" DROP CONSTRAINT "PurchaseOrderLine_poTypeId_fkey";

-- DropIndex
DROP INDEX "PurchaseOrder_duid_idx";

-- DropIndex
DROP INDEX "PurchaseOrder_duid_key";

-- DropIndex
DROP INDEX "PurchaseOrderLine_invoiceStatus_idx";

-- AlterTable
ALTER TABLE "PurchaseOrder" ALTER COLUMN "projectName" DROP NOT NULL,
ALTER COLUMN "projectCode" DROP NOT NULL,
ALTER COLUMN "prNumber" DROP NOT NULL,
ALTER COLUMN "poNumber" DROP NOT NULL,
ALTER COLUMN "poIssuedDate" DROP NOT NULL,
ALTER COLUMN "pm" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseOrderLine" DROP COLUMN "invoiceStatus",
ADD COLUMN     "poLineStatus" "PoLineStatus" NOT NULL DEFAULT 'NOT_INVOICED',
ADD COLUMN     "remainingBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalApprovedAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ALTER COLUMN "poLineNumber" DROP NOT NULL,
ALTER COLUMN "itemCode" DROP NOT NULL,
ALTER COLUMN "itemDescription" DROP NOT NULL,
ALTER COLUMN "poTypeId" DROP NOT NULL,
ALTER COLUMN "unitPrice" DROP NOT NULL,
ALTER COLUMN "requestedQuantity" DROP NOT NULL,
ALTER COLUMN "poLineAmount" DROP NOT NULL;

-- CreateTable
CREATE TABLE "FundRequest" (
    "id" TEXT NOT NULL,
    "purchaseOrderLineId" TEXT NOT NULL,
    "requestedAmount" DECIMAL(15,2) NOT NULL,
    "requestPurpose" TEXT NOT NULL,
    "status" "FundRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractAmendment" (
    "id" TEXT NOT NULL,
    "purchaseOrderLineId" TEXT NOT NULL,
    "oldAmount" DECIMAL(15,2) NOT NULL,
    "newAmount" DECIMAL(15,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fundRequestId" TEXT,
    "type" "NotificationType" NOT NULL,
    "payload" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FundRequest_purchaseOrderLineId_idx" ON "FundRequest"("purchaseOrderLineId");

-- CreateIndex
CREATE INDEX "FundRequest_status_idx" ON "FundRequest"("status");

-- CreateIndex
CREATE INDEX "FundRequest_requestedBy_idx" ON "FundRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "ContractAmendment_purchaseOrderLineId_idx" ON "ContractAmendment"("purchaseOrderLineId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_duid_poNumber_key" ON "PurchaseOrder"("duid", "poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_poLineStatus_idx" ON "PurchaseOrderLine"("poLineStatus");

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_poTypeId_fkey" FOREIGN KEY ("poTypeId") REFERENCES "PoType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundRequest" ADD CONSTRAINT "FundRequest_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES "PurchaseOrderLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundRequest" ADD CONSTRAINT "FundRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundRequest" ADD CONSTRAINT "FundRequest_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAmendment" ADD CONSTRAINT "ContractAmendment_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES "PurchaseOrderLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_fundRequestId_fkey" FOREIGN KEY ("fundRequestId") REFERENCES "FundRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
