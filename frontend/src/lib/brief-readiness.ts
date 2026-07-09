import type { DesignBrief } from '../types';

export interface BriefReadiness {
  score: number;
  label: string;
  filled: number;
  total: number;
  hints: string[];
}

const CHECKS: Array<{ label: string; check: (b: DesignBrief) => boolean }> = [
  { label: 'Brief source', check: (b) => b.sources.length > 0 },
  { label: 'Era', check: (b) => Boolean(b.era.trim()) },
  { label: 'Mark type', check: (b) => Boolean(b.markType) },
  { label: 'Typography', check: (b) => Boolean(b.typography.trim()) },
  { label: 'Geometry', check: (b) => Boolean(b.geometry.trim() || b.preferredShapes.trim()) },
  { label: 'Narrative', check: (b) => Boolean(b.narrative.trim()) },
  { label: 'Color palette', check: (b) => Boolean(b.colorPalette && b.colorPalette !== 'auto') },
];

export function getBriefReadiness(brief: DesignBrief): BriefReadiness {
  const filled = CHECKS.filter((item) => item.check(brief)).length;
  const total = CHECKS.length;
  const score = Math.round((filled / total) * 100);

  const hints: string[] = [];
  if (brief.sources.length === 0) {
    hints.push('Run Typography, Shapes, or Style on the Build tab');
  }
  if (!brief.geometry.trim() && !brief.preferredShapes.trim() && brief.sources.length > 0) {
    hints.push('Add shapes in step 2 or references in step 4 (Logo Catalog)');
  }
  if ((brief.catalogReferenceIds?.length ?? 0) === 0 && brief.sources.length > 0) {
    hints.push('Optional: add references in step 4 — References');
  }

  let label = 'Empty';
  if (score >= 80) label = 'Ready';
  else if (score >= 50) label = 'Partial';
  else if (score > 0) label = 'Started';

  return { score, label, filled, total, hints };
}
