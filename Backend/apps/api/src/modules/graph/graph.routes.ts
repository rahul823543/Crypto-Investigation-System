import type { FastifyInstance } from "fastify";
import type {
  GraphNode,
  GraphEdge,
  NodeType,
  RiskLevel,
} from "@sih/shared-types";

export async function graphRoutes(app: FastifyInstance) {
  /**
   * GET /cases/:caseId/graph
   * Return all persisted GraphNode and GraphEdge rows for a case.
   * Returns 404 if the case does not exist.
   */
  app.get<{ Params: { caseId: string } }>(
    "/cases/:caseId/graph",
    async (request, reply) => {
      try {
        const { caseId } = request.params;

        const caseRecord = await app.prisma.case.findUnique({
          where: { id: caseId },
        });

        if (!caseRecord) {
          return reply.code(404).send({
            message: "Case not found",
          });
        }

        const [nodes, edges] = await Promise.all([
          app.prisma.graphNode.findMany({
            where: { caseId },
            orderBy: { createdAt: "asc" },
          }),
          app.prisma.graphEdge.findMany({
            where: { caseId },
            orderBy: { timestamp: "asc" },
          }),
        ]);

        const mappedNodes: GraphNode[] = nodes.map((node) => {
          let labels: string[] = [];
          try {
            labels = JSON.parse(node.labelsJson);
          } catch {
            labels = [];
          }

          return {
            id: node.id,
            caseId: node.caseId,
            address: node.address,
            type: node.type as NodeType,
            labels,
            riskLevel: (node.riskLevel as RiskLevel) ?? null,
            totalInUsd: node.totalInUsd,
            totalOutUsd: node.totalOutUsd,
            createdAt: node.createdAt.toISOString(),
          };
        });

        const mappedEdges: GraphEdge[] = edges.map((edge) => ({
          id: edge.id,
          caseId: edge.caseId,
          fromNodeId: edge.fromNodeId,
          toNodeId: edge.toNodeId,
          from: edge.fromNodeId,
          to: edge.toNodeId,
          transactionHash: edge.transactionHash,
          asset: edge.asset,
          amount: edge.amount,
          amountUsd: edge.amountUsd,
          timestamp: edge.timestamp.toISOString(),
          hopDepth: edge.hopDepth,
          riskLevel: (edge.riskLevel as RiskLevel) ?? null,
          createdAt: edge.createdAt.toISOString(),
        }));

        return reply.send({
          nodes: mappedNodes,
          edges: mappedEdges,
        });
      } catch (err) {
        app.log.error(err, "Failed to fetch graph");
        return reply.status(500).send({ error: "Failed to fetch graph" });
      }
    }
  );
}
