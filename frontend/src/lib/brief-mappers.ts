import type { BriefContextPayload } from '../types';
import {
  sanitizeBriefTagField,
  sanitizeCompositionField,
  resolveColorSelections,
  deriveRebusWordmark,
  isConstructedTypographyStyle,
  isTypographyStyle,
  type TypographyStyle,
} from '@logo-platform/shared';

export function eraToInspiration(era: string): string {
  const map: Record<string, string> = {
    swiss: 'swiss',
    bauhaus: 'bauhaus',
    '1960s': 'olivetti',
    corporate_identity: 'ibm',
    'corporate identity': 'ibm',
    international_style: 'lufthansa',
    'international style': 'lufthansa',
    '1970s': 'braun',
    mid_century: 'olivetti',
    'mid century': 'olivetti',
  };
  const key = era.toLowerCase().replace(/\s+/g, ' ').trim();
  return map[key] ?? map[key.replace(/ /g, '_')] ?? '';
}

/** Parse era label from Design Brief into API era value */
export function parseEraFromBrief(era?: string): string | undefined {
  if (!era?.trim()) return undefined;
  const normalized = era.toLowerCase().replace(/\s+/g, '_').trim();
  const valid = [
    'swiss',
    'bauhaus',
    'international_style',
    'corporate_identity',
    '1960s',
    '1970s',
    'mid_century',
  ];
  if (valid.includes(normalized)) return normalized;
  // fuzzy match
  if (normalized.includes('bauhaus')) return 'bauhaus';
  if (normalized.includes('1960')) return '1960s';
  if (normalized.includes('1970')) return '1970s';
  if (normalized.includes('corporate')) return 'corporate_identity';
  if (normalized.includes('mid') && normalized.includes('century')) return 'mid_century';
  if (normalized.includes('international')) return 'international_style';
  if (normalized.includes('swiss')) return 'swiss';
  return undefined;
}

export function complexityToMinimalism(complexity: string): number {
  if (complexity === 'minimal') return 9;
  if (complexity === 'medium') return 7;
  if (complexity === 'high') return 5;
  return 8;
}

export function joinTags(tags: string[]): string {
  return dedupeTags(tags).join(', ');
}

export function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of tags) {
    const trimmed = tag.trim();
    const key = trimmed.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

export function isMultiWordCompanyName(name: string): boolean {
  return name.trim().split(/\s+/).filter(Boolean).length > 1;
}

export function lettermarkTextFromName(name: string): string {
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length <= 1) {
    const cleaned = trimmed.replace(/[^A-Za-z0-9]/g, '');
    return cleaned || trimmed;
  }

  return words
    .slice(0, 3)
    .map((word) => word.replace(/[^A-Za-z]/g, '')[0] ?? '')
    .filter(Boolean)
    .join('')
    .toUpperCase();
}

export function parseMarkTypeFromBrief(brief: {
  markType?: string;
  composition?: string;
  constraints?: string;
  narrative?: string;
}): 'wordmark' | 'lettermark' | 'combination' | undefined {
  if (brief.markType === 'wordmark' || brief.markType === 'lettermark' || brief.markType === 'combination') {
    return brief.markType;
  }

  const hay = `${brief.composition ?? ''} ${brief.constraints ?? ''} ${brief.narrative ?? ''}`.toLowerCase();
  if (hay.includes('mark type: wordmark') || hay.includes('wordmark only')) return 'wordmark';
  if (hay.includes('mark type: lettermark') || hay.includes('lettermark')) return 'lettermark';
  if (hay.includes('mark type: combination')) return 'combination';
  return undefined;
}

const LOGO_MARK_TYPES = new Set(['wordmark', 'lettermark', 'combination']);

/** Normalize mark type for image generation API (rejects invalid / empty values). */
export function parseLogoMarkType(
  value: string | undefined,
  companyName?: string,
): 'wordmark' | 'lettermark' | 'combination' | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !LOGO_MARK_TYPES.has(trimmed)) return undefined;

  const markType = trimmed as 'wordmark' | 'lettermark' | 'combination';
  const hasBrandName = Boolean(companyName?.trim());

  if (!hasBrandName && (markType === 'wordmark' || markType === 'lettermark')) {
    return undefined;
  }

  return markType;
}

export function parseTypographyStyle(value: string | undefined): TypographyStyle | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !isTypographyStyle(trimmed)) return undefined;
  return trimmed;
}

