import type { CanonicalBrief, ConflictBlock, ConflictOverride, ResolvedBrief } from './types';

const DEFAULT_COMPOSITIONS = new Set(['symmetry']);
const DEFAULT_CONSTRUCTIONS = new Set([
  'baseline grid for optical balance',
  'baseline grid for modular alignment',
]);

function isDefaultComposition(value: string): boolean {
  return DEFAULT_COMPOSITIONS.has(value.trim().toLowerCase());
}

function isDefaultConstruction(value: string): boolean {
  return DEFAULT_CONSTRUCTIONS.has(value.trim().toLowerCase());
}

export function resolveConflicts(brief: CanonicalBrief): ResolvedBrief {
  const overrides: ConflictOverride[] = [];
  const blocks: ConflictBlock[] = [];
  const resolved: ResolvedBrief = { ...brief, overrides, blocks };

  if (brief.references.length === 0) return resolved;

  const ref = brief.references[0]!;

  if (ref.confidence < 0.45) {
    blocks.push({
      code: 'low_reference_confidence',
      field: 'reference',
      summary: 'Catalog reference has insufficient structural metadata',
      suggestion: 'Choose a different reference or fill geometry manually',
    });
  }

  const mergeShapes =
    brief.shapeRequirement === 'automatic'
      ? [...new Set([...ref.geometry, ...brief.shapes])]
      : brief.shapes;
  if (mergeShapes.join(',') !== brief.shapes.join(',')) {
    overrides.push({
      field: 'shapes',
      from: brief.shapes.join(', '),
      to: mergeShapes.join(', '),
      severity: 'merge',
      winner: 'reference',
      summary: 'Reference geometry used because the client did not explicitly select shapes',
    });
    resolved.shapes = mergeShapes;
  }

  if (isDefaultConstruction(brief.construction) && brief.construction !== ref.construction) {
    overrides.push({
      field: 'construction',
      from: brief.construction,
      to: ref.construction,
      severity: 'merge',
      winner: 'reference',
      summary: 'Reference construction merged into brief',
    });
    resolved.construction = ref.construction;
  }

  if (isDefaultComposition(brief.composition) && brief.composition !== ref.composition) {
    overrides.push({
      field: 'composition',
      from: brief.composition,
      to: ref.composition,
      severity: 'merge',
      winner: 'reference',
      summary: 'Reference composition merged into brief',
    });
    resolved.composition = ref.composition;
  }

  if (brief.colorPalette === 'auto' && ref.likenessRisk === 'low') {
    resolved.colorPalette = 'black_white';
  }

  return resolved;
}
