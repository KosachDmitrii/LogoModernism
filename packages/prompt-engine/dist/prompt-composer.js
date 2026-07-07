"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composePrompt = composePrompt;
exports.composePromptVariations = composePromptVariations;
exports.buildPromptFromTemplate = buildPromptFromTemplate;
const node_crypto_1 = require("node:crypto");
const design_rules_engine_1 = require("./design-rules-engine");
const prompt_scorer_1 = require("./prompt-scorer");
const prompt_optimizer_1 = require("./prompt-optimizer");
const CATEGORY_LABELS = {
    industry: 'Industry',
    geometry: 'Geometry',
    construction: 'Construction',
    composition: 'Composition',
    grid: 'Grid',
    typography: 'Typography',
    stroke: 'Stroke',
    balance: 'Balance',
    complexity: 'Complexity',
    era: 'Era',
    color: 'Color',
    effects: 'Effects',
    mark_type: 'Mark Type',
    rendering: 'Rendering',
};
const RICH_CATEGORIES = new Set([
    'construction',
    'composition',
    'era',
    'grid',
    'typography',
]);
const CATALOG_OVERLAP_CATEGORIES = new Set([
    'geometry',
    'construction',
    'composition',
    'typography',
    'mark_type',
]);
const CATALOG_CATEGORY_MARKERS = {
    geometry: 'geometry vocabulary',
    construction: 'construction:',
    composition: 'composition:',
    typography: 'typography:',
    mark_type: 'mark type:',
};
function ruleToFragment(rule, compact = false) {
    if (!compact && RICH_CATEGORIES.has(rule.category) && rule.description.length > 12) {
        return `${rule.promptFragment}. ${rule.description}`;
    }
    return rule.promptFragment;
}
function overlapsCatalog(fragment, catalogText) {
    if (!catalogText)
        return false;
    const normalized = fragment.toLowerCase();
    if (catalogText.includes(normalized))
        return true;
    return (0, prompt_optimizer_1.clauseOverlaps)(fragment, catalogText);
}
function isRedundantAvoid(pattern, principles) {
    const ids = new Set(principles.map((p) => p.id));
    const normalized = pattern.toLowerCase();
    if (normalized.includes('gradient') && (ids.has('color-no-gradient') || ids.has('fx-gradient-avoid'))) {
        return true;
    }
    if (normalized.includes('shadow') && (ids.has('render-no-shadows') || ids.has('fx-shadow-avoid'))) {
        return true;
    }
    return false;
}
function filterPrinciplesForCatalog(rules, category, catalogText) {
    if (!catalogText || !CATALOG_OVERLAP_CATEGORIES.has(category))
        return rules;
    return rules.filter((rule) => !overlapsCatalog(ruleToFragment(rule, true), catalogText));
}
function composePrompt(input) {
    const fragments = [];
    const hasCatalog = Boolean(input.catalogInspiration?.length);
    const catalogText = (input.catalogInspiration ?? []).join(' ').toLowerCase();
    fragments.push('Minimal geometric logo design');
    if (input.companyName) {
        fragments.push(`for "${input.companyName}"`);
    }
    if (input.catalogInspiration?.length) {
        fragments.push(input.catalogInspiration.join('. '));
    }
    for (const category of design_rules_engine_1.CATEGORY_ORDER) {
        const marker = CATALOG_CATEGORY_MARKERS[category];
        if (hasCatalog && marker && catalogText.includes(marker)) {
            continue;
        }
        const rules = filterPrinciplesForCatalog(input.principles.filter((p) => p.category === category), category, catalogText);
        if (rules.length === 0)
            continue;
        const label = CATEGORY_LABELS[category];
        const categoryFragments = rules.map((rule) => ruleToFragment(rule, hasCatalog));
        if (label && categoryFragments.length > 1) {
            fragments.push(`${label}: ${categoryFragments.join(', ')}`);
        }
        else {
            fragments.push(...categoryFragments);
        }
    }
    const antiPatterns = [
        ...new Set(input.principles
            .flatMap((p) => p.antiPatterns)
            .map((pattern) => pattern?.trim())
            .filter((pattern) => Boolean(pattern))
            .filter((pattern) => !isRedundantAvoid(pattern, input.principles))),
    ].slice(0, 4);
    if (antiPatterns.length > 0) {
        fragments.push(`Avoid: ${antiPatterns.join(', ')}`);
    }
    fragments.push('Premium professional branding');
    fragments.push('Timeless modernist aesthetic');
    const rawText = fragments.join('. ').replace(/\.\s*\./g, '.');
    const optimized = (0, prompt_optimizer_1.optimizePrompt)(rawText, input.principles);
    const scores = (0, prompt_scorer_1.scorePrompt)(optimized, input.principles, input.dna);
    return {
        id: (0, node_crypto_1.randomUUID)(),
        text: optimized,
        industry: input.industry,
        selectedPrinciples: input.principles,
        scores,
        dna: input.dna,
        metadata: {
            era: input.dna.era,
            variationIndex: input.variationIndex,
            inspirationMode: input.inspirationMode,
        },
    };
}
function composePromptVariations(baseInput, count, selectRules) {
    const prompts = [];
    for (let i = 0; i < count; i++) {
        const { principles, dna } = selectRules(i + 1);
        prompts.push(composePrompt({
            ...baseInput,
            principles,
            dna,
            variationIndex: i + 1,
        }));
    }
    return prompts.sort((a, b) => b.scores.promptQuality - a.scores.promptQuality);
}
function buildPromptFromTemplate(templateFragments, principles, industry, dna) {
    const rawText = templateFragments.join('. ');
    const optimized = (0, prompt_optimizer_1.optimizePrompt)(rawText, principles);
    const scores = (0, prompt_scorer_1.scorePrompt)(optimized, principles, dna);
    return {
        id: (0, node_crypto_1.randomUUID)(),
        text: optimized,
        industry,
        selectedPrinciples: principles,
        scores,
        dna,
        metadata: { era: dna.era },
    };
}
//# sourceMappingURL=prompt-composer.js.map