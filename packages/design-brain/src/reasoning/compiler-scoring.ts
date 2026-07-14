import type { CompileResult } from '@logo-platform/brief-compiler';
import type { BrainGenerateRequest, LogoDNA, PromptScores, TypographyStyle } from '@logo-platform/shared';
import { isConstructedTypographyStyle } from '@logo-platform/shared';
import { scorePrompt } from '@logo-platform/prompt-engine';

function mapEra(era: string): LogoDNA['era'] {
  const lower = era.toLowerCase();
  if (lower.includes('bauhaus')) return 'bauhaus';
  if (lower.includes('1960') || lower.includes('1970') || lower.includes('corporate')) {
    return 'corporate_identity';
  }
  if (lower.includes('international') || lower.includes('swiss') || lower.includes('typographic')) {
    return 'swiss';
  }
  return 'swiss';
}

export function dnaFromCompile(compile: CompileResult, request: BrainGenerateRequest): LogoDNA {
  const { resolved } = compile;
  const minimalism =
    resolved.minimalism === 'ultra' ? 9 : resolved.minimalism === 'moderate' ? 6 : 8;

  return {
    geometry: resolved.shapes,
    construction: [resolved.construction],
    balance: ['optically balanced'],
    complexity:
      resolved.minimalism === 'ultra'
        ? 'minimal'
        : resolved.minimalism === 'moderate'
          ? 'medium'
          : 'minimal',
    era: mapEra(resolved.era),
    typography: [typographyFocusLabel(resolved.typographyStyle)],
    recognition: request.companyName ? 8 : 6,
    minimalism: request.minimalismLevel ?? minimalism,
    visualWeight: ['medium'],
    harmony: ['geometric'],
  };
}

function typographyFocusLabel(style: TypographyStyle): string {
  if (style === 'rebus') return 'rebus wordmark letterforms';
  if (style === 'monogram_ligature') return 'monogram ligature letterforms';
  if (style === 'modified_glyph') return 'modified glyph letterforms';
  return isConstructedTypographyStyle(style)
    ? 'constructed geometric letterforms'
    : 'custom neo-grotesque';
}

export function scoreCompiledPrompt(
  text: string,
  compile: CompileResult,
  request: BrainGenerateRequest,
): PromptScores {
  return scorePrompt(text, [], dnaFromCompile(compile, request));
}
