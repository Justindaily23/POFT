/*
  Warnings:

  - You are about to alter the column `requestedAmount` on the `FundRequestHistory` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(15,2)`.
  - Added the required column `snapshotContractAmount` to the `FundRequestHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `snapshotRemainingBalance` to the `FundRequestHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `snapshotTotalApproved` to the `FundRequestHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `snapshotTotalRejected` to the `FundRequestHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FundRequestHistory" ADD COLUMN     "snapshotContractAmount" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "snapshotRemainingBalance" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "snapshotTotalApproved" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "snapshotTotalRejected" DECIMAL(15,2) NOT NULL,
ALTER COLUMN "requestedAmount" SET DATA TYPE DECIMAL(15,2);
