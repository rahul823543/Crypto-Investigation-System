/*
  Warnings:

  - A unique constraint covering the columns `[caseId,hash,rawProviderRef]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Transaction_caseId_hash_chainId_fromAddress_toAddress_asset_key";

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_caseId_hash_rawProviderRef_key" ON "Transaction"("caseId", "hash", "rawProviderRef");
