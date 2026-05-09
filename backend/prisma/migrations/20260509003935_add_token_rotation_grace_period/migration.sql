-- AlterTable
ALTER TABLE "RefreshSession" ADD COLUMN     "previousRefreshToken" TEXT,
ADD COLUMN     "rotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
