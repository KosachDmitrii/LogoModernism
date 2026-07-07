export interface GraphNode {
    id: string;
    name: string;
    category: string;
    weight: number;
}
export interface GraphVisualization {
    nodes: GraphNode[];
    edges: {
        from: string;
        to: string;
        relation: string;
    }[];
    clusters: {
        name: string;
        nodeIds: string[];
    }[];
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
export declare function getKnowledgeGraphVisualization(): GraphVisualization;
export declare function queryKnowledgeGraph(nodeId: string): GraphQueryResult | null;
//# sourceMappingURL=knowledge-graph.engine.d.ts.map