import type { LogoMarkType } from '@logo-platform/shared';
import type { CanonicalBrief, ConflictBlock, ConflictOverride, ReferenceProfile, ResolvedBrief } from './types';
import { canonicalizeEra } from './normalizers';

function mapRefMarkToClient(mark: ReferenceProfile['markTypeHint']): LogoMarkType {
  if (mark === 'symbol') return 'combination';
  return mark as LogoMarkType;
}

export function resolveConflicts(brief: CanonicalBrief): ResolvedBrief {
  const overrides: ConflictOverride[] = [];
  const blocks: ConflictBlock[] = [];
  const resolved: ResolvedBrief = { ...brief, overrides, blocks };

  if (!brief.reference) return resolved;

  const ref = brief.reference;

  if (ref.confidence < 0.45) {
    blocks.push({
      code: 'low_reference_confidence',
      field: 'reference',
      summary: 'Catalog reference has insufficient structural metadata',
      suggestion: 'Choose a different reference or fill geometry manually',
    });
  }

  const refMark = mapRefMarkToClient(ref.markTypeHint);
  if (brief.markType !== refMark) {
    if (brief.companyName && ref.markTypeHint === 'symbol') {
      overrides.push({
        field: 'markType',
        from: brief.markType,
        to: 'combination',
        severity: 'override',
        winner: 'brand_lock',
        summary: 'Branded brief requires combination mark; reference symbol structure applied as subordinate symbol',
      });
      resolved.markType = 'combination';
    } else {
      overrides.push({
        field: 'markType',
        from: brief.markType,
        to: refMark,
        severity: 'override',
        winner: 'reference',
        summary: 'Reference mark architecture overrides client mark type',
      });
      resolved.markType = refMark;
    }
  }

  const mergeShapes = [...new Set([...ref.geometry, ...brief.shapes])];
  if (mergeShapes.join(',') !== brief.shapes.join(',')) {
    overrides.push({
      field: 'shapes',
      from: brief.shapes.join(', '),
      to: mergeShapes.join(', '),
      severity: 'merge',
      winner: 'reference',
      summary: 'Reference geometry merged with client shapes',
    });
    resolved.shapes = mergeShapes;
  }

  if (brief.construction !== ref.construction) {
    overrides.push({
      field: 'construction',
      from: brief.construction,
      to: ref.construction,
      severity: 'override',
      winner: 'reference',
      summary: 'Reference construction system overrides client choice',
    });
    resolved.construction = ref.construction;
  }

  if (brief.composition !== ref.composition) {
    overrides.push({
      field: 'composition',
      from: brief.composition,
      to: ref.composition,
      severity: 'override',
      winner: 'reference',
      summary: 'Reference composition overrides client choice',
    });
    resolved.composition = ref.composition;
  }

  const clientEra = canonicalizeEra(brief.era);
  if (clientEra !== ref.eraHint) {
    overrides.push({
      field: 'era',
      from: clientEra,
      to: ref.eraHint,
      severity: 'override',
      winner: 'reference',
      summary: 'Reference era hint overrides client era',
    });
    resolved.era = ref.eraHint;
  }

  if (brief.colorPalette === 'auto' && ref.likenessRisk === 'low') {
    resolved.colorPalette = 'black_white';
  }

  return resolved;
}
