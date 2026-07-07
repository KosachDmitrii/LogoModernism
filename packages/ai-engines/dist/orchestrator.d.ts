import { runPromptPipeline } from '@logo-platform/prompt-engine';
import { analyzeBrandDNA, type BrandDNAInput } from './brand-dna.engine';
import { analyzeLetterDNA } from './letter-dna.engine';
import { analyzeGeometry } from './geometry-intelligence.engine';
import { analyzeShapePsychology } from './shape-psychology.engine';
import { analyzeTypography } from './typography-intelligence.engine';
import { solveConstruction } from './construction-solver.engine';
import { analyzeComposition } from './composition-ai.engine';
import { generateSVGBlueprint } from './svg-blueprint.engine';
import { critiqueLogo } from './logo-critic.engine';
import { runEvolution } from './evolution.engine';
export interface FullPipelineInput {
    companyName: string;
    industry: string;
    variationCount?: number;
    inspirationMode?: BrandDNAInput['personality'];
    preferredEra?: BrandDNAInput['preferredEra'];
    markType?: 'symbol' | 'wordmark' | 'combination' | 'emblem';
}
export interface FullPipelineResult {
    brandDNA: ReturnType<typeof analyzeBrandDNA>;
    letterDNA: ReturnType<typeof analyzeLetterDNA>;
    geometry: ReturnType<typeof analyzeGeometry>;
    shapePsychology: ReturnType<typeof analyzeShapePsychology>;
    typography: ReturnType<typeof analyzeTypography>;
    composition: ReturnType<typeof analyzeComposition>;
    construction: ReturnType<typeof solveConstruction>;
    svgBlueprint: ReturnType<typeof generateSVGBlueprint>;
    prompts: ReturnType<typeof runPromptPipeline>;
    critique: ReturnType<typeof critiqueLogo>;
    evolution?: ReturnType<typeof runEvolution>;
}
export declare function runFullPipeline(input: FullPipelineInput): FullPipelineResult;
//# sourceMappingURL=orchestrator.d.ts.map