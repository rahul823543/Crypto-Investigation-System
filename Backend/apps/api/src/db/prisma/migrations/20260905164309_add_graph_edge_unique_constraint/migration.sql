-- CreateIndex
CREATE UNIQUE INDEX "GraphEdge_caseId_transactionHash_fromNodeId_toNodeId_key" ON "GraphEdge"("caseId", "transactionHash", "fromNodeId", "toNodeId");
