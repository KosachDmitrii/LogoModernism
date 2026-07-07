"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeGeometry = analyzeGeometry;
const geometry_primitives_1 = require("./geometry-primitives");
const knowledge_base_1 = require("@logo-platform/knowledge-base");
function analyzeGeometry(input) {
    const principles = (0, knowledge_base_1.searchPrinciples)({ industry: input.industry, category: 'geometry' });
    const principleTags = new Set(principles.flatMap((p) => p.tags));
    const recommendations = geometry_primitives_1.GEOMETRY_PRIMITIVES.map((prim) => {
        let score = 5;
        const reasons = [];
        for (const tag of prim.psychologyTags) {
            if (principleTags.has(tag) || input.industry.toLowerCase().includes(tag)) {
                score += 2;
                reasons.push(`Aligns with ${tag} for ${input.industry}`);
            }
        }
        if (input.preferredShapes?.some((s) => prim.name.toLowerCase().includes(s.toLowerCase()))) {
            score += 3;
            reasons.push('Matches preferred shape');
        }
        if (input.complexity === 'minimal' && prim.category !== 'compound')
            score += 1;
        if (input.complexity === 'high' && prim.category === 'compound')
            score += 2;
        return {
            primitiveId: prim.id,
            name: prim.name,
            score: Math.min(10, score),
            reason: reasons.join('; ') || 'General geometric foundation',
            constructionSystem: prim.constructionSteps,
            svgPreview: prim.svgPath,
        };
    }).sort((a, b) => b.score - a.score);
    const top = recommendations[0];
    const topPrim = (0, geometry_primitives_1.getPrimitiveById)(top.primitiveId);
    return {
        recommendations: recommendations.slice(0, 6),
        constructionGrid: topPrim?.gridAlignment[0] ?? 'modular-grid',
        symmetryType: top.score >= 8 ? 'bilateral' : 'radial',
        moduleSize: input.complexity === 'minimal' ? '8-unit grid' : '12-unit grid',
        compatiblePrimitives: topPrim
            ? topPrim.compatibleWith.map((id) => [top.primitiveId, id])
            : [],
    };
}
//# sourceMappingURL=geometry-intelligence.engine.js.map