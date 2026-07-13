import type { BriefContext, BrainGenerateRequest } from './brain-types';
import type { LogoMarkType, TypographyStyle } from './types';
import type { PolishPromptOptions } from './prompt-coherence';
import type { ResolvePromptSpecInput } from './prompt-spec';

export interface PromptBriefInput {
  companyName?: string;
  markType?: LogoMarkType;
  typographyStyle?: TypographyStyle;
  briefContext?: BriefContext;
  minimalismLevel?: number;
}

function complexityToMinimalism(complexity?: string): number | undefined {
  if (!complexity?.trim()) return undefined;
  if (complexity === 'minimal') return 9;
  if (complexity === 'medium') return 7;
  if (complexity === 'high') return 5;
  return undefined;
}

export function buildResolvePromptSpecInput(input: PromptBriefInput): ResolvePromptSpecInput {
  const brief = input.briefContext;
  return {
    companyName: input.companyName,
    markType: input.markType,
    typographyStyle: input.typographyStyle,
    colorPalette: brief?.colorPalette,
    clientNotes: brief?.clientNotes,
    constraints: brief?.constraints,
    composition: brief?.composition,
  };
}

export function buildPolishOptionsFromBrief(input: PromptBriefInput): PolishPromptOptions {
  const brief = input.briefContext;
  return {
    companyName: input.companyName,
    markType: input.markType,
    colorPalette: brief?.colorPalette,
    clientNotes: brief?.clientNotes,
    constraints: brief?.constraints,
    composition: brief?.composition,
    minimalismLevel:
      input.minimalismLevel ?? complexityToMinimalism(brief?.complexity),
    geometry: brief?.geometry,
    preferredShapes: brief?.preferredShapes,
  };
}

export function buildPolishOptionsFromRequest(request: BrainGenerateRequest): PolishPromptOptions {
  return buildPolishOptionsFromBrief({
    companyName: request.companyName,
    markType: request.markType,
    typographyStyle: request.typographyStyle,
    briefContext: request.briefContext,
    minimalismLevel: request.minimalismLevel,
  });
}

const MONOCHROME_PALETTES = new Set(['black_white', 'monochrome']);

/** Territory color line must not contradict locked brief palette. */
export function resolveTerritoryColorApproach(
  designColorSystem: string,
  colorPalette?: string,
): string {
  if (colorPalette && MONOCHROME_PALETTES.has(colorPalette)) {
    return 'Strict black and white only';
  }
  if (colorPalette === 'two_color') {
    return 'Controlled two-color palette';
  }
  if (colorPalette === 'multi_color' || colorPalette === 'limited' || colorPalette === 'custom') {
    return 'Controlled multi-color palette';
  }
  if (colorPalette === 'corporate_blue') {
    return 'Corporate blue-led palette';
  }
  if (colorPalette === 'red_accent') {
    return 'Red accent within restrained palette';
  }
  if (/black\s+and\s+white|monochrome|strict black/i.test(designColorSystem)) {
    return designColorSystem.replace(/\btwo[- ]?color\b/gi, 'monochrome').trim();
  }
  return designColorSystem;
}

/** Append constraint directives without duplicate sentences. */
export function appendUniqueConstraintSentences(
  existing: string | undefined,
  additions: string[],
): string {
  const parts = `${existing ?? ''}. ${additions.join('. ')}`
    .split(/\.\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const seen = new Set<string>();
  const unique: string[] = [];

  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(part);
  }

  return unique.join('. ');
}
