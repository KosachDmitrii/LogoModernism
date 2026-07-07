"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeBrandDNA = analyzeBrandDNA;
const shared_1 = require("@logo-platform/shared");
const knowledge_base_1 = require("@logo-platform/knowledge-base");
const letter_dna_engine_1 = require("./letter-dna.engine");
const typography_intelligence_engine_1 = require("./typography-intelligence.engine");
const PERSONALITY_MAP = {
    bold: { primaryEmotion: 'confidence', trustLevel: 7, innovationLevel: 8, luxuryLevel: 6, approachability: 5 },
    refined: { primaryEmotion: 'sophistication', trustLevel: 9, innovationLevel: 6, luxuryLevel: 9, approachability: 6 },
    playful: { primaryEmotion: 'joy', trustLevel: 6, innovationLevel: 7, luxuryLevel: 4, approachability: 9 },
    technical: { primaryEmotion: 'precision', trustLevel: 8, innovationLevel: 9, luxuryLevel: 5, approachability: 5 },
    luxurious: { primaryEmotion: 'exclusivity', trustLevel: 8, innovationLevel: 5, luxuryLevel: 10, approachability: 4 },
    approachable: { primaryEmotion: 'warmth', trustLevel: 7, innovationLevel: 5, luxuryLevel: 4, approachability: 10 },
};
const PERSONALITY_TYPOGRAPHY = {
    bold: ['bold initials', 'all-caps lettering', 'tight kerning'],
    refined: ['custom wordmark typography', 'wide letter spacing', 'baseline-aligned typography'],
    playful: ['mixed case typography', 'custom typographic ligature'],
    technical: ['geometric sans-serif', 'Univers-style systematic type', 'condensed letterforms'],
    luxurious: ['elegant monogram', 'extended wide letterforms', 'custom modified letterforms'],
    approachable: ['clean sans-serif letterforms', 'Helvetica-style neo-grotesque'],
};
const MARK_TYPE_LABELS = {
    wordmark: 'wordmark only — typography as the logo',
    lettermark: 'lettermark / monogram from initials',
    combination: 'typographic lockup with optional supporting mark',
};
const CONSTRUCTED_TYPOGRAPHY_TRAITS = [
    'geometric letterforms from primitives',
    'triangles semicircles rectangles',
    'modular grid construction',
    'stacked tight letter composition',
    'letters abstracted into basic shapes',
    'bold black letterforms',
];
const CONSTRUCTED_LETTERFORM_TRAITS = [
    'filled solid counters',
    'modular grid alignment',
    'constructive International Style typography',
    'dense stacked typographic block',
];
const CONSTRUCTED_COMPOSITION = [
    'stacked typographic composition on modular grid',
    'letters as geometric modules — not a separate symbol',
    'tight vertical or horizontal letter stacking',
];
const CONSTRUCTED_PRINCIPLE_IDS = [
    'con-modular-grid',
    'con-grid-based',
    'typ-custom-letterform',
    'typ-geometric-sans',
    'comp-stacked',
    'comp-negative-space',
    'typ-bauhaus-typography',
];
function analyzeBrandDNA(input) {
    const industry = input.industry.toLowerCase();
    const personality = input.personality ?? inferPersonality(industry);
    const markType = input.markType ?? inferMarkType(input.companyName);
    const typographyStyle = input.typographyStyle ?? 'standard';
    const isConstructed = typographyStyle === 'constructed';
    const resolvedEra = input.preferredEra ?? inferEraFromKnowledgeBase(industry);
    const typography = (0, typography_intelligence_engine_1.analyzeTypography)({
        companyName: input.companyName,
        industry: input.industry,
        markType,
        style: resolvedEra === 'swiss' || resolvedEra === 'international_style' ? 'swiss' : 'corporate',
    });
    const letterDNA = (0, letter_dna_engine_1.analyzeLetterDNA)({
        text: input.companyName,
        style: personality === 'approachable' ? 'humanist' : 'geometric',
        emphasis: markType === 'lettermark' ? 'first' : 'all',
    });
    const typographyTraits = isConstructed
        ? ['Constructed Typography', ...CONSTRUCTED_TYPOGRAPHY_TRAITS.slice(0, 3)]
        : [
            typography.primaryRecommendation.name,
            ...typography.primaryRecommendation.characteristics,
            ...PERSONALITY_TYPOGRAPHY[personality].slice(0, 2),
        ];
    const letterformStyle = isConstructed
        ? CONSTRUCTED_LETTERFORM_TRAITS
        : [
            `${letterDNA.recommendedWeight} weight`,
            `${letterDNA.balanceAxis} balance`,
            letterDNA.counterSpaceStrategy,
            ...letterDNA.customLetterformIdeas.slice(0, 2),
        ];
    const composition = isConstructed
        ? [MARK_TYPE_LABELS[markType], ...CONSTRUCTED_COMPOSITION]
        : [
            MARK_TYPE_LABELS[markType],
            ...typography.hierarchy
                .filter((h) => {
                if (markType === 'wordmark')
                    return !/monogram/i.test(h.level);
                if (markType === 'lettermark')
                    return !/wordmark|tagline/i.test(h.level);
                return true;
            })
                .map((h) => `${h.level}: ${h.weight}, tracking ${h.tracking}`),
            ...typography.constructionRules.slice(0, 2),
        ];
    const visualTraits = {
        typography: typographyTraits,
        letterformStyle,
        composition,
        color: personality === 'luxurious' ? ['monochrome', 'high contrast'] : ['one-color', 'black on white'],
        complexity: input.companyName.length <= 5 ? 'minimal' : personality === 'playful' ? 'medium' : 'minimal',
        era: resolvedEra,
    };
    const principleIds = collectTypographyPrincipleIds(typography, markType, resolvedEra, industry, typographyStyle);
    const constraints = isConstructed
        ? buildConstructedConstraints(input, markType)
        : [
            'Typography-first logo — company name as the only mark',
            'No separate icon, symbol, emblem, or pictorial mark',
            'Flat vector letterforms only',
            'Scalable from small label to large signage',
            'No gradients or photographic effects on type',
            `Mark type: ${markType}`,
            ...typography.antiPatterns.slice(0, 2).map((p) => `Avoid: ${p}`),
        ];
    if (!isConstructed) {
        if (markType === 'wordmark') {
            constraints[0] = 'Wordmark only — typography is the entire logo';
            constraints[1] = 'No icon above text, no symbol beside text, no badge or emblem';
        }
        if (markType === 'lettermark') {
            const text = (0, shared_1.lettermarkTextFromName)(input.companyName);
            if ((0, shared_1.isMultiWordCompanyName)(input.companyName)) {
                constraints[0] = `Lettermark monogram — only the initials "${text}", never the full company name`;
            }
            else {
                constraints[0] = `Lettermark — use the full word "${text}" as the logo, do not abbreviate to initials`;
            }
            constraints[1] = 'No separate icon, no pictorial symbol, no emblem, no industry imagery';
        }
    }
    if (input.values?.includes('sustainability')) {
        constraints.push('Open, readable letterforms with generous counters');
    }
    return {
        companyName: input.companyName,
        industry: input.industry,
        personality,
        markType,
        typographyStyle,
        visualTraits,
        typography,
        letterDNA,
        psychologyProfile: PERSONALITY_MAP[personality],
        principleIds,
        narrative: buildBrandNarrative(input, visualTraits, personality, markType, typography, letterDNA, typographyStyle),
        constraints,
    };
}
function inferMarkType(companyName) {
    const letters = companyName.replace(/[^A-Za-z]/g, '');
    if (letters.length <= 3)
        return 'lettermark';
    if (letters.length <= 8)
        return 'wordmark';
    return 'wordmark';
}
function buildConstructedConstraints(input, markType) {
    const constraints = [
        'Constructed typography — letters built from geometric primitives on a modular grid',
        'Each letter formed from triangles, semicircles, and rectangles — not an off-the-shelf font',
        'Dense stacked typographic block, bold black letterforms on light background',
        'No separate icon, roundel, emblem, or pictorial symbol beside the letters',
        'Letters themselves are the geometric construction — not a symbol plus text',
        'Flat vector only, no gradients, no shadows',
        `Mark type: ${markType}`,
        'Typography style: constructed',
    ];
    if (markType === 'wordmark') {
        constraints.push('Full company name spelled as constructed letterforms');
    }
    if (markType === 'lettermark') {
        const text = (0, shared_1.lettermarkTextFromName)(input.companyName);
        if ((0, shared_1.isMultiWordCompanyName)(input.companyName)) {
            constraints.push(`Monogram initials "${text}" as constructed geometric letterforms`);
        }
        else {
            constraints.push(`Full word "${text}" as constructed geometric letterforms`);
        }
    }
    return constraints;
}
function collectTypographyPrincipleIds(typography, markType, era, industry, typographyStyle) {
    if (typographyStyle === 'constructed') {
        const ids = new Set([
            ...CONSTRUCTED_PRINCIPLE_IDS,
            `era-${era.replace(/_/g, '-')}`,
        ]);
        if (markType === 'wordmark')
            ids.add('typ-wordmark');
        if (markType === 'lettermark') {
            ids.add('typ-monogram');
            ids.add('mark-lettermark');
        }
        return [...ids]
            .map((id) => (0, knowledge_base_1.getPrincipleById)(id))
            .filter(Boolean)
            .map((p) => p.id)
            .slice(0, 16);
    }
    const ids = new Set([
        typography.primaryRecommendation.principleId,
        ...typography.alternatives.slice(0, 2).map((a) => a.principleId),
        `era-${era.replace(/_/g, '-')}`,
    ]);
    if (markType === 'wordmark') {
        ids.add('typ-wordmark');
    }
    if (markType === 'lettermark') {
        ids.add('typ-monogram');
        ids.add('mark-lettermark');
        ids.add('typ-letter-combination');
    }
    if (markType === 'combination') {
        ids.add('mark-combination-mark');
        ids.add('typ-wordmark');
    }
    const industryTypo = (0, knowledge_base_1.searchPrinciples)({ industry, category: 'typography' })
        .filter((p) => !p.id.startsWith('ent-'))
        .slice(0, 4);
    for (const rule of industryTypo) {
        ids.add(rule.id);
    }
    return [...ids]
        .map((id) => (0, knowledge_base_1.getPrincipleById)(id))
        .filter(Boolean)
        .map((p) => p.id)
        .slice(0, 16);
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
function buildBrandNarrative(input, traits, personality, markType, typography, letterDNA, typographyStyle) {
    if (typographyStyle === 'constructed') {
        const letterText = markType === 'lettermark' ? (0, shared_1.lettermarkTextFromName)(input.companyName) : input.companyName;
        return (`${input.companyName} — constructed typographic ${markType} for ${input.industry}. ` +
            `Geometric letterforms built from basic shapes — triangles, semicircles, and rectangles — ` +
            `on a modular grid in ${traits.era.replace(/_/g, ' ')} lineage. ` +
            `Dense stacked typographic block spelling "${letterText}". ` +
            `Letters are the entire logo — no separate symbol, roundel, or emblem. ` +
            `Bold black constructive typography in the International Style tradition.`);
    }
    let lettermarkHint = '';
    if (markType === 'lettermark') {
        if ((0, shared_1.isMultiWordCompanyName)(input.companyName) && letterDNA.monogramOptions.length > 0) {
            lettermarkHint = ` Monogram directions: ${letterDNA.monogramOptions.slice(0, 2).join('; ')}.`;
        }
        else if (!(0, shared_1.isMultiWordCompanyName)(input.companyName)) {
            lettermarkHint = ` Lettermark uses the full word "${(0, shared_1.lettermarkTextFromName)(input.companyName)}".`;
        }
    }
    return (`${input.companyName} — ${MARK_TYPE_LABELS[markType]} for ${input.industry}. ` +
        `${personality} personality with ${traits.era.replace(/_/g, ' ')} typographic lineage. ` +
        `Primary direction: ${typography.primaryRecommendation.name} — ${typography.primaryRecommendation.characteristics.join(', ')}. ` +
        `Letterform strategy: ${traits.letterformStyle.slice(0, 2).join(', ')}.` +
        lettermarkHint);
}
//# sourceMappingURL=brand-dna.engine.js.map