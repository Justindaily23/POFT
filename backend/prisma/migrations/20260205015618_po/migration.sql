/*
  Warnings:

  - A unique constraint covering the columns `[fileHash]` on the table `PoImportHistory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fileHash` to the `PoImportHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PoImportHistory" ADD COLUMN     "fileHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PoImportHistory_fileHash_key" ON "PoImportHistory"("fileHash");
