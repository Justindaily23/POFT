-- 1. ADD the version column FIRST so it exists
ALTER TABLE "PurchaseOrderLine" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- 2. FIX existing NULL values for the other columns
UPDATE "PurchaseOrderLine" SET "totalRejectedAmount" = 0 WHERE "totalRejectedAmount" IS NULL;
UPDATE "PurchaseOrderLine" SET "totalRequestedAmount" = 0 WHERE "totalRequestedAmount" IS NULL;

-- 3. NOW enforce NOT NULL and SET DEFAULTS on the existing columns
ALTER TABLE "PurchaseOrderLine" ALTER COLUMN "totalRejectedAmount" SET NOT NULL;
ALTER TABLE "PurchaseOrderLine" ALTER COLUMN "totalRejectedAmount" SET DEFAULT 0;
ALTER TABLE "PurchaseOrderLine" ALTER COLUMN "totalRequestedAmount" SET NOT NULL;
ALTER TABLE "PurchaseOrderLine" ALTER COLUMN "totalRequestedAmount" SET DEFAULT 0;
