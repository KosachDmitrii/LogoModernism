import type { AbstractionLevel } from './client-visual-intent';

export interface IndustryFormNode {
  id: string;
  /** Exact / phrase tags; longer & more specific tags win resolution. */
  industryTags: string[];
  abstractMotifs: string[];
  stylizedMotifs: string[];
  recognizableMotifs: string[];
  tone: string[];
  constructionBias: string[];
}

/**
 * Industry form-language banks.
 * Motifs must read as geometry / silhouette cues — not literal product clipart.
 * Banks are wider than what we inject so directions can diverge.
 */
const INDUSTRY_NODES: IndustryFormNode[] = [
  {
    id: 'food',
    industryTags: [
      'food',
      'restaurant',
      'pizza',
      'cafe',
      'bakery',
      'beverage',
      'culinary',
      'coffee',
      'bar',
      'brewery',
    ],
    abstractMotifs: [
      'round focal geometry',
      'warm radial construction',
      'communal circular weave',
      'craft silhouette reduction',
      'stacked horizon bands',
    ],
    stylizedMotifs: [
      'round focal arc geometry',
      'communal circular weave',
      'quarter-circle negative space',
      'bowl-curve silhouette',
      'steam-line rhythm as arcs',
    ],
    recognizableMotifs: [
      'brick oven arch silhouette',
      'flame teardrop reduction',
      'pizza peel crossbar',
    ],
    tone: ['warm', 'communal', 'craft'],
    constructionBias: ['radial grid', 'baseline grid', 'interlaced weave'],
  },
  {
    id: 'aviation',
    industryTags: ['aviation', 'airline', 'aircraft', 'aerospace', 'flight'],
    abstractMotifs: [
      'delta wing sweep',
      'horizon line geometry',
      'upward elevation axes',
      'precision radial grid',
      'contrail linear rhythm',
    ],
    stylizedMotifs: [
      'stylized wing silhouette',
      'runway perspective lines',
      'nose cone arc',
      'chevron ascent mark',
      'tail-fin negative space',
    ],
    recognizableMotifs: ['aircraft tail fin', 'jet silhouette', 'propeller hub'],
    tone: ['technical', 'precise', 'elevated'],
    constructionBias: ['diagonal construction', 'modular grid', 'optical balance'],
  },
  {
    id: 'tech',
    industryTags: [
      'technology',
      'tech',
      'software',
      'saas',
      'digital',
      'ai',
      'data',
      'cybersecurity',
      'developer',
      'platform',
    ],
    abstractMotifs: [
      'modular node network',
      'circuit path geometry',
      'connected vertex system',
      'orthogonal signal paths',
      'nested frame construction',
    ],
    stylizedMotifs: [
      'linked node constellation',
      'signal path curves',
      'nested frame mark',
      'bracket aperture silhouette',
      'modular tile rhythm',
      // keep pixel as ONE option among many — never the only injected set
      'pixel cluster mark',
      'chip grid silhouette',
    ],
    recognizableMotifs: ['bracket code symbol', 'server rack icon', 'cloud contour'],
    tone: ['innovative', 'clean', 'systematic'],
    constructionBias: ['modular grid', 'orthogonal construction', 'negative space'],
  },
  {
    id: 'fintech',
    // Dedicated node — must not inherit tech's full pixel bank by default.
    industryTags: ['fintech', 'payments', 'payment', 'neobank', 'digital bank', 'banking app'],
    abstractMotifs: [
      'stable column geometry',
      'balanced ledger grid',
      'growth diagonal',
      'secure enclosure geometry',
      'flow-through aperture',
    ],
    stylizedMotifs: [
      'shield grid silhouette',
      'ledger-line rhythm',
      'secure aperture mark',
      'growth chevron reduction',
      'exchange-path curves',
      'pillar negative space',
      'coin ring geometry',
    ],
    recognizableMotifs: ['shield emblem', 'column capital', 'card corner radius'],
    tone: ['trustworthy', 'precise', 'modern'],
    constructionBias: ['symmetry', 'baseline grid', 'optical balance', 'modular grid'],
  },
  {
    id: 'finance',
    industryTags: ['finance', 'bank', 'banking', 'investment', 'insurance', 'wealth', 'capital'],
    abstractMotifs: [
      'stable column geometry',
      'vault arc construction',
      'balanced ledger grid',
      'growth diagonal',
      'trust enclosure',
    ],
    stylizedMotifs: [
      'shield grid silhouette',
      'coin ring geometry',
      'pillar negative space',
      'vault arc reduction',
      'ledger balance bars',
    ],
    recognizableMotifs: ['column capital', 'shield emblem', 'coin stack'],
    tone: ['trustworthy', 'stable', 'premium'],
    constructionBias: ['symmetry', 'baseline grid', 'optical balance'],
  },
  {
    id: 'health',
    industryTags: [
      'health',
      'medical',
      'wellness',
      'pharma',
      'clinic',
      'dental',
      'beauty',
      'hospital',
      'biotech',
    ],
    abstractMotifs: [
      'crossing care geometry',
      'pulse arc rhythm',
      'protective circle enclosure',
      'healing spiral',
      'vital continuum line',
    ],
    stylizedMotifs: [
      'medical cross abstraction',
      'leaf-heart hybrid reduction',
      'caduceus line reduction',
      'pulse waveform geometry',
      'protective ring mark',
    ],
    recognizableMotifs: ['medical cross', 'heart symbol', 'caduceus'],
    tone: ['caring', 'clean', 'reassuring'],
    constructionBias: ['radial balance', 'soft geometry', 'generous negative space'],
  },
  {
    id: 'retail',
    industryTags: ['retail', 'ecommerce', 'e-commerce', 'shop', 'store', 'marketplace', 'fashion'],
    abstractMotifs: [
      'open frame geometry',
      'bag-handle arc reduction',
      'shelf-line rhythm',
      'tag notch silhouette',
    ],
    stylizedMotifs: [
      'open frame mark',
      'handle-arc negative space',
      'folded plane silhouette',
      'price-tag notch reduction',
    ],
    recognizableMotifs: ['shopping bag silhouette', 'price tag', 'hanger bar'],
    tone: ['approachable', 'clear', 'contemporary'],
    constructionBias: ['baseline grid', 'modular grid', 'optical balance'],
  },
  {
    id: 'logistics',
    industryTags: ['logistics', 'shipping', 'delivery', 'freight', 'supply chain', 'courier'],
    abstractMotifs: [
      'forward motion axis',
      'route polyline geometry',
      'packaged square reduction',
      'loop continuity mark',
    ],
    stylizedMotifs: [
      'motion chevron band',
      'route polyline mark',
      'parcel square silhouette',
      'loop continuum reduction',
    ],
    recognizableMotifs: ['arrow band', 'box silhouette', 'wheel hub'],
    tone: ['reliable', 'kinetic', 'clear'],
    constructionBias: ['diagonal construction', 'modular grid', 'optical balance'],
  },
];

