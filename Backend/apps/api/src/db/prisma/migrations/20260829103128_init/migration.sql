-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "rootAddress" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "riskScore" INTEGER,
    "riskLevel" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);
