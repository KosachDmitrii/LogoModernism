import type { BrainResearchHit } from '@logo-platform/shared';

const DOMAIN_SCORES: Record<string, number> = {
  'archive.org': 0.95,
  'wikipedia.org': 0.9,
  'aiga.org': 0.88,
  'design.org': 0.88,
  'identitydesigned.com': 0.87,
  'logodesignlove.com': 0.86,
  'underconsideration.com': 0.85,
  'fontsinuse.com': 0.84,
  'typewolf.com': 0.84,
  'practicaltypography.com': 0.83,
  'fonts.google.com': 0.82,
  'smashingmagazine.com': 0.8,
  'nngroup.com': 0.78,
  'britannica.com': 0.78,
  'creativebloq.com': 0.72,
};

const SOURCE_ENGINE_SCORES: Record<string, number> = {
  archive: 0.12,
  wikipedia: 0.1,
  tavily: 0.06,
  brave: 0.05,
};

const DESIGN_KEYWORDS = [
  'logo',
  'logotype',
  'wordmark',
  'lettermark',
  'symbol',
  'mark',
  'brand',
  'identity',
  'typography',
  'grid',
  'geometry',
  'construction',
  'composition',
  'negative space',
  'modernism',
  'swiss',
  'monogram',
  'emblem',
  'trademark',
];

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function domainScore(host: string): number {
  for (const [domain, score] of Object.entries(DOMAIN_SCORES)) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return score;
    }
  }
  return 0.55;
}

function keywordDensity(text: string): number {
  const lower = text.toLowerCase();
  if (!lower.trim()) return 0;

  let hits = 0;
  for (const keyword of DESIGN_KEYWORDS) {
    if (lower.includes(keyword)) hits += 1;
  }

  return Math.min(0.25, hits * 0.03);
}

export function scoreResearchHit(
  hit: BrainResearchHit,
  extraText = '',
): number {
  const host = hostFromUrl(hit.url);
  const corpus = `${hit.title} ${hit.snippet} ${extraText}`;
  const base =
    domainScore(host) +
    keywordDensity(corpus) +
    (SOURCE_ENGINE_SCORES[hit.source] ?? 0);

  return Math.round(Math.min(1, Math.max(0.1, base)) * 100) / 100;
}

export function rankResearchHits(hits: BrainResearchHit[]): BrainResearchHit[] {
  return [...hits]
    .map((hit) => ({
      ...hit,
      sourceScore: scoreResearchHit(hit),
    }))
    .sort((a, b) => (b.sourceScore ?? 0) - (a.sourceScore ?? 0));
}