function normalizeIndustry(industry: string): string {
  return industry.toLowerCase().replace(/[^a-z0-9\s&/-]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Deterministic hash for stable motif picks across a seed string. */
export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Resolve the best industry node by tag specificity.
 * Exact phrase matches beat substring; longer tags beat shorter ones.
 */
export function resolveIndustryNode(industry: string): IndustryFormNode | undefined {
  const normalized = normalizeIndustry(industry);
  if (!normalized) return undefined;

  let best: { node: IndustryFormNode; score: number } | undefined;

  for (const node of INDUSTRY_NODES) {
    for (const tag of node.industryTags) {
      const t = tag.toLowerCase();
      let score = 0;
      if (normalized === t) score = 1000 + t.length * 10;
      else if (normalized.includes(t)) score = 500 + t.length * 10;
      else if (t.includes(normalized) && normalized.length >= 4) score = 200 + normalized.length * 5;
      else continue;

      // Prefer dedicated fintech over generic tech/finance when both could match weakly.
      if (node.id === 'fintech' && /fintech|payment|neobank/.test(normalized)) {
        score += 50;
      }

      if (!best || score > best.score) best = { node, score };
    }
  }

  return best?.node;
}

const LITERAL_MOTIF_PATTERN =
  /\b(?:stylized burger|burger symbol|burger element|food elements?|hearth|oven|brick[- ]?oven|pizza|flame|pepperoni|utensil|burger|cheese)\b/i;

function isLiteralMotif(motif: string): boolean {
  return LITERAL_MOTIF_PATTERN.test(motif);
}

function bankForLevel(node: IndustryFormNode, level: AbstractionLevel): string[] {
  if (level === 'abstract') return node.abstractMotifs;
  if (level === 'recognizable') return node.recognizableMotifs;
  return node.stylizedMotifs;
}

export interface MotifSelectionOptions {
  /** Stable seed — typically `${industry}:${variantAxis}` */
  seed?: string;
  /** How many motifs to surface (default 2). */
  count?: number;
  desiredFromClient?: string[];
  forbiddenMotifs?: string[];
}

/**
 * Pick a small motif set from the bank so directions diverge
 * instead of dumping the entire industry vocabulary every time.
 */
export function selectIndustryMotifs(
  node: IndustryFormNode,
  level: AbstractionLevel,
  options: MotifSelectionOptions = {},
): string[] {
  const count = Math.max(1, Math.min(options.count ?? 2, 3));
  const forbidden = options.forbiddenMotifs ?? [];
  const desired = (options.desiredFromClient ?? []).filter((m) => !isLiteralMotif(m));

  const bank = bankForLevel(node, level).filter(
    (motif) =>
      !forbidden.some((f) => motif.toLowerCase().includes(f.toLowerCase())),
  );

  if (bank.length === 0 && desired.length === 0) return [];

  const seed = options.seed ?? node.id;
  const start = hashSeed(seed) % Math.max(1, bank.length);
  const rotated = bank.length
    ? [...bank.slice(start), ...bank.slice(0, start)]
    : [];

  const picked: string[] = [];
  for (const m of desired) {
    if (!picked.includes(m)) picked.push(m);
    if (picked.length >= count) return picked.slice(0, count);
  }
  for (const m of rotated) {
    if (!picked.includes(m)) picked.push(m);
    if (picked.length >= count) break;
  }
  return picked.slice(0, count);
}

/** @deprecated Prefer selectIndustryMotifs — kept for callers that want the full bank slice. */
export function motifsForAbstraction(
  node: IndustryFormNode,
  level: AbstractionLevel,
  desiredFromClient: string[] = [],
): string[] {
  return selectIndustryMotifs(node, level, {
    desiredFromClient,
    count: 5,
    seed: `${node.id}:full`,
  });
}

export interface IndustryDirectionOptions extends MotifSelectionOptions {
  /** When set, motifs rotate per creative axis / variant. */
  variantAxis?: string;
}

/**
 * Soft industry line: form-language cues, not a mandatory icon checklist.
 */
export function buildIndustryDirection(
  industry: string,
  abstractionLevel: AbstractionLevel,
  desiredMotifs: string[] = [],
  forbiddenMotifs: string[] = [],
  options: IndustryDirectionOptions = {},
): string {
  const label = industry.trim() || 'the category';
  const node = resolveIndustryNode(industry);
  const seed =
    options.seed ??
    (options.variantAxis ? `${normalizeIndustry(industry)}:${options.variantAxis}` : normalizeIndustry(industry));

  if (!node) {
    const motifs = desiredMotifs.filter((m) => !isLiteralMotif(m)).slice(0, 2);
    if (motifs.length === 0) {
      return (
        `Industry form language for ${label} (${abstractionLevel}): ` +
        'express category through geometry, construction, and silhouette — not literal icons'
      );
    }
    return (
      `Industry form language for ${label} (${abstractionLevel}): ` +
      `primary cue — ${motifs[0]}` +
      (motifs[1] ? `; supporting — ${motifs[1]}` : '') +
      '. Interpret as geometry, not literal icons'
    );
  }

  const motifs = selectIndustryMotifs(node, abstractionLevel, {
    seed,
    count: options.count ?? 2,
    desiredFromClient: desiredMotifs,
    forbiddenMotifs,
  });

  const primary = motifs[0];
  const supporting = motifs[1];
  const tone = node.tone.slice(0, 3).join(', ');

  if (!primary) {
    return (
      `Industry form language for ${label} (${abstractionLevel}): ` +
      `express ${tone} character through geometry and silhouette — not literal icons`
    );
  }

  return (
    `Industry form language for ${label} (${abstractionLevel}): ` +
    `primary cue — ${primary}` +
    (supporting ? `; supporting — ${supporting}` : '') +
    `. Tone: ${tone}. Interpret cues as geometry/silhouette, not literal product icons`
  );
}

export function listIndustryNodes(): readonly IndustryFormNode[] {
  return INDUSTRY_NODES;
}
