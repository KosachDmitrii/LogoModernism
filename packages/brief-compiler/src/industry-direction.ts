import { resolveIndustryNode, selectIndustryMotifs } from '@logo-platform/shared';
import type { ResolvedBrief, VariantAxis } from './types';

const ROUND_MOTIF =
  /\b(?:round|circular|quarter[- ]?circle|communal circular|arc geometry|radial construction|warm radial|bowl-curve|arcs?)\b/i;

const ANGULAR_STYLIZED = [
  'angular focal geometry',
  'modular square construction',
  'corner-cut negative space',
];

function prefersAngularGeometry(brief: ResolvedBrief): boolean {
  const referenceGeometry =
    brief.shapeRequirement === 'automatic'
      ? brief.references.flatMap((reference) => reference.geometry)
      : [];
  const shapeHay = [...brief.shapes, ...referenceGeometry]
    .join(' ')
    .toLowerCase();
  const angular = /\b(?:square|diamond|rhombus|angular|triangle|line|hexagon)\b/.test(shapeHay);
  const round = /\bcircle\b/.test(shapeHay);
  return angular && !round;
}

function rotatePool(pool: string[], seed: string): string[] {
  if (pool.length === 0) return [];
  const start =
    Math.abs([...seed].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) %
    pool.length;
  return [...pool.slice(start), ...pool.slice(0, start)];
}

export function buildIndustryLineForBrief(
  brief: ResolvedBrief,
  variantAxis?: VariantAxis,
): string | undefined {
  const node = resolveIndustryNode(brief.industry);
  if (!node) return undefined;

  const angular = prefersAngularGeometry(brief);
  const seed = `${brief.industry.toLowerCase()}:${variantAxis ?? 'balanced'}:${brief.companyName ?? ''}`;

  let motifs: string[];

  if (angular) {
    // Angular briefs: prioritize square/angular cues over the industry's round defaults.
    const constructionBias = node.constructionBias.filter((bias) => !/\bradial\b/i.test(bias));
    const angularPool = rotatePool([...ANGULAR_STYLIZED, ...constructionBias], seed);
    const soft = selectIndustryMotifs(node, 'stylized', {
      seed,
      count: 4,
      desiredFromClient: brief.desiredMotifs,
      forbiddenMotifs: brief.forbiddenMotifs,
    }).filter((motif) => !ROUND_MOTIF.test(motif));
    // Client-desired cues still win over angular defaults when present.
    motifs = [...new Set([...brief.desiredMotifs, ...angularPool, ...soft])].slice(0, 2);
  } else {
    motifs = selectIndustryMotifs(node, 'stylized', {
      seed,
      count: 2,
      desiredFromClient: brief.desiredMotifs,
      forbiddenMotifs: brief.forbiddenMotifs,
    });
  }

  if (motifs.length === 0) return undefined;

  const label = brief.industry.trim() || 'the category';
  const primary = motifs[0]!;
  const supporting = motifs[1];
  const tone = node.tone.slice(0, 3).join(', ');

  return (
    `Industry form language for ${label} (stylized): ` +
    `primary cue — ${primary}` +
    (supporting ? `; supporting — ${supporting}` : '') +
    `. Tone: ${tone}. Interpret cues as geometry/silhouette, not literal product icons`
  );
}
