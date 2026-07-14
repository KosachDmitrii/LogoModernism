import type { BrainGenerateRequest, CreativeTerritory, TypographyStyle } from '@logo-platform/shared';
import type { CompileResult } from '@logo-platform/brief-compiler';
import { buildIndustryDirection, typographyStyleLabelFragment } from '@logo-platform/shared';

function colorApproachFromPalette(palette: string, selections: string[]): string {
  if (palette === 'black_white' || palette === 'monochrome') {
    return 'Strict black and white only';
  }
  if (palette === 'custom' && selections.length > 0) {
    return `Client palette (${selections.join(', ')})`;
  }
  if (palette === 'two_color') return 'Controlled two-color palette';
  if (palette === 'multi_color' || palette === 'limited') return 'Limited multi-color palette';
  if (palette === 'corporate_blue') return 'Corporate blue palette';
  if (palette === 'red_accent') return 'Red accent palette';
  return 'Controlled brand palette';
}

function typographyFocus(style: TypographyStyle): string {
  return typographyStyleLabelFragment(style);
}

function markArchitecture(markType: string): string {
  if (markType === 'wordmark') return 'Wordmark — custom letterforms as primary recognition';
  if (markType === 'lettermark') return 'Lettermark — monogram letterforms as primary recognition';
  return 'Combination mark — unified symbol and wordmark lockup sharing one geometric system';
}

function thesisForAxis(
  axis: 'balanced' | 'construction_led' | 'typography_led',
  industry: string,
  resolved: CompileResult['resolved'],
): string {
  const industryLine = buildIndustryDirection(industry, 'stylized', [], resolved.forbiddenMotifs);
  const base = industryLine.replace(/\.\s*Tone:.*$/i, '').trim();

  switch (axis) {
    case 'construction_led':
      return `Emphasize ${resolved.construction} as the hero system — form language before decoration. ${base}`;
    case 'typography_led':
      return `Lead with ${typographyFocus(resolved.typographyStyle)} as the primary recognition anchor. ${base}`;
    default:
      return `${base} Lead with ${markArchitecture(resolved.markType)}.`;
  }
}

function confidenceForAxis(
  axis: 'balanced' | 'construction_led' | 'typography_led',
  request: BrainGenerateRequest,
  promptQuality: number,
): number {
  const mark = request.markType ?? 'combination';
  let base = 0.68 + promptQuality / 50;

  if (axis === 'typography_led' && (mark === 'wordmark' || mark === 'lettermark')) base += 0.04;
  if (axis === 'construction_led' && /grid|modular/i.test(request.briefContext?.construction ?? '')) {
    base += 0.03;
  }
  if (axis === 'balanced') base += 0.02;

  return Math.min(0.95, Math.round(base * 100) / 100);
}

export function buildTerritoriesFromCompile(
  compile: CompileResult,
  request: BrainGenerateRequest,
): CreativeTerritory[] {
  const { resolved, prompts } = compile;
  const colorApproach = colorApproachFromPalette(resolved.colorPalette, resolved.colorSelections);
  const construction = resolved.construction;
  const typography = typographyFocus(resolved.typographyStyle);
  const architecture = markArchitecture(resolved.markType);

  const axisPrompts = {
    balanced: prompts.find((p) => p.schema.variantAxis === 'balanced') ?? prompts[0],
    construction_led: prompts.find((p) => p.schema.variantAxis === 'construction_led'),
    typography_led: prompts.find((p) => p.schema.variantAxis === 'typography_led'),
  };

  const qualityByAxis = (axis: keyof typeof axisPrompts) => {
    const prompt = axisPrompts[axis];
    if (!prompt) return 7.5;
    const len = prompt.positive.length;
    return Math.min(9.5, 6.5 + Math.min(2, len / 400) + (compile.validation.passed ? 1 : 0));
  };

  const primary: CreativeTerritory = {
    id: 'territory-primary',
    name: 'Primary direction',
    thesis: thesisForAxis('balanced', request.industry, resolved),
    markArchitecture: architecture,
    constructionFocus: construction,
    typographyFocus: typography,
    colorApproach,
    confidence: confidenceForAxis('balanced', request, qualityByAxis('balanced')),
    tradeoffs: ['Most aligned with brief and reference resolution'],
  };

  const constructionLed: CreativeTerritory = {
    id: 'territory-construction',
    name: 'Construction-led',
    thesis: thesisForAxis('construction_led', request.industry, resolved),
    markArchitecture: architecture,
    constructionFocus: construction,
    typographyFocus: 'Supportive geometric sans, subordinate to construction grid',
    colorApproach,
    confidence: confidenceForAxis('construction_led', request, qualityByAxis('construction_led')),
    tradeoffs: ['Stronger geometric rigor', 'Less expressive typography play'],
  };

  const typographyLed: CreativeTerritory = {
    id: 'territory-typography',
    name: 'Typography-led',
    thesis: thesisForAxis('typography_led', request.industry, resolved),
    markArchitecture:
      resolved.markType === 'combination'
        ? 'Unified lockup — typography and symbol share one grid'
        : architecture,
    constructionFocus: construction,
    typographyFocus: typography,
    colorApproach,
    confidence: confidenceForAxis('typography_led', request, qualityByAxis('typography_led')),
    tradeoffs: ['Best for wordmark/lettermark briefs', 'Weaker when symbol-only is required'],
  };

  return [primary, constructionLed, typographyLed];
}
