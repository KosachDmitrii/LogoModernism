"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reverseAnalyzeLogo = reverseAnalyzeLogo;
const knowledge_base_1 = require("@logo-platform/knowledge-base");
function reverseAnalyzeLogo(input) {
    const desc = input.description.toLowerCase();
    const shapes = input.observedShapes ?? extractShapes(desc);
    const matchedPrinciples = knowledge_base_1.designPrinciples
        .map((p) => {
        let confidence = 0;
        if (desc.includes(p.name.toLowerCase()))
            confidence += 0.4;
        if (p.tags.some((t) => desc.includes(t)))
            confidence += 0.2;
        if (shapes.some((s) => p.tags.includes(s) || p.name.toLowerCase().includes(s)))
            confidence += 0.3;
        return { id: p.id, name: p.name, confidence };
    })
        .filter((p) => p.confidence > 0)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 15);
    const catalog = (0, knowledge_base_1.getFullCatalog)();
    const matchedReferences = catalog
        .map((ref) => {
        let similarity = 0;
        if (input.observedStyle && ref.era.includes(input.observedStyle))
            similarity += 0.3;
        if (desc.includes(ref.name.toLowerCase()))
            similarity += 0.5;
        if (ref.designer && desc.includes(ref.designer.toLowerCase()))
            similarity += 0.4;
        if (shapes.some((s) => ref.geometry.includes(s) || ref.shape.includes(s)))
            similarity += 0.4;
        const principleOverlap = ref.principleIds.filter((id) => matchedPrinciples.some((p) => p.id === id)).length;
        similarity += principleOverlap * 0.1;
        return { id: ref.id, name: ref.name, similarity: Math.min(1, similarity) };
    })
        .filter((r) => r.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity);
    const catalogMatches = (0, knowledge_base_1.matchCatalogToDescription)(desc, 5).map((ref) => ({
        id: ref.id,
        name: ref.name,
        similarity: 0.6,
    }));
    const mergedRefs = [...matchedReferences];
    for (const cm of catalogMatches) {
        if (!mergedRefs.some((r) => r.id === cm.id))
            mergedRefs.push(cm);
    }
    const topReferences = mergedRefs.sort((a, b) => b.similarity - a.similarity).slice(0, 8);
    const principleIds = matchedPrinciples.map((p) => p.id);
    const topRef = topReferences[0];
    const estimatedDNA = {
        geometry: shapes.length ? shapes : ['circle'],
        construction: extractFromPrinciples(principleIds, 'construction'),
        balance: ['optical-balance'],
        complexity: input.observedColors && input.observedColors > 2 ? 'medium' : 'minimal',
        era: (topRef ? catalog.find((r) => r.id === topRef.id)?.era : 'swiss') ?? 'swiss',
        typography: extractFromPrinciples(principleIds, 'typography'),
        recognition: topReferences.length > 0 ? 8 : 5,
        minimalism: input.observedColors === 1 ? 9 : input.observedColors === 2 ? 7 : 5,
        visualWeight: ['medium'],
        harmony: ['geometric'],
    };
    return {
        estimatedDNA,
        matchedReferences: topReferences,
        matchedPrinciples,
        eraEstimate: estimatedDNA.era.replace(/_/g, ' '),
        complexityEstimate: estimatedDNA.complexity,
        constructionHypothesis: buildHypothesis(shapes, matchedPrinciples),
        modernismScore: calculateModernismScore(matchedPrinciples, estimatedDNA),
    };
}
function extractShapes(desc) {
    const shapeKeywords = ['circle', 'square', 'triangle', 'hexagon', 'cross', 'line', 'organic', 'diamond'];
    return shapeKeywords.filter((s) => desc.includes(s));
}
function extractFromPrinciples(ids, category) {
    return knowledge_base_1.designPrinciples
        .filter((p) => ids.includes(p.id) && p.category === category)
        .map((p) => p.name)
        .slice(0, 3);
}
function buildHypothesis(shapes, principles) {
    const hypotheses = [];
    if (shapes.includes('circle'))
        hypotheses.push('Primary form derived from circular construction');
    if (principles.some((p) => p.name.includes('Grid')))
        hypotheses.push('Built on modular grid system');
    if (principles.some((p) => p.name.includes('Negative')))
        hypotheses.push('Negative space used for secondary symbolism');
    if (!hypotheses.length)
        hypotheses.push('Geometric construction with modernist simplification');
    return hypotheses;
}
function calculateModernismScore(principles, dna) {
    let score = 5;
    score += principles.length * 0.3;
    if (dna.minimalism >= 7)
        score += 2;
    if (dna.complexity === 'minimal')
        score += 1.5;
    return Math.min(10, Math.round(score * 10) / 10);
}
//# sourceMappingURL=reverse-analysis.engine.js.map