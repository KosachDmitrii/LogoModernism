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
}): 'standard' | 'constructed' | undefined {
  if (brief.typographyStyle === 'constructed' || brief.typographyStyle === 'standard') {
    return brief.typographyStyle;
  }

  const hay = `${brief.narrative ?? ''} ${brief.constraints ?? ''} ${brief.typography ?? ''}`.toLowerCase();
  if (hay.includes('typography style: constructed') || hay.includes('constructed typography')) {
    return 'constructed';
  }
  return undefined;
}

export function buildEffectiveIndustry(industry: string, extras: {
  geometry?: string;
  construction?: string;
  narrative?: string;
  preferredShapes?: string;
  typographyStyle?: 'standard' | 'constructed';
}): string {
  const parts = [industry.trim()];
  const skipGeometry = extras.typographyStyle === 'constructed';

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

/** Best-effort label for which Design Brief source set the era */
export function getEraSourceLabel(brief: {
  sources: string[];
  catalogReferenceIds?: string[];
}): string {
  if ((brief.catalogReferenceIds?.length ?? 0) > 0 && brief.sources.includes('Logo Catalog')) {
    return 'Logo Catalog';
  }
  if (brief.sources.includes('Brand DNA')) return 'Brand DNA';
  if (brief.sources.includes('Full Pipeline')) return 'Full Pipeline';
  if (brief.sources.includes('Knowledge Graph')) return 'Knowledge Graph';
  if (brief.sources.includes('Geometry')) return 'Geometry';
  return brief.sources[0] ?? 'Design Brief';
}
