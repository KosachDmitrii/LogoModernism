import { searchPrinciples } from '@logo-platform/knowledge-base';

export interface TypographyInput {
  companyName: string;
  industry: string;
  style?: 'swiss' | 'bauhaus' | 'corporate' | 'custom';
  markType?: 'wordmark' | 'lettermark' | 'combination';
}

export interface TypographyRecommendation {
  category: string;
  name: string;
  principleId: string;
  score: number;
  characteristics: string[];
  pairingSuggestion?: string;
}

export interface TypographyIntelligenceResult {
  primaryRecommendation: TypographyRecommendation;
  alternatives: TypographyRecommendation[];
  hierarchy: { level: string; weight: string; tracking: string }[];
  constructionRules: string[];
  antiPatterns: string[];
}

const TYPOGRAPHY_PROFILES: TypographyRecommendation[] = [
  {
    category: 'sans-serif',
    name: 'Geometric Sans',
    principleId: 'typ-geometric-sans',
    score: 8,
    characteristics: ['Circular O', 'Uniform stroke', 'Grid-aligned'],
    pairingSuggestion: 'Pair with geometric mark',
  },
  {
    category: 'sans-serif',
    name: 'Swiss Neo-Grotesque',
    principleId: 'typ-swiss-typography',
    score: 9,
    characteristics: ['Neutral forms', 'Tight tracking', 'Optical kerning'],
    pairingSuggestion: 'Classic Swiss pairing with grid-based mark',
  },
  {
    category: 'sans-serif',
    name: 'Humanist Sans',
    principleId: 'typ-humanist-sans',
    score: 7,
    characteristics: ['Warm curves', 'Varied stroke', 'Approachable'],
    pairingSuggestion: 'Softens technical marks',
  },
  {
    category: 'custom',
    name: 'Custom Letterform',
    principleId: 'typ-custom-letterform',
    score: 8,
    characteristics: ['Unique counters', 'Brand-specific modification', 'Memorable'],
  },
  {
    category: 'monogram',
    name: 'Monogram Construction',
    principleId: 'typ-monogram',
    score: 7,
    characteristics: ['Interlocked letters', 'Shared strokes', 'Compact'],
  },
  {
    category: 'wordmark',
    name: 'Wordmark Only',
    principleId: 'typ-wordmark',
    score: 6,
    characteristics: ['Typography as mark', 'No separate symbol', 'Name recognition'],
  },
];

export function analyzeTypography(input: TypographyInput): TypographyIntelligenceResult {
  const principles = searchPrinciples({ industry: input.industry, category: 'typography' });
  const principleIds = new Set(principles.map((p) => p.id));

  const scored = TYPOGRAPHY_PROFILES.map((profile) => {
    let score = profile.score;
    if (principleIds.has(profile.principleId)) score += 2;
    if (input.style === 'swiss' && profile.name.includes('Swiss')) score += 3;
    if (input.style === 'bauhaus' && profile.category === 'custom') score += 2;
    if (input.markType === 'wordmark' && profile.category === 'wordmark') score += 4;
    if (input.markType === 'lettermark' && profile.category === 'monogram') score += 4;
    if (input.companyName.length <= 4 && profile.category === 'monogram') score += 2;
    return { ...profile, score: Math.min(10, score) };
  }).sort((a, b) => b.score - a.score);

  const antiPatterns = [
    'Decorative scripts for tech/finance brands',
    'Excessive tracking on short names',
    'Mixing more than two type families',
    'Outlined type at small sizes',
  ];

  if (input.industry.toLowerCase().includes('luxury')) {
    antiPatterns.push('Overly geometric sans without refinement');
  }

  return {
    primaryRecommendation: scored[0],
    alternatives: scored.slice(1, 4),
    hierarchy: [
      { level: 'Primary wordmark', weight: 'Medium to Bold', tracking: input.companyName.length > 8 ? '-20' : '0' },
      { level: 'Tagline', weight: 'Regular', tracking: '+50' },
      { level: 'Monogram', weight: 'Bold to Black', tracking: '-30' },
    ],
    constructionRules: [
      'Align cap height to grid module',
      'Maintain consistent x-height across weights',
      'Optical correction on circular letters (O, C, G)',
      'Baseline grid alignment for multi-line lockups',
    ],
    antiPatterns,
  };
}
