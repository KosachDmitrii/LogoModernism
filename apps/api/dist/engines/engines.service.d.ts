import { analyzeBrandDNA, analyzeLetterDNA, analyzeGeometry, analyzeTypography, analyzeComposition, reverseAnalyzeLogo, runFullPipeline } from '@logo-platform/ai-engines';
import type { ComposedPrompt } from '@logo-platform/shared';
export declare class EnginesService {
    analyzeBrandDNA(input: Parameters<typeof analyzeBrandDNA>[0]): import("@logo-platform/ai-engines").BrandDNAProfile;
    analyzeLetterDNA(input: Parameters<typeof analyzeLetterDNA>[0]): import("@logo-platform/ai-engines").LetterDNAProfile;
    analyzeGeometry(input: Parameters<typeof analyzeGeometry>[0]): import("@logo-platform/ai-engines").GeometryIntelligenceResult;
    analyzeShapePsychology(shapes: string[], industry?: string): import("@logo-platform/ai-engines").ShapePsychologyResult[];
    analyzeTypography(input: Parameters<typeof analyzeTypography>[0]): import("@logo-platform/ai-engines").TypographyIntelligenceResult;
    solveConstruction(primitiveIds: string[]): import("@logo-platform/ai-engines").ConstructionSolution;
    analyzeComposition(input: Parameters<typeof analyzeComposition>[0]): import("@logo-platform/ai-engines").CompositionAIResult;
    generateSVGBlueprint(primitiveIds: string[]): import("@logo-platform/ai-engines").SVGBlueprint;
    reverseAnalyze(input: Parameters<typeof reverseAnalyzeLogo>[0]): import("@logo-platform/ai-engines").ReverseAnalysisResult;
    critique(prompt: ComposedPrompt): import("@logo-platform/ai-engines").ExtendedCriticResult;
    evolve(prompt: ComposedPrompt): import("@logo-platform/ai-engines").EvolutionResult;
    getKnowledgeGraph(): import("@logo-platform/ai-engines").GraphVisualization;
    queryGraph(nodeId: string): import("@logo-platform/ai-engines").GraphQueryResult | null;
    runFullPipeline(input: Parameters<typeof runFullPipeline>[0]): import("@logo-platform/ai-engines").FullPipelineResult;
    getPrimitives(): import("@logo-platform/ai-engines").GeometryPrimitive[];
}
