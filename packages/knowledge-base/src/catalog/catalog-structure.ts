import type { CatalogMarkType, LogoMarkType, LogoReference } from '@logo-platform/shared';

/** Visual-form principles — structure-only mode never applies these from a mismatched ref. */
export const LIKENESS_PRINCIPLE_IDS = new Set([
  'mark-emblem',
  'mark-heraldic',
  'mark-pictogram',
  'mark-iconic-symbol',
  'mark-abstract-symbol',
  'mark-symbol-only',
]);

const ERA_LABELS: Record<string, string> = {
  swiss: 'International Typographic Style',
  bauhaus: 'Bauhaus geometric system',
  corporate_identity: 'Corporate identity modernism',
  '1960s': '1960s corporate identity',
  '1970s': '1970s systematic identity',
  mid_century: 'Mid-century modernist identity',
  international_style: 'International Typographic Style',
};

export function refMarkTypeMatchesBrief(
  refMarkType: CatalogMarkType | undefined,
  briefMarkType?: LogoMarkType,
): boolean {
  if (!refMarkType || !briefMarkType) return false;
  if (refMarkType === briefMarkType) return true;
  if (refMarkType === 'emblem' && briefMarkType === 'combination') return false;
  if (refMarkType === 'symbol' && briefMarkType === 'combination') return true;
  return false;
}

export function filterStructurePrincipleIds(
  ids: string[],
  briefMarkType?: LogoMarkType,
): string[] {
  return ids.filter((id) => {
    if (LIKENESS_PRINCIPLE_IDS.has(id)) return false;
    if (briefMarkType === 'combination' || briefMarkType === 'wordmark' || briefMarkType === 'lettermark') {
      if (id === 'mark-combination-mark' && briefMarkType === 'wordmark') return false;
      if (id.startsWith('typ-') && briefMarkType === 'combination') return false;
    }
    return true;
  });
}

export function describeCatalogStructureTransfer(ref: LogoReference): string[] {
  const labels: string[] = [];
  const geometry = ref.geometry?.filter(Boolean) ?? [];
  if (geometry.length) {
    labels.push(geometry.map((g) => g.replace(/_/g, ' ')).join(', '));
  }
  const construction = ref.construction?.filter(Boolean) ?? [];
  if (construction.length) {
    labels.push(construction.join(', '));
  }
  if (ref.era) {
    labels.push(ERA_LABELS[ref.era] ?? ref.era.replace(/_/g, ' '));
  }
  const composition = ref.composition?.filter(Boolean) ?? [];
  if (composition.length) {
    labels.push(composition.join(', '));
  }
  return labels.slice(0, 4);
}
