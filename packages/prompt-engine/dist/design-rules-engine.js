"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORY_ORDER = exports.INSPIRATION_MAP = void 0;
exports.selectDesignRules = selectDesignRules;
const knowledge_base_1 = require("@logo-platform/knowledge-base");
const INSPIRATION_MAP = {
    swiss: ['era-swiss', 'typ-swiss-typography', 'con-equal-width-lines'],
    bauhaus: ['era-bauhaus', 'typ-bauhaus-typography', 'geo-angular'],
    ibm: ['insp-ibm', 'con-grid-based', 'con-modular-grid'],
    nasa: ['insp-nasa', 'mark-iconic-symbol', 'comp-overlay'],
    lufthansa: ['insp-lufthansa', 'geo-circle', 'comp-negative-space'],
    braun: ['insp-braun', 'cx-high-simplicity', 'render-timeless'],
    cbs: ['insp-cbs', 'mark-iconic-symbol', 'geo-circle'],
    abc: ['insp-abc', 'geo-circle', 'mark-iconic-symbol'],
    olivetti: ['insp-olivetti', 'era-1960s', 'comp-negative-space'],
    westinghouse: ['insp-westinghouse', 'geo-circle', 'mark-corporate-mark'],
};
exports.INSPIRATION_MAP = INSPIRATION_MAP;
const CATEGORY_ORDER = [
    'industry',
    'geometry',
    'construction',
    'composition',
    'grid',
    'typography',
    'stroke',
    'balance',
    'complexity',
    'era',
    'color',
    'effects',
    'mark_type',
    'rendering',
];
exports.CATEGORY_ORDER = CATEGORY_ORDER;
/** Curated modernist rules — excludes synthetic enterprise bulk (ent-*) */
const CURATED_PRINCIPLES = knowledge_base_1.designPrinciples.filter((p) => !p.id.startsWith('ent-'));
function seededRandom(seed) {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}
function shufflePool(pool, rand) {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
function pickWeighted(rules, rand, count) {
    const pool = shufflePool(rules, rand);
    const picked = [];
    while (picked.length < count && pool.length > 0) {
        const totalWeight = pool.reduce((sum, r) => sum + r.weight, 0);
        let roll = rand() * totalWeight;
        let selectedIndex = pool.length - 1;
        for (let i = 0; i < pool.length; i++) {
            roll -= pool[i].weight;
            if (roll <= 0) {
                selectedIndex = i;
                break;
            }
        }
        picked.push(pool[selectedIndex]);
        pool.splice(selectedIndex, 1);
    }
    return picked;
}
function resolveIndustryRules(industry) {
    const normalized = industry.toLowerCase().trim();
    const industryRules = (0, knowledge_base_1.searchPrinciples)({ industry: normalized });
    if (industryRules.length > 0) {
        return industryRules
            .filter((r) => r.category === 'industry' && !r.id.startsWith('ent-'))
            .slice(0, 2);
    }
    const keywordRules = CURATED_PRINCIPLES.filter((p) => p.category === 'industry' &&
        (p.tags.some((t) => normalized.includes(t) || t.includes(normalized)) ||
            p.name.toLowerCase().includes(normalized)));
    if (keywordRules.length > 0)
        return keywordRules.slice(0, 2);
    return [(0, knowledge_base_1.getPrincipleById)('ind-tech')].filter(Boolean);
}
function eraPrincipleId(era) {
    return `era-${era.replace(/_/g, '-')}`;
}
function selectDesignRules(input) {
    const rand = seededRandom(input.variationSeed ?? Date.now());
    const selected = [];
    const selectedIds = new Set();
    const addRule = (rule) => {
        if (!rule || selectedIds.has(rule.id))
            return;
        const conflicts = (0, knowledge_base_1.getConflictingPrinciples)([...selectedIds, rule.id]);
        if (conflicts.length > 0)
            return;
        selected.push(rule);
        selectedIds.add(rule.id);
    };
    for (const rule of resolveIndustryRules(input.industry)) {
        addRule(rule);
    }
    // Analysis-driven principles (Brand DNA, Pipeline, Knowledge Graph, Logo Catalog)
    const catalogContext = (0, knowledge_base_1.buildCatalogPromptContext)(input.catalogReferenceIds ?? [], {
        narrative: input.catalogNarrative,
    });
    const lockedPrincipleIds = [
        ...(input.analysisPrincipleIds ?? []),
        ...(catalogContext?.principleIds ?? []),
    ];
    if (lockedPrincipleIds.length) {
        for (const id of lockedPrincipleIds) {
            addRule((0, knowledge_base_1.getPrincipleById)(id));
        }
        // Expand via knowledge graph compatibility
        for (const id of [...selectedIds]) {
            for (const compatible of (0, knowledge_base_1.getCompatiblePrinciples)(id).slice(0, 2)) {
                if (compatible.category !== 'industry' && !compatible.id.startsWith('ent-')) {
                    addRule(compatible);
                }
            }
        }
    }
    if (input.inspirationMode) {
        for (const id of INSPIRATION_MAP[input.inspirationMode] ?? []) {
            addRule((0, knowledge_base_1.getPrincipleById)(id));
        }
    }
    if (input.preferredEra) {
        addRule((0, knowledge_base_1.getPrincipleById)(eraPrincipleId(input.preferredEra)));
    }
    else if (catalogContext?.eras.length === 1) {
        addRule((0, knowledge_base_1.getPrincipleById)(eraPrincipleId(catalogContext.eras[0])));
    }
    else {
        const eraRules = CURATED_PRINCIPLES.filter((p) => p.category === 'era' && p.era?.length);
        addRule(pickWeighted(eraRules, rand, 1)[0]);
    }
    for (const category of CATEGORY_ORDER) {
        if (['industry', 'era', 'inspiration'].includes(category))
            continue;
        const pool = CURATED_PRINCIPLES.filter((p) => {
            if (p.category !== category)
                return false;
            if (selectedIds.has(p.id))
                return false;
            const compatibleWithSelected = selected.some((s) => s.compatibility.includes(p.id) ||
                p.compatibility.includes(s.id) ||
                s.compatibility.some((c) => p.tags.includes(c) || p.id.includes(c)));
            if (selected.length > 3 && !compatibleWithSelected && category !== 'rendering') {
                return rand() > 0.6;
            }
            return true;
        });
        const count = category === 'rendering' ? 3 : category === 'geometry' || category === 'construction' ? 2 : 1;
        for (const rule of pickWeighted(pool, rand, count)) {
            addRule(rule);
        }
    }
    const renderingDefaults = ['render-flat-vector', 'render-no-shadows', 'render-timeless', 'color-no-gradient'];
    for (const id of renderingDefaults) {
        addRule((0, knowledge_base_1.getPrincipleById)(id));
    }
    const minimalism = input.minimalismLevel ?? 8;
    if (minimalism >= 7) {
        addRule((0, knowledge_base_1.getPrincipleById)('cx-minimal-complexity'));
        addRule((0, knowledge_base_1.getPrincipleById)('cx-high-simplicity'));
    }
    const dna = buildLogoDNA(selected, input, catalogContext);
    const recommendations = buildRecommendations(input.industry, selected);
    const conflicts = (0, knowledge_base_1.getConflictingPrinciples)(selected.map((p) => p.id));
    return {
        principles: selected,
        dna,
        recommendations,
        conflicts,
        catalogInspiration: catalogContext?.inspirationFragments,
    };
}
function buildLogoDNA(principles, input, catalogContext) {
    const byCategory = (cat) => principles.filter((p) => p.category === cat).map((p) => p.name);
    const complexityRule = principles.find((p) => p.category === 'complexity');
    const eraRule = principles.find((p) => p.category === 'era');
    return {
        geometry: catalogContext?.geometry.length
            ? catalogContext.geometry.map((g) => g.replace(/-/g, ' '))
            : byCategory('geometry'),
        construction: catalogContext?.construction.length
            ? catalogContext.construction.map((c) => c.replace(/-/g, ' '))
            : byCategory('construction'),
        balance: byCategory('balance'),
        complexity: complexityRule?.tags.includes('minimal') || complexityRule?.id.includes('minimal')
            ? 'minimal'
            : complexityRule?.id.includes('medium')
                ? 'medium'
                : 'minimal',
        era: (eraRule?.era?.[0] ?? input.preferredEra ?? 'swiss'),
        typography: byCategory('typography'),
        recognition: 7 + Math.min(principles.filter((p) => p.category === 'mark_type').length, 2),
        minimalism: input.minimalismLevel ?? 8,
        visualWeight: byCategory('balance').length ? byCategory('balance') : ['Optical Balance'],
        harmony: principles.filter((p) => p.tags.includes('harmony')).map((p) => p.name),
    };
}
function buildRecommendations(industry, selected) {
    const selectedIds = new Set(selected.map((p) => p.id));
    const industryRules = resolveIndustryRules(industry);
    const suggestions = (0, knowledge_base_1.searchPrinciples)({ industry })
        .filter((p) => !selectedIds.has(p.id) && !p.id.startsWith('ent-'))
        .slice(0, 5);
    if (suggestions.length === 0) {
        const fallbacks = ['geo-circle', 'comp-negative-space', 'era-bauhaus', 'cx-minimal-complexity'];
        for (const id of fallbacks) {
            const rule = (0, knowledge_base_1.getPrincipleById)(id);
            if (rule && !selectedIds.has(id)) {
                suggestions.push(rule);
            }
        }
    }
    return suggestions.map((p, i) => ({
        principleId: p.id,
        name: p.name,
        reason: `Recommended for ${industry} based on ${industryRules[0]?.name ?? 'modernist'} principles`,
        confidence: 0.95 - i * 0.08,
    }));
}
//# sourceMappingURL=design-rules-engine.js.map