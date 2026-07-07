import { EnginesService } from './engines.service';
import { BrandDNARequestDto, LetterDNARequestDto, GeometryRequestDto, ReverseAnalysisRequestDto, FullPipelineRequestDto, SVGBlueprintRequestDto } from './dto/engine.dto';
import { runPromptPipeline } from '@logo-platform/prompt-engine';
export declare class EnginesController {
    private readonly engines;
    constructor(engines: EnginesService);
    getPrimitives(): import("@logo-platform/ai-engines").GeometryPrimitive[];
    getKnowledgeGraph(): import("@logo-platform/ai-engines").GraphVisualization;
    queryGraph(nodeId: string): import("@logo-platform/ai-engines").GraphQueryResult | null;
    brandDNA(body: BrandDNARequestDto): import("@logo-platform/ai-engines").BrandDNAProfile;
    letterDNA(body: LetterDNARequestDto): import("@logo-platform/ai-engines").LetterDNAProfile;
    geometry(body: GeometryRequestDto): import("@logo-platform/ai-engines").GeometryIntelligenceResult;
    typography(body: {
        companyName: string;
        industry: string;
        markType?: string;
    }): import("@logo-platform/ai-engines").TypographyIntelligenceResult;
    composition(body: {
        industry: string;
        markType?: string;
        hasNegativeSpace?: boolean;
    }): import("@logo-platform/ai-engines").CompositionAIResult;
    construction(body: SVGBlueprintRequestDto): import("@logo-platform/ai-engines").ConstructionSolution;
    svgBlueprint(body: SVGBlueprintRequestDto): import("@logo-platform/ai-engines").SVGBlueprint;
    reverseAnalysis(body: ReverseAnalysisRequestDto): import("@logo-platform/ai-engines").ReverseAnalysisResult;
    critique(body: {
        prompt: Parameters<typeof runPromptPipeline>[0] & {
            companyName: string;
        };
    }): import("@logo-platform/ai-engines").ExtendedCriticResult;
    evolution(body: {
        industry: string;
        companyName?: string;
    }): import("@logo-platform/ai-engines").EvolutionResult;
    fullPipeline(body: FullPipelineRequestDto): import("@logo-platform/ai-engines").FullPipelineResult;
}
