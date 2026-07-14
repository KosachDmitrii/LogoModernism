import { motifsForAbstraction, resolveIndustryNode } from '@logo-platform/shared';
import type { ResolvedBrief } from './types';

const ROUND_MOTIF =
  /\b(?:round|circular|quarter[- ]?circle|communal circular|arc geometry|radial construction|warm radial)\b/i;

const ANGULAR_STYLIZED = [
  'angular focal geometry',
  'modular square construction',
  'corner-cut negative space',
];

function prefersAngularGeometry(brief: ResolvedBrief): boolean {
  const shapeHay = [...brief.shapes, ...(brief.reference?.geometry ?? [])]
    .join(' ')
    .toLowerCase();
  const angular = /\b(?:square|angular|triangle|line|hexagon)\b/.test(shapeHay);
  const round = /\bcircle\b/.test(shapeHay);
  return angular && !round;
}

export function buildIndustryLineForBrief(brief: ResolvedBrief): string | undefined {
  const node = resolveIndustryNode(brief.industry);
  if (!node) return undefined;

  const angular = prefersAngularGeometry(brief);
  let motifs = motifsForAbstraction(node, 'stylized', []).filter(
    (motif) =>
      !brief.forbiddenMotifs.some((forbidden) =>
        motif.toLowerCase().includes(forbidden.toLowerCase()),
      ),
  );

  if (angular) {
    motifs = motifs.filter((motif) => !ROUND_MOTIF.test(motif));
    const constructionBias = node.constructionBias.filter((bias) => !/\bradial\b/i.test(bias));
    motifs = [...new Set([...motifs, ...ANGULAR_STYLIZED, ...constructionBias])].slice(0, 3);
  } else {
    motifs = motifs.slice(0, 3);
  }

  if (motifs.length === 0) return undefined;

  const label = brief.industry.trim() || 'the category';
  return `Industry direction for ${label} (stylized): ${motifs.join(', ')}. Tone: ${node.tone.join(', ')}`;
}
