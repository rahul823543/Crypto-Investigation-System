/*
  Warnings:

  - A unique constraint covering the columns `[caseId,hash,chainId,fromAddress,toAddress,asset]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_caseId_fkey";

-- DropIndex
DROP INDEX "Transaction_hash_chainId_fromAddress_toAddress_asset_key";

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_caseId_hash_chainId_fromAddress_toAddress_asset_key" ON "Transaction"("caseId", "hash", "chainId", "fromAddress", "toAddress", "asset");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
