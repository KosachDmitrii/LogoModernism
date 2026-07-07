"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.critiqueLogo = critiqueLogo;
const prompt_engine_1 = require("@logo-platform/prompt-engine");
function critiqueLogo(input) {
    const base = input.prompt
        ? (0, prompt_engine_1.critiqueDesign)(input.prompt)
        : createDefaultCritique(input.description);
    const scalabilityGrade = gradeFromScore(base.scalability);
    const modernismGrade = gradeFromScore(base.modernity);
    const trademarkRisk = assessTrademarkRisk(input);
    const industryFit = input.prompt ? estimateIndustryFit(input.prompt) : 6;
    const improvementPlan = buildImprovementPlan(base);
    return {
        ...base,
        trademarkRisk,
        scalabilityGrade,
        modernismGrade,
        industryFit,
        improvementPlan,
    };
}
function createDefaultCritique(description) {
    const hasGeometry = description?.toLowerCase().includes('geometric') ?? false;
    return {
        recognizability: hasGeometry ? 7 : 5,
        scalability: 6,
        balance: 6,
        contrast: 7,
        simplicity: hasGeometry ? 8 : 5,
        modernity: hasGeometry ? 7 : 5,
        registrability: 6,
        overallScore: 6.2,
        feedback: ['Provide more detail for comprehensive critique'],
        suggestedMutations: [],
    };
}
function gradeFromScore(score) {
    if (score >= 9)
        return 'A';
    if (score >= 7.5)
        return 'B';
    if (score >= 6)
        return 'C';
    if (score >= 4)
        return 'D';
    return 'F';
}
function assessTrademarkRisk(input) {
    const text = (input.description ?? input.prompt?.text ?? '').toLowerCase();
    if (text.includes('copy') || text.includes('similar to'))
        return 'high';
    if (text.includes('inspired') || text.includes('reference'))
        return 'medium';
    return 'low';
}
function estimateIndustryFit(prompt) {
    const industryPrinciples = prompt.selectedPrinciples.filter((p) => p.category === 'industry' || p.industries?.some((i) => prompt.industry.toLowerCase().includes(i)));
    return Math.min(10, 5 + industryPrinciples.length * 1.5);
}
function buildImprovementPlan(critic) {
    const plan = [];
    let priority = 1;
    if (critic.scalability < 7) {
        plan.push({ priority: priority++, action: 'Simplify to flat vector forms', impact: 'Improves favicon legibility' });
    }
    if (critic.simplicity < 7) {
        plan.push({ priority: priority++, action: 'Reduce element count', impact: 'Increases timeless appeal' });
    }
    if (critic.recognizability < 7) {
        plan.push({ priority: priority++, action: 'Strengthen distinctive silhouette', impact: 'Better brand recall' });
    }
    if (critic.modernity < 7) {
        plan.push({ priority: priority++, action: 'Apply Swiss grid construction', impact: 'Elevates modernist quality' });
    }
    return plan;
}
//# sourceMappingURL=logo-critic.engine.js.map