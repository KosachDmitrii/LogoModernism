import type { MessageKey } from '../i18n';
import type { DesignBrief } from '../types';

export interface BriefReadiness {
  score: number;
  labelKey: MessageKey;
  filled: number;
  total: number;
  hintKeys: MessageKey[];
}

const CHECKS: Array<{ labelKey: MessageKey; check: (b: DesignBrief) => boolean }> = [
  { labelKey: 'brief.readiness.check.briefSource', check: (b) => b.sources.length > 0 },
  { labelKey: 'brief.readiness.check.era', check: (b) => Boolean(b.era.trim()) },
  { labelKey: 'brief.readiness.check.markType', check: (b) => Boolean(b.markType) },
  { labelKey: 'brief.readiness.check.typography', check: (b) => Boolean(b.typography.trim()) },
  { labelKey: 'brief.readiness.check.geometry', check: (b) => Boolean(b.geometry.trim() || b.preferredShapes.trim()) },
  { labelKey: 'brief.readiness.check.narrative', check: (b) => Boolean(b.narrative.trim()) },
  { labelKey: 'brief.readiness.check.colorPalette', check: (b) => Boolean(b.colorPalette && b.colorPalette !== 'auto') },
];

export function getBriefReadiness(brief: DesignBrief): BriefReadiness {
  const filled = CHECKS.filter((item) => item.check(brief)).length;
  const total = CHECKS.length;
  const score = Math.round((filled / total) * 100);

  const hintKeys: MessageKey[] = [];
  if (brief.sources.length === 0) {
    hintKeys.push('brief.readiness.hint.runBuild');
  }
  if (!brief.geometry.trim() && !brief.preferredShapes.trim() && brief.sources.length > 0) {
    hintKeys.push('brief.readiness.hint.addShapes');
  }
  if ((brief.catalogReferenceIds?.length ?? 0) === 0 && brief.sources.length > 0) {
    hintKeys.push('brief.readiness.hint.addReferences');
  }

  let labelKey: MessageKey = 'brief.readiness.empty';
  if (score >= 80) labelKey = 'brief.readiness.ready';
  else if (score >= 50) labelKey = 'brief.readiness.partial';
  else if (score > 0) labelKey = 'brief.readiness.started';

  return { score, labelKey, filled, total, hintKeys };
}
