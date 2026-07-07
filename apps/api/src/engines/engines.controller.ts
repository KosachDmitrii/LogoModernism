import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { EnginesService } from './engines.service';
import {
  BrandDNARequestDto,
  LetterDNARequestDto,
  GeometryRequestDto,
  ReverseAnalysisRequestDto,
  FullPipelineRequestDto,
  SVGBlueprintRequestDto,
} from './dto/engine.dto';
import { runPromptPipeline } from '@logo-platform/prompt-engine';

@Controller('engines')
export class EnginesController {
  constructor(private readonly engines: EnginesService) {}

  @Get('primitives')
  getPrimitives() {
    return this.engines.getPrimitives();
  }

  @Get('knowledge-graph')
  getKnowledgeGraph() {
    return this.engines.getKnowledgeGraph();
  }

  @Get('knowledge-graph/:nodeId')
  queryGraph(@Param('nodeId') nodeId: string) {
    return this.engines.queryGraph(nodeId);
  }

  @Post('brand-dna')
  brandDNA(@Body() body: BrandDNARequestDto) {
    return this.engines.analyzeBrandDNA(body);
  }

  @Post('letter-dna')
  letterDNA(@Body() body: LetterDNARequestDto) {
    return this.engines.analyzeLetterDNA(body);
  }

  @Post('geometry')
  geometry(@Body() body: GeometryRequestDto) {
    return this.engines.analyzeGeometry(body);
  }

  @Post('typography')
  typography(@Body() body: { companyName: string; industry: string; markType?: string }) {
    return this.engines.analyzeTypography({
      companyName: body.companyName,
      industry: body.industry,
      markType: body.markType as never,
    });
  }

  @Post('composition')
  composition(@Body() body: { industry: string; markType?: string; hasNegativeSpace?: boolean }) {
    return this.engines.analyzeComposition({
      industry: body.industry,
      markType: body.markType as never,
      hasNegativeSpace: body.hasNegativeSpace,
    });
  }

  @Post('construction')
  construction(@Body() body: SVGBlueprintRequestDto) {
    return this.engines.solveConstruction(body.primitiveIds);
  }

  @Post('svg-blueprint')
  svgBlueprint(@Body() body: SVGBlueprintRequestDto) {
    return this.engines.generateSVGBlueprint(body.primitiveIds);
  }

  @Post('reverse-analysis')
  reverseAnalysis(@Body() body: ReverseAnalysisRequestDto) {
    return this.engines.reverseAnalyze(body);
  }

  @Post('critique')
  critique(@Body() body: { prompt: Parameters<typeof runPromptPipeline>[0] & { companyName: string } }) {
    const pipeline = runPromptPipeline(body.prompt);
    return this.engines.critique(pipeline.bestPrompt);
  }

  @Post('evolution')
  evolution(@Body() body: { industry: string; companyName?: string }) {
    const pipeline = runPromptPipeline(body);
    return this.engines.evolve(pipeline.bestPrompt);
  }

  @Post('pipeline')
  fullPipeline(@Body() body: FullPipelineRequestDto) {
    return this.engines.runFullPipeline(body);
  }
}
