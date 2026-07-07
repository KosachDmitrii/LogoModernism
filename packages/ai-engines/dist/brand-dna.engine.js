"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeBrandDNA = analyzeBrandDNA;
const knowledge_base_1 = require("@logo-platform/knowledge-base");
const INDUSTRY_DNA = {
    tech: { geometry: ['angular', 'hexagon'], construction: ['modular-grid'], complexity: 'minimal', era: 'swiss' },
    finance: { geometry: ['square', 'triangle'], construction: ['grid-based'], complexity: 'minimal', era: 'corporate_identity' },
    medical: { geometry: ['cross', 'circle'], construction: ['symmetry'], complexity: 'minimal', era: 'international_style' },
    luxury: { geometry: ['diamond', 'ellipse'], construction: ['golden-ratio'], complexity: 'medium', era: 'corporate_identity' },
    coffee: { geometry: ['organic-round', 'circle'], construction: ['rounded-corners'], complexity: 'medium', era: '1960s' },
    ai: { geometry: ['hexagon', 'linear'], construction: ['modular-grid'], complexity: 'minimal', era: 'swiss' },
    aviation: { geometry: ['triangle', 'circle'], construction: ['radial-grid'], complexity: 'minimal', era: 'swiss' },
    education: { geometry: ['circle', 'square'], construction: ['modular-grid'], complexity: 'medium', era: 'international_style' },
};
const PERSONALITY_MAP = {
    bold: { primaryEmotion: 'confidence', trustLevel: 7, innovationLevel: 8, luxuryLevel: 6, approachability: 5 },
    refined: { primaryEmotion: 'sophistication', trustLevel: 9, innovationLevel: 6, luxuryLevel: 9, approachability: 6 },
    playful: { primaryEmotion: 'joy', trustLevel: 6, innovationLevel: 7, luxuryLevel: 4, approachability: 9 },
    technical: { primaryEmotion: 'precision', trustLevel: 8, innovationLevel: 9, luxuryLevel: 5, approachability: 5 },
    luxurious: { primaryEmotion: 'exclusivity', trustLevel: 8, innovationLevel: 5, luxuryLevel: 10, approachability: 4 },
    approachable: { primaryEmotion: 'warmth', trustLevel: 7, innovationLevel: 5, luxuryLevel: 4, approachability: 10 },
};
function analyzeBrandDNA(input) {
    const industry = input.industry.toLowerCase();
    const industryKey = Object.keys(INDUSTRY_DNA).find((k) => industry.includes(k));
    const industryTraits = industryKey ? INDUSTRY_DNA[industryKey] : undefined;
    const personality = input.personality ?? inferPersonality(industry);
    const resolvedEra = input.preferredEra ?? industryTraits?.era ?? inferEraFromKnowledgeBase(industry);
    const principles = (0, knowledge_base_1.searchPrinciples)({ industry, era: resolvedEra });
    const principleIds = principles
        .filter((p) => !p.id.startsWith('ent-'))
        .slice(0, 16)
        .map((p) => p.id);
    const visualTraits = {
        geometry: industryTraits?.geometry ?? ['circle', 'square'],
        construction: industryTraits?.construction ?? ['modular-grid'],
        composition: ['negative-space', 'symmetry'],
        typography: personality === 'luxurious' ? ['serif-contrast'] : ['sans-serif', 'geometric-sans'],
        color: personality === 'luxurious' ? ['monochrome', 'gold-accent'] : ['one-color', 'two-color'],
        complexity: industryTraits?.complexity ?? 'minimal',
        era: resolvedEra,
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
function inferPersonality(industry) {
    const i = industry.toLowerCase();
    if (i.includes('luxury') || i.includes('fashion'))
        return 'luxurious';
    if (i.includes('finance') || i.includes('law'))
        return 'refined';
    if (i.includes('game') || i.includes('food'))
        return 'playful';
    if (i.includes('ai') || i.includes('tech') || i.includes('software'))
        return 'technical';
    if (i.includes('health') || i.includes('education'))
        return 'approachable';
    return 'bold';
}
function inferEraFromKnowledgeBase(industry) {
    const matches = (0, knowledge_base_1.searchPrinciples)({ industry }).filter((p) => p.era?.length && !p.id.startsWith('ent-'));
    if (matches.length > 0) {
        const eraCounts = new Map();
        for (const p of matches) {
            for (const era of p.era ?? []) {
                eraCounts.set(era, (eraCounts.get(era) ?? 0) + 1);
            }
        }
        const sorted = [...eraCounts.entries()].sort((a, b) => b[1] - a[1]);
        if (sorted[0])
            return sorted[0][0];
    }
    return 'international_style';
}
function buildBrandNarrative(input, traits, personality) {
    return `${input.companyName} operates in ${input.industry} with a ${personality} brand personality. ` +
        `Visual identity should emphasize ${traits.geometry.join(' and ')} geometry, ` +
        `${traits.construction.join(' and ')} construction, and ${traits.era.replace(/_/g, ' ')} era aesthetics. ` +
        `Target: iconic recognition at small scale with timeless modernist principles.`;
}
//# sourceMappingURL=brand-dna.engine.js.map