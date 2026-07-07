export function eraToInspiration(era: string): string {
  const map: Record<string, string> = {
    swiss: 'swiss',
    bauhaus: 'bauhaus',
    '1960s': 'olivetti',
    corporate_identity: 'ibm',
    'corporate identity': 'ibm',
    international_style: 'swiss',
    'international style': 'lufthansa',
    '1970s': 'braun',
    mid_century: 'olivetti',
    'mid century': 'olivetti',
  };
  const key = era.toLowerCase().replace(/\s+/g, ' ').trim();
  return map[key] ?? map[key.replace(/ /g, '_')] ?? '';
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
