/*
  Warnings:

  - The values [ASSWORD_CHANGED] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('FUND_REQUEST_CREATED', 'FUND_REQUEST_APPROVED', 'FUND_REQUEST_REJECTED', 'CONTRACT_AMENDED', 'PO_AGING_WARNING', 'ACCOUNT_CREATED', 'PASSWORD_RESET', 'PASSWORD_CHANGED', 'PO_AGING_ALERT');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TABLE "FailedNotification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;
