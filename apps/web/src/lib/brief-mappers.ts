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
  return tags.filter(Boolean).join(', ');
}

export function splitTags(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildEffectiveIndustry(industry: string, extras: {
  geometry?: string;
  construction?: string;
  narrative?: string;
  preferredShapes?: string;
}): string {
  const parts = [industry.trim()];
  const geometry = splitTags(extras.geometry ?? '');
  const construction = splitTags(extras.construction ?? '');
  const shapes = splitTags(extras.preferredShapes ?? '');

  if (geometry.length) parts.push(geometry.join(' '));
  if (construction.length) parts.push(construction.join(' '));
  if (shapes.length) parts.push(shapes.join(' '));
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
