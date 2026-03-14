-- CreateIndex
CREATE INDEX "FundRequest_status_createdAt_idx" ON "FundRequest"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "FundRequest_requestedBy_createdAt_idx" ON "FundRequest"("requestedBy", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PurchaseOrder_duid_idx" ON "PurchaseOrder"("duid");