export function splitTags(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseTypographyStyleFromBrief(brief: {
  typographyStyle?: string;
  narrative?: string;
  constraints?: string;
  typography?: string;
}): TypographyStyle | undefined {
  if (isTypographyStyle(brief.typographyStyle)) {
    return brief.typographyStyle;
  }

  const hay = `${brief.narrative ?? ''} ${brief.constraints ?? ''} ${brief.typography ?? ''}`.toLowerCase();
  if (hay.includes('rebus wordmark') || hay.includes('typography style: rebus')) return 'rebus';
  if (hay.includes('monogram ligature') || hay.includes('typography style: monogram_ligature')) {
    return 'monogram_ligature';
  }
  if (hay.includes('modified glyph') || hay.includes('typography style: modified_glyph')) {
    return 'modified_glyph';
  }
  if (hay.includes('typography style: constructed') || hay.includes('constructed typography')) {
    return 'constructed';
  }
  return undefined;
}

export function parseRebusWordmark(brief: {
  rebusWordmark?: boolean;
  typographyStyle?: string;
}): boolean {
  return deriveRebusWordmark(
    isTypographyStyle(brief.typographyStyle) ? brief.typographyStyle : undefined,
    brief.rebusWordmark,
  );
}

export function buildEffectiveIndustry(industry: string, extras: {
  geometry?: string;
  construction?: string;
  narrative?: string;
  preferredShapes?: string;
  typographyStyle?: TypographyStyle;
}): string {
  /** @deprecated Use base industry + briefContext API fields instead */
  const parts = [industry.trim()];
  const skipGeometry = isConstructedTypographyStyle(extras.typographyStyle);

  if (!skipGeometry) {
    const geometry = splitTags(extras.geometry ?? '');
    const construction = splitTags(extras.construction ?? '');
    const shapes = splitTags(extras.preferredShapes ?? '');

    if (geometry.length) parts.push(geometry.join(' '));
    if (construction.length) parts.push(construction.join(' '));
    if (shapes.length) parts.push(shapes.join(' '));
  }

  if (extras.narrative?.trim()) {
    parts.push(extras.narrative.trim().slice(0, 120));
  }

  return parts.filter(Boolean).join(', ');
}

export function designBriefToBriefContext(brief: {
  personality?: string;
  primaryEmotion?: string;
  complexity?: string;
  narrative?: string;
  typography?: string;
  composition?: string;
  constraints?: string;
  geometry?: string;
  construction?: string;
  preferredShapes?: string;
  colorPalette?: string;
  colorSelections?: string[];
  allowShadows?: boolean;
  allowPhotoreal?: boolean;
  clientNotes?: string;
  knowledgeInsights?: string;
  bestPromptHint?: string;
  critiqueNote?: string;
}): BriefContextPayload | undefined {
  const ctx: BriefContextPayload = {};
  const set = (key: keyof BriefContextPayload, value?: string) => {
    if (value?.trim()) ctx[key] = value.trim() as never;
  };

  set('personality', brief.personality);
  set('primaryEmotion', brief.primaryEmotion);
  set('complexity', brief.complexity);
  // User/Brand DNA narrative only — never dump for catalog Design brief note via duplicate path.
  set('narrative', brief.narrative);
  set('typography', brief.typography);
  set('composition', sanitizeCompositionField(brief.composition) || 'symmetry');
  set('constraints', brief.constraints);
  set('geometry', sanitizeBriefTagField(brief.geometry));
  set('construction', sanitizeBriefTagField(brief.construction));
  set('preferredShapes', sanitizeBriefTagField(brief.preferredShapes));

  if (brief.colorPalette && brief.colorPalette !== '' && brief.colorPalette !== 'auto') {
    ctx.colorPalette = brief.colorPalette as BriefContextPayload['colorPalette'];
    const colors = resolveColorSelections(brief.colorPalette, brief.colorSelections);
    if (colors.length > 0) {
      ctx.colorSelections = colors;
    }
  }
  if (brief.allowShadows) {
    ctx.allowShadows = true;
  }
  if (brief.allowPhotoreal) {
    ctx.allowPhotoreal = true;
  }
  set('clientNotes', brief.clientNotes);
  // Omit knowledgeInsights / bestPromptHint / critiqueNote — diagnostic ID dumps pollute LLM brief.

  return Object.keys(ctx).length > 0 ? ctx : undefined;
}

/** Best-effort key for which Design Brief source set the era */
export function getEraSourceKey(brief: {
  sources: string[];
  catalogReferenceIds?: string[];
}): import('../i18n').MessageKey {
  if ((brief.catalogReferenceIds?.length ?? 0) > 0 && brief.sources.includes('Logo Catalog')) {
    return 'brief.source.logoCatalog';
  }
  if (brief.sources.includes('Brand DNA')) return 'brief.source.brandDna';
  if (brief.sources.includes('Full Pipeline')) return 'brief.source.fullPipeline';
  if (brief.sources.includes('Knowledge Graph')) return 'brief.source.knowledgeGraph';
  if (brief.sources.includes('Geometry')) return 'brief.source.geometry';
  if (brief.sources.includes('Style')) return 'brief.source.style';
  if (brief.sources.includes('Client brief')) return 'brief.source.clientBrief';
  if (brief.sources.includes('Brain interview')) return 'brief.source.brainInterview';
  return 'brief.source.designBrief';
}

/** @deprecated use getEraSourceKey + t() */
export function getEraSourceLabel(brief: {
  sources: string[];
  catalogReferenceIds?: string[];
}): string {
  const labels: Partial<Record<ReturnType<typeof getEraSourceKey>, string>> = {
    'brief.source.logoCatalog': 'Logo Catalog',
    'brief.source.brandDna': 'Brand DNA',
    'brief.source.fullPipeline': 'Full Pipeline',
    'brief.source.knowledgeGraph': 'Knowledge Graph',
    'brief.source.geometry': 'Geometry',
    'brief.source.style': 'Style',
    'brief.source.clientBrief': 'Client brief',
    'brief.source.brainInterview': 'Brain interview',
    'brief.source.designBrief': 'Design Brief',
  };
  return labels[getEraSourceKey(brief)] ?? 'Design Brief';
}
