type CatalogEntryLike = {
  geometry?: string[];
  construction?: string[];
  composition?: string[];
  era?: string;
};

const ERA_LABELS: Record<string, string> = {
  swiss: 'International Typographic Style',
  bauhaus: 'Bauhaus',
  corporate_identity: 'Corporate identity',
  '1960s': '1960s',
  '1970s': '1970s',
  mid_century: 'Mid-century',
  international_style: 'International Typographic Style',
};

export function catalogStructureLabels(entry: CatalogEntryLike): string[] {
  const labels: string[] = [];
  if (entry.geometry?.length) {
    labels.push(entry.geometry.map((g) => g.replace(/_/g, ' ')).join(', '));
  }
  if (entry.construction?.length) {
    labels.push(entry.construction.join(', '));
  }
  if (entry.era) {
    labels.push(ERA_LABELS[entry.era] ?? entry.era.replace(/_/g, ' '));
  }
  if (entry.composition?.length) {
    labels.push(entry.composition.join(', '));
  }
  return labels.slice(0, 4);
}
