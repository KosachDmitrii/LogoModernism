import { Injectable } from '@nestjs/common';
import {
  analyzeBrandDNA,
  analyzeLetterDNA,
  analyzeGeometry,
  analyzeShapePsychology,
  analyzeTypography,
  solveConstruction,
  analyzeComposition,
  generateSVGBlueprint,
  reverseAnalyzeLogo,
  critiqueLogo,
  runEvolution,
  getKnowledgeGraphVisualization,
  queryKnowledgeGraph,
  runFullPipeline,
  GEOMETRY_PRIMITIVES,
} from '@logo-platform/ai-engines';
import type { ComposedPrompt } from '@logo-platform/shared';

@Injectable()
export class EnginesService {
  analyzeBrandDNA(input: Parameters<typeof analyzeBrandDNA>[0]) {
    return analyzeBrandDNA(input);
  }

  analyzeLetterDNA(input: Parameters<typeof analyzeLetterDNA>[0]) {
    return analyzeLetterDNA(input);
  }

  analyzeGeometry(input: Parameters<typeof analyzeGeometry>[0]) {
    return analyzeGeometry(input);
  }

  analyzeShapePsychology(shapes: string[], industry?: string) {
    return analyzeShapePsychology({ shapes, industry });
  }

  analyzeTypography(input: Parameters<typeof analyzeTypography>[0]) {
    return analyzeTypography(input);
  }

  solveConstruction(primitiveIds: string[]) {
    return solveConstruction({ primitiveIds });
  }

  analyzeComposition(input: Parameters<typeof analyzeComposition>[0]) {
    return analyzeComposition(input);
  }

  generateSVGBlueprint(primitiveIds: string[]) {
    const construction = solveConstruction({ primitiveIds });
    return generateSVGBlueprint({ primitiveIds, construction });
  }

  reverseAnalyze(input: Parameters<typeof reverseAnalyzeLogo>[0]) {
    return reverseAnalyzeLogo(input);
  }

  critique(prompt: ComposedPrompt) {
    return critiqueLogo({ prompt });
  }

  evolve(prompt: ComposedPrompt) {
    return runEvolution({ prompt, maxGenerations: 3 });
  }

  getKnowledgeGraph() {
    return getKnowledgeGraphVisualization();
  }

  queryGraph(nodeId: string) {
    return queryKnowledgeGraph(nodeId);
  }

  runFullPipeline(input: Parameters<typeof runFullPipeline>[0]) {
    return runFullPipeline(input);
  }

  getPrimitives() {
    return GEOMETRY_PRIMITIVES;
  }
}
