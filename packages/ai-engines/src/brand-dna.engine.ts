import type { Era } from '@logo-platform/shared';
import { searchPrinciples } from '@logo-platform/knowledge-base';

export interface BrandDNAInput {
  companyName: string;
  industry: string;
  values?: string[];
  targetAudience?: string;
  personality?: 'bold' | 'refined' | 'playful' | 'technical' | 'luxurious' | 'approachable';
  preferredEra?: Era;
}

export interface BrandDNAProfile {
  companyName: string;
  industry: string;
  personality: BrandDNAInput['personality'];
  visualTraits: {
    geometry: string[];
    construction: string[];
    composition: string[];
    typography: string[];
    color: string[];
    complexity: 'minimal' | 'medium' | 'high';
    era: Era;
  };
  psychologyProfile: {
    primaryEmotion: string;
    trustLevel: number;
    innovationLevel: number;
    luxuryLevel: number;
    approachability: number;
  };
  principleIds: string[];
  narrative: string;
  constraints: string[];
}

const INDUSTRY_DNA: Record<string, Partial<BrandDNAProfile['visualTraits']>> = {
  tech: { geometry: ['angular', 'hexagon'], construction: ['modular-grid'], complexity: 'minimal', era: 'swiss' },
  finance: { geometry: ['square', 'triangle'], construction: ['grid-based'], complexity: 'minimal', era: 'corporate_identity' },
  medical: { geometry: ['cross', 'circle'], construction: ['symmetry'], complexity: 'minimal', era: 'international_style' },
  luxury: { geometry: ['diamond', 'ellipse'], construction: ['golden-ratio'], complexity: 'medium', era: 'corporate_identity' },
  coffee: { geometry: ['organic-round', 'circle'], construction: ['rounded-corners'], complexity: 'medium', era: '1960s' },
  ai: { geometry: ['hexagon', 'linear'], construction: ['modular-grid'], complexity: 'minimal', era: 'swiss' },
  aviation: { geometry: ['triangle', 'circle'], construction: ['radial-grid'], complexity: 'minimal', era: 'swiss' },
  education: { geometry: ['circle', 'square'], construction: ['modular-grid'], complexity: 'medium', era: 'international_style' },
};

const PERSONALITY_MAP: Record<NonNullable<BrandDNAInput['personality']>, BrandDNAProfile['psychologyProfile']> = {
  bold: { primaryEmotion: 'confidence', trustLevel: 7, innovationLevel: 8, luxuryLevel: 6, approachability: 5 },
  refined: { primaryEmotion: 'sophistication', trustLevel: 9, innovationLevel: 6, luxuryLevel: 9, approachability: 6 },
  playful: { primaryEmotion: 'joy', trustLevel: 6, innovationLevel: 7, luxuryLevel: 4, approachability: 9 },
  technical: { primaryEmotion: 'precision', trustLevel: 8, innovationLevel: 9, luxuryLevel: 5, approachability: 5 },
  luxurious: { primaryEmotion: 'exclusivity', trustLevel: 8, innovationLevel: 5, luxuryLevel: 10, approachability: 4 },
  approachable: { primaryEmotion: 'warmth', trustLevel: 7, innovationLevel: 5, luxuryLevel: 4, approachability: 10 },
};

export function analyzeBrandDNA(input: BrandDNAInput): BrandDNAProfile {
  const industry = input.industry.toLowerCase();
  const industryKey = Object.keys(INDUSTRY_DNA).find((k) => industry.includes(k)) ?? 'tech';
  const industryTraits = INDUSTRY_DNA[industryKey];
  const personality = input.personality ?? inferPersonality(industry);

  const principles = searchPrinciples({ industry, era: input.preferredEra ?? industryTraits?.era });
  const principleIds = principles.slice(0, 12).map((p) => p.id);

  const visualTraits: BrandDNAProfile['visualTraits'] = {
    geometry: industryTraits?.geometry ?? ['circle', 'square'],
    construction: industryTraits?.construction ?? ['modular-grid'],
    composition: ['negative-space', 'symmetry'],
    typography: personality === 'luxurious' ? ['serif-contrast'] : ['sans-serif', 'geometric-sans'],
    color: personality === 'luxurious' ? ['monochrome', 'gold-accent'] : ['one-color', 'two-color'],
    complexity: industryTraits?.complexity ?? 'minimal',
    era: input.preferredEra ?? industryTraits?.era ?? 'swiss',
  };

  const constraints = [
    'Flat vector output only',
    'Scalable from 16px favicon to billboard',
    'No gradients or photographic effects',
    `Minimalism target: ${personality === 'playful' ? 'medium' : 'high'}`,
  ];

  if (input.values?.includes('sustainability')) {
    visualTraits.composition.push('organic-balance');
    constraints.push('Eco-conscious visual language');
  }

  return {
    companyName: input.companyName,
    industry: input.industry,
    personality,
    visualTraits,
    psychologyProfile: PERSONALITY_MAP[personality],
    principleIds,
    narrative: buildBrandNarrative(input, visualTraits, personality),
    constraints,
  };
}

function inferPersonality(industry: string): NonNullable<BrandDNAInput['personality']> {
  const i = industry.toLowerCase();
  if (i.includes('luxury') || i.includes('fashion')) return 'luxurious';
  if (i.includes('finance') || i.includes('law')) return 'refined';
  if (i.includes('game') || i.includes('food')) return 'playful';
  if (i.includes('ai') || i.includes('tech') || i.includes('software')) return 'technical';
  if (i.includes('health') || i.includes('education')) return 'approachable';
  return 'bold';
}

function buildBrandNarrative(
  input: BrandDNAInput,
  traits: BrandDNAProfile['visualTraits'],
  personality: NonNullable<BrandDNAInput['personality']>,
): string {
  return `${input.companyName} operates in ${input.industry} with a ${personality} brand personality. ` +
    `Visual identity should emphasize ${traits.geometry.join(' and ')} geometry, ` +
    `${traits.construction.join(' and ')} construction, and ${traits.era.replace(/_/g, ' ')} era aesthetics. ` +
    `Target: iconic recognition at small scale with timeless modernist principles.`;
}
