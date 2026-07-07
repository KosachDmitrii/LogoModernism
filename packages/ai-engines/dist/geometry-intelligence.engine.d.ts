export interface GeometryAnalysisInput {
    industry: string;
    preferredShapes?: string[];
    complexity?: 'minimal' | 'medium' | 'high';
}
export interface GeometryRecommendation {
    primitiveId: string;
    name: string;
    score: number;
    reason: string;
    constructionSystem: string[];
    svgPreview: string;
}
export interface GeometryIntelligenceResult {
    recommendations: GeometryRecommendation[];
    constructionGrid: string;
    symmetryType: string;
    moduleSize: string;
    compatiblePrimitives: string[][];
}
export declare function analyzeGeometry(input: GeometryAnalysisInput): GeometryIntelligenceResult;
//# sourceMappingURL=geometry-intelligence.engine.d.ts.map