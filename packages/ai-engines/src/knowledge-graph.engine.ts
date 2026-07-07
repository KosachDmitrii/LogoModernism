import {
  designPrinciples,
  knowledgeGraph,
  getCompatiblePrinciples,
  getConflictingPrinciples,
} from '@logo-platform/knowledge-base';

export interface GraphNode {
  id: string;
  name: string;
  category: string;
  weight: number;
}

export interface GraphVisualization {
  nodes: GraphNode[];
  edges: { from: string; to: string; relation: string }[];
  clusters: { name: string; nodeIds: string[] }[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    avgCompatibility: number;
    conflictCount: number;
  };
}

export interface GraphQueryResult {
  node: GraphNode;
  compatible: GraphNode[];
  conflicts: GraphNode[];
  path: string[];
}

export function getKnowledgeGraphVisualization(): GraphVisualization {
  const nodes: GraphNode[] = designPrinciples.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    weight: p.weight,
  }));

  const edges = knowledgeGraph.map((e) => ({
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

export function queryKnowledgeGraph(nodeId: string): GraphQueryResult | null {
  const principle = designPrinciples.find((p) => p.id === nodeId);
  if (!principle) return null;

  const node: GraphNode = {
    id: principle.id,
    name: principle.name,
    category: principle.category,
    weight: principle.weight,
  };

  const compatible = getCompatiblePrinciples(nodeId).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    weight: p.weight,
  }));

  const conflictIds = getConflictingPrinciples([nodeId]).flat();
  const conflicts = designPrinciples
    .filter((p) => conflictIds.includes(p.id))
    .map((p) => ({ id: p.id, name: p.name, category: p.category, weight: p.weight }));

  const path = findShortestPath(nodeId);

  return { node, compatible, conflicts, path };
}

function findShortestPath(startId: string): string[] {
  const visited = new Set<string>();
  const queue: { id: string; path: string[] }[] = [{ id: startId, path: [startId] }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    const edges = knowledgeGraph.filter(
      (e) => e.from === current.id && e.relation !== 'conflicts_with',
    );

    for (const edge of edges) {
      const principle = designPrinciples.find((p) => p.id === edge.to);
      if (principle && !visited.has(edge.to)) {
        const newPath = [...current.path, edge.to];
        if (newPath.length >= 4) return newPath.map((id) => designPrinciples.find((p) => p.id === id)?.name ?? id);
        queue.push({ id: edge.to, path: newPath });
      }
    }
  }

  return [designPrinciples.find((p) => p.id === startId)?.name ?? startId];
}
