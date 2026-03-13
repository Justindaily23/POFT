/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `PasswordResetToken` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "RefreshSession_expiresAt_idx";

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_userId_key" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshSession_deviceId_expiresAt_idx" ON "RefreshSession"("deviceId", "expiresAt");
