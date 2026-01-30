-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "duid" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "projectCode" TEXT NOT NULL,
    "prNumber" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "poIssuedDate" TIMESTAMP(3) NOT NULL,
    "pm" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "poLineNumber" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "poTypeId" TEXT NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "requestedQuantity" INTEGER NOT NULL,
    "poLineAmount" DECIMAL(15,2) NOT NULL,
    "contractAmount" DECIMAL(15,2),
    "invoiceStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoImportHistory" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "duidCount" INTEGER NOT NULL,
    "poCount" INTEGER NOT NULL,
    "poLineCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "errors" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoImportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_fullName_idx" ON "User"("fullName");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_duid_key" ON "PurchaseOrder"("duid");

-- CreateIndex
CREATE INDEX "PurchaseOrder_duid_idx" ON "PurchaseOrder"("duid");

-- CreateIndex
CREATE INDEX "PurchaseOrder_poNumber_idx" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_projectName_idx" ON "PurchaseOrder"("projectName");

-- CreateIndex
CREATE INDEX "PurchaseOrder_projectCode_idx" ON "PurchaseOrder"("projectCode");

-- CreateIndex
CREATE INDEX "PurchaseOrder_poIssuedDate_idx" ON "PurchaseOrder"("poIssuedDate");

-- CreateIndex
CREATE INDEX "PurchaseOrder_pm_idx" ON "PurchaseOrder"("pm");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_poLineNumber_idx" ON "PurchaseOrderLine"("poLineNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_itemCode_idx" ON "PurchaseOrderLine"("itemCode");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_unitPrice_idx" ON "PurchaseOrderLine"("unitPrice");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_requestedQuantity_idx" ON "PurchaseOrderLine"("requestedQuantity");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_poLineAmount_idx" ON "PurchaseOrderLine"("poLineAmount");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_poTypeId_idx" ON "PurchaseOrderLine"("poTypeId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_invoiceStatus_idx" ON "PurchaseOrderLine"("invoiceStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderLine_purchaseOrderId_poLineNumber_key" ON "PurchaseOrderLine"("purchaseOrderId", "poLineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PoType_code_key" ON "PoType"("code");

-- CreateIndex
CREATE INDEX "PoType_name_code_idx" ON "PoType"("name", "code");

-- CreateIndex
CREATE INDEX "PoImportHistory_status_idx" ON "PoImportHistory"("status");

-- CreateIndex
CREATE INDEX "PoImportHistory_createdAt_idx" ON "PoImportHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_poTypeId_fkey" FOREIGN KEY ("poTypeId") REFERENCES "PoType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
