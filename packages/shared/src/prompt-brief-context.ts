import type { BriefContext, BrainGenerateRequest } from './brain-types';
import type { LogoMarkType, TypographyStyle } from './types';
import type { ResolvePromptSpecInput } from './prompt-spec';

export interface PolishPromptOptions {
  companyName?: string;
  markType?: LogoMarkType;
  typographyStyle?: TypographyStyle;
  industry?: string;
  colorPalette?: string;
  clientNotes?: string;
  constraints?: string;
  composition?: string;
  minimalismLevel?: number;
  geometry?: string;
  preferredShapes?: string;
  maxLength?: number;
}

export interface PromptBriefInput {
  companyName?: string;
  markType?: LogoMarkType;
  typographyStyle?: TypographyStyle;
  industry?: string;
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
    industry: input.industry,
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
    industry: request.industry,
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

const PARTNER_FEEDBACK_DROP_SENTENCE =
  /^(?:monochrome brief|prompt must include brand name|monochrome brief conflicts|monochrome brief must not|client forbids motif|brief (?:disallows|requires)|enriched prompt is unusually short|requested mark type|symbol-only brief)/i;

const PARTNER_FEEDBACK_NOISE_PATTERNS = [
  /\bgeneric stock sans(?:-serif)?\b/gi,
  /\bliteral oven\b/gi,
  /\bliteral flame\b/gi,
  /\bliteral pizza\b/gi,
  /\bcontrolled two[- ]?color palette\b/gi,
  /\bcolor approach:\s*controlled\b/gi,
];

function cleanPartnerFeedbackSentence(sentence: string): string {
  let cleaned = sentence.trim();
  for (const pattern of PARTNER_FEEDBACK_NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned
    .replace(/\bavoid\s*$/i, '')
    .replace(/—\s*$/i, '')
    .replace(/,\s*,+/g, ', ')
    .replace(/^\s*,\s*/, '')
    .replace(/,\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Strip diagnostic partner-retry noise before merging into brief constraints. */
export function sanitizePartnerConstraintAdditions(additions: string[]): string[] {
  const sentences = additions
    .flatMap((chunk) => chunk.split(/\.\s+/))
    .map((part) => part.trim())
    .filter(Boolean);

  const result: string[] = [];
  for (const sentence of sentences) {
    if (PARTNER_FEEDBACK_DROP_SENTENCE.test(sentence)) continue;
    const cleaned = cleanPartnerFeedbackSentence(sentence);
    if (cleaned.length < 12) continue;
    result.push(cleaned);
  }
  return result;
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

const GEOMETRY_SCORE_CLAUSE =
  /(?:^|\b)[\w][\w\s/-]{0,48}\(\d{1,2}\s*\/\s*10\)\s*:/i;
const GEOMETRY_SCORE_REASON_NOISE =
  /\b(?:general geometric foundation|matches preferred shape|aligns with \w+ for)\b/i;

export function sanitizeBriefNarrativeForPrompt(narrative: string): string {
  const trimmed = narrative.trim().replace(/\.+$/, '');
  if (!trimmed) return '';

  const clauses = trimmed
    .split(/\.\s+/)
    .map((clause) => clause.trim().replace(/\.+$/, ''))
    .filter((clause) => clause.length > 0)
    .filter((clause) => {
      if (GEOMETRY_SCORE_CLAUSE.test(clause)) return false;
      if (/\(\d{1,2}\s*\/\s*10\)/.test(clause)) return false;
      if (GEOMETRY_SCORE_REASON_NOISE.test(clause) && clause.length < 120) return false;
      return true;
    });

  return clauses.join('. ').trim();
}

export function hasLockedGeometryPreference(geometry?: string, preferredShapes?: string): boolean {
  const hay = `${geometry ?? ''} ${preferredShapes ?? ''}`.toLowerCase();
  return /\b(?:circle|square|triangle|angular|radial|grid|hexagon|arc|line)\b/.test(hay);
}

export function detectGeometryAxisConflict(haystack: string): boolean {
  const hay = haystack.toLowerCase();
  const angular = /\b(?:angular|triangle|square|chevron|diagonal)\b/.test(hay);
  const circular = /\b(?:circle|circular|round|radial|curve|arc|organic)\b/.test(hay);
  return angular && circular;
}
