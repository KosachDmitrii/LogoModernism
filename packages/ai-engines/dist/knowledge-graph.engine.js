"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKnowledgeGraphVisualization = getKnowledgeGraphVisualization;
exports.queryKnowledgeGraph = queryKnowledgeGraph;
const knowledge_base_1 = require("@logo-platform/knowledge-base");
function getKnowledgeGraphVisualization() {
    const nodes = knowledge_base_1.designPrinciples.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        weight: p.weight,
    }));
    const edges = knowledge_base_1.knowledgeGraph.map((e) => ({
        from: e.from,
        to: e.to,
        relation: e.relation,
    }));
    const categories = [...new Set(nodes.map((n) => n.category))];
    const clusters = categories.map((cat) => ({
        name: cat,
        nodeIds: nodes.filter((n) => n.category === cat).map((n) => n.id),
    }));
    const compatibleEdges = edges.filter((e) => e.relation !== 'conflicts_with');
    const conflictEdges = edges.filter((e) => e.relation === 'conflicts_with');
    return {
        nodes,
        edges,
        clusters,
        stats: {
            totalNodes: nodes.length,
            totalEdges: edges.length,
            avgCompatibility: compatibleEdges.length / Math.max(1, nodes.length),
            conflictCount: conflictEdges.length,
        },
    };
}
function queryKnowledgeGraph(nodeId) {
    const principle = knowledge_base_1.designPrinciples.find((p) => p.id === nodeId);
    if (!principle)
        return null;
    const node = {
        id: principle.id,
        name: principle.name,
        category: principle.category,
        weight: principle.weight,
    };
    const compatible = (0, knowledge_base_1.getCompatiblePrinciples)(nodeId).map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        weight: p.weight,
    }));
    const conflictIds = (0, knowledge_base_1.getConflictingPrinciples)([nodeId]).flat();
    const conflicts = knowledge_base_1.designPrinciples
        .filter((p) => conflictIds.includes(p.id))
        .map((p) => ({ id: p.id, name: p.name, category: p.category, weight: p.weight }));
    const path = findShortestPath(nodeId);
    return { node, compatible, conflicts, path };
}
function findShortestPath(startId) {
    const visited = new Set();
    const queue = [{ id: startId, path: [startId] }];
    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current.id))
            continue;
        visited.add(current.id);
        const edges = knowledge_base_1.knowledgeGraph.filter((e) => e.from === current.id && e.relation !== 'conflicts_with');
        for (const edge of edges) {
            const principle = knowledge_base_1.designPrinciples.find((p) => p.id === edge.to);
            if (principle && !visited.has(edge.to)) {
                const newPath = [...current.path, edge.to];
                if (newPath.length >= 4)
                    return newPath.map((id) => knowledge_base_1.designPrinciples.find((p) => p.id === id)?.name ?? id);
                queue.push({ id: edge.to, path: newPath });
            }
        }
    }
    return [knowledge_base_1.designPrinciples.find((p) => p.id === startId)?.name ?? startId];
}
//# sourceMappingURL=knowledge-graph.engine.js.map