import type { BriefContext } from './brain-types';

export type AbstractionLevel = 'abstract' | 'stylized' | 'recognizable';

export interface ClientVisualIntent {
  businessEssence: string;
  industryDomain: string;
  desiredMotifs: string[];
  forbiddenMotifs: string[];
  abstractionLevel: AbstractionLevel;
  personality: string[];
  visualTone: string[];
  explicitRequests: string[];
  confidence: number;
  source: 'rules' | 'llm' | 'hybrid';
}

const FORBIDDEN_PATTERNS = [
  /\b(?:no|not|never|avoid|without|don'?t want)\s+([^.,;]+)/gi,
  /\bexclude\s+([^.,;]+)/gi,
];

const ABSTRACT_SIGNALS = /\babstract(?:\s+form)?\s+only\b|\bno\s+literal\b|\bform\s+language\s+only\b/i;
const STYLIZED_SIGNALS = /\bstyli[sz]ed\b|\bdistinctive\s+silhouette\b/i;
const RECOGNIZABLE_SIGNALS =
  /\bliteral\b|\bexplicit(?:ly)?\s+show\b|\bclear(?:ly)?\s+show\b|\biconic\s+(?:of|for)\b|\brecognizable\s+(?:and\s+understandable|abstraction|symbol|silhouette)\b/i;

const FOOD_INDUSTRY_PATTERN =
  /\b(?:food|restaurant|pizza|cafe|bakery|beverage|culinary|dining)\b/i;

const INTERVIEW_BOILERPLATE_MOTIFS = new Set([
  'abstract geometry only',
  'stylized industry cue',
  'open to designer interpretation',
  'wordmark',
  'lettermark',
  'combination',
]);

/**
 * Style / rendering anti-patterns — handled by allowPhotoreal, allowShadows, palette,
 * and Avoid: lists. Must not become "client forbids motif" conflicts (that creates a loop
 * when keep-brief resolutions append "no photoreal" back into constraints).
 */
const STYLE_ANTI_PATTERN_MOTIFS = [
  'photoreal',
  'photorealism',
  'photorealistic',
  'mockup',
  'mockups',
  'gradient',
  'gradients',
  'shadow',
  'shadows',
  '3d',
  '3d render',
  'busy backgrounds',
  'stock clipart',
  'flat vector',
  'literal reference',
  'literal references',
  'literal clipart',
  'emblem badge format',
  'circular bracket template',
];

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item.trim());
  }
  return result;
}

/** True when a parsed "forbidden motif" is really a style rule, not a visual motif. */
export function isStyleAntiPatternMotif(motif: string): boolean {
  const lower = motif.toLowerCase().trim();
  if (!lower) return true;
  if (STYLE_ANTI_PATTERN_MOTIFS.some((item) => lower === item || lower.includes(item))) {
    return true;
  }
  // "never use photoreal" → extractForbidden can yield "use photoreal"
  if (/^use\s+/.test(lower) && STYLE_ANTI_PATTERN_MOTIFS.some((item) => lower.includes(item))) {
    return true;
  }
  return false;
}

function extractForbidden(text: string): string[] {
  const found: string[] = [];
  for (const pattern of FORBIDDEN_PATTERNS) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const chunk = match[1]?.trim();
      if (!chunk || chunk.length < 3) continue;
      for (const part of chunk.split(/\band\b|,|\//)) {
        const trimmed = part.trim();
        if (trimmed.length >= 3 && !isStyleAntiPatternMotif(trimmed)) found.push(trimmed);
      }
    }
  }
  return unique(found);
}

function extractDesiredFromNotes(notes: string): string[] {
  const motifs: string[] = [];
  const wantPattern = /\b(?:want|like|prefer|need|should (?:have|include|show)|looking for)\s+([^.,;]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = wantPattern.exec(notes)) !== null) {
    const chunk = match[1]?.trim();
    if (chunk && chunk.length >= 3) motifs.push(chunk);
  }
  return unique(motifs);
}

function detectAbstractionLevel(text: string, industry?: string): AbstractionLevel {
  if (ABSTRACT_SIGNALS.test(text)) return 'abstract';
  if (RECOGNIZABLE_SIGNALS.test(text)) return 'recognizable';
  if (STYLIZED_SIGNALS.test(text)) return 'stylized';
  if (industry && FOOD_INDUSTRY_PATTERN.test(industry)) return 'stylized';
  return 'stylized';
}

function filterInterviewMotifs(motifs: string[]): string[] {
  return motifs.filter((motif) => !INTERVIEW_BOILERPLATE_MOTIFS.has(motif.toLowerCase().trim()));
}

export function analyzeClientVisualIntent(input: {
  industry: string;
  companyName?: string;
  briefContext?: BriefContext;
}): ClientVisualIntent {
  const brief = input.briefContext;
  const notes = brief?.clientNotes?.trim() ?? '';
  const constraints = brief?.constraints?.trim() ?? '';
  const narrative = brief?.narrative?.trim() ?? '';
  const combined = [notes, constraints, narrative, brief?.personality, brief?.composition, brief?.geometry]
    .filter(Boolean)
    .join('. ');

  const forbiddenMotifs = extractForbidden(combined);
  const explicitRequests = filterInterviewMotifs(extractDesiredFromNotes(combined));
  const personality = unique(
    [brief?.personality, brief?.primaryEmotion].filter((v): v is string => Boolean(v?.trim())),
  );
  const visualTone = unique(
    [brief?.narrative, brief?.typography, brief?.composition].filter((v): v is string => Boolean(v?.trim())),
  );

  const businessEssence =
    notes ||
    narrative ||
    `${input.industry} brand${input.companyName ? ` (${input.companyName})` : ''}`;

  return {
    businessEssence,
    industryDomain: input.industry,
    desiredMotifs: explicitRequests,
    forbiddenMotifs,
    abstractionLevel: detectAbstractionLevel(combined, input.industry),
    personality,
    visualTone,
    explicitRequests,
    confidence: notes.length > 40 ? 0.85 : notes.length > 10 ? 0.65 : 0.45,
    source: 'rules',
  };
}

export function mergeClientVisualIntent(
  base: ClientVisualIntent,
  patch: Partial<ClientVisualIntent>,
): ClientVisualIntent {
  return {
    ...base,
    ...patch,
    desiredMotifs: unique([...base.desiredMotifs, ...(patch.desiredMotifs ?? [])]),
    forbiddenMotifs: unique(
      [...base.forbiddenMotifs, ...(patch.forbiddenMotifs ?? [])].filter(
        (motif) => !isStyleAntiPatternMotif(motif),
      ),
    ),
    personality: unique([...base.personality, ...(patch.personality ?? [])]),
    visualTone: unique([...base.visualTone, ...(patch.visualTone ?? [])]),
    explicitRequests: unique([...base.explicitRequests, ...(patch.explicitRequests ?? [])]),
    source: 'hybrid',
  };
}
