import type { AbstractionLevel } from './client-visual-intent';

export interface IndustryFormNode {
  industryTags: string[];
  abstractMotifs: string[];
  stylizedMotifs: string[];
  recognizableMotifs: string[];
  tone: string[];
  constructionBias: string[];
}

const INDUSTRY_NODES: IndustryFormNode[] = [
  {
    industryTags: ['food', 'restaurant', 'pizza', 'cafe', 'bakery', 'beverage', 'culinary', 'coffee', 'bar', 'brewery'],
    abstractMotifs: ['round focal geometry', 'warm radial construction', 'communal circular weave', 'craft silhouette'],
    stylizedMotifs: ['round focal arc geometry', 'communal circular weave', 'quarter-circle negative space'],
    recognizableMotifs: ['brick oven arch silhouette', 'flame teardrop', 'pizza peel crossbar'],
    tone: ['warm', 'communal', 'craft'],
    constructionBias: ['radial grid', 'baseline grid', 'interlaced weave'],
  },
  {
    industryTags: ['aviation', 'airline', 'aircraft', 'aerospace', 'flight'],
    abstractMotifs: ['delta wing sweep', 'horizon line geometry', 'upward elevation axes', 'precision radial grid'],
    stylizedMotifs: ['stylized wing silhouette', 'runway perspective lines', 'nose cone arc'],
    recognizableMotifs: ['aircraft tail fin', 'jet silhouette', 'propeller hub'],
    tone: ['technical', 'precise', 'elevated'],
    constructionBias: ['diagonal construction', 'modular grid', 'optical balance'],
  },
  {
    industryTags: ['tech', 'software', 'saas', 'digital', 'ai', 'data', 'cybersecurity', 'developer', 'fintech'],
    abstractMotifs: ['modular node network', 'circuit path geometry', 'binary grid rhythm', 'connected vertex system'],
    stylizedMotifs: ['pixel cluster mark', 'data stream curves', 'chip grid silhouette'],
    recognizableMotifs: ['bracket code symbol', 'server rack icon', 'cloud contour'],
    tone: ['innovative', 'clean', 'systematic'],
    constructionBias: ['modular grid', 'orthogonal construction', 'negative space'],
  },
  {
    industryTags: ['finance', 'bank', 'investment', 'fintech', 'insurance'],
    abstractMotifs: ['stable column geometry', 'vault arc construction', 'balanced ledger grid', 'growth diagonal'],
    stylizedMotifs: ['shield grid silhouette', 'coin ring geometry', 'pillar negative space'],
    recognizableMotifs: ['column capital', 'shield emblem', 'coin stack'],
    tone: ['trustworthy', 'stable', 'premium'],
    constructionBias: ['symmetry', 'baseline grid', 'optical balance'],
  },
  {
    industryTags: ['health', 'medical', 'wellness', 'pharma', 'clinic', 'dental', 'beauty', 'hospital', 'biotech'],
    abstractMotifs: ['crossing care geometry', 'pulse arc rhythm', 'protective circle enclosure', 'healing spiral'],
    stylizedMotifs: ['medical cross abstraction', 'leaf-heart hybrid', 'caduceus line reduction'],
    recognizableMotifs: ['medical cross', 'heart symbol', 'caduceus'],
    tone: ['caring', 'clean', 'reassuring'],
    constructionBias: ['radial balance', 'soft geometry', 'generous negative space'],
  },
];

function normalizeIndustry(industry: string): string {
  return industry.toLowerCase().replace(/[^a-z0-9\s&]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function resolveIndustryNode(industry: string): IndustryFormNode | undefined {
  const normalized = normalizeIndustry(industry);
  return INDUSTRY_NODES.find((node) =>
    node.industryTags.some((tag) => normalized.includes(tag) || tag.includes(normalized)),
  );
}

const LITERAL_MOTIF_PATTERN =
  /\b(?:stylized burger|burger symbol|burger element|food elements?|hearth|oven|brick[- ]?oven|pizza|flame|pepperoni|utensil|burger|cheese)\b/i;

function isLiteralMotif(motif: string): boolean {
  return LITERAL_MOTIF_PATTERN.test(motif);
}
export function motifsForAbstraction(
  node: IndustryFormNode,
  level: AbstractionLevel,
  desiredFromClient: string[] = [],
): string[] {
  const filteredDesired = desiredFromClient.filter((motif) => !isLiteralMotif(motif));
  const base =
    level === 'abstract'
      ? node.abstractMotifs
      : level === 'recognizable'
        ? node.recognizableMotifs
        : node.stylizedMotifs;

  return [...new Set([...filteredDesired, ...base])].slice(0, 5);
}

export function buildIndustryDirection(
  industry: string,
  abstractionLevel: AbstractionLevel,
  desiredMotifs: string[] = [],
  forbiddenMotifs: string[] = [],
): string {
  const node = resolveIndustryNode(industry);
  if (!node) {
    const motifs = desiredMotifs.filter((m) => !isLiteralMotif(m));
    return motifs.length
      ? `Industry direction for ${industry}: ${motifs.join(', ')}`
      : `Industry direction for ${industry}: category cues through form language and silhouette`;
  }

  const motifs = motifsForAbstraction(node, abstractionLevel, desiredMotifs).filter(
    (motif) =>
      !forbiddenMotifs.some((forbidden) =>
        motif.toLowerCase().includes(forbidden.toLowerCase()),
      ),
  );

  const label = industry.trim() || 'the category';
  return (
    `Industry direction for ${label} (${abstractionLevel}): ` +
    `${motifs.join(', ')}. Tone: ${node.tone.join(', ')}`
  );
}
