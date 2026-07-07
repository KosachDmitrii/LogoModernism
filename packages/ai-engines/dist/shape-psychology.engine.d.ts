export interface ShapePsychologyInput {
    shapes: string[];
    industry?: string;
    brandPersonality?: string;
}
export interface ShapePsychologyResult {
    shape: string;
    emotions: string[];
    associations: string[];
    industryFit: number;
    culturalNotes: string[];
    recommendedUsage: string;
}
export declare function analyzeShapePsychology(input: ShapePsychologyInput): ShapePsychologyResult[];
export declare function getShapePsychologyForPrimitive(primitiveId: string): ShapePsychologyResult | null;
//# sourceMappingURL=shape-psychology.engine.d.ts.map