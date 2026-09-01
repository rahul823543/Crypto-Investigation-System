-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "label" TEXT,
    "type" TEXT,
    "riskLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "tokenAddress" TEXT,
    "amount" TEXT NOT NULL,
    "amountUsd" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "transferType" TEXT NOT NULL,
    "method" TEXT,
    "rawProviderRef" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_address_chainId_key" ON "Wallet"("address", "chainId");

-- CreateIndex
CREATE INDEX "Transaction_caseId_idx" ON "Transaction"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_hash_chainId_fromAddress_toAddress_asset_key" ON "Transaction"("hash", "chainId", "fromAddress", "toAddress", "asset");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
