import type { ComposedPrompt, DesignCriticResult } from '@logo-platform/shared';
import { critiqueDesign as baseCritique } from '@logo-platform/prompt-engine';

export interface LogoCriticInput {
  prompt?: ComposedPrompt;
  svgContent?: string;
  description?: string;
}

export interface ExtendedCriticResult extends DesignCriticResult {
  trademarkRisk: 'low' | 'medium' | 'high';
  scalabilityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  modernismGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  industryFit: number;
  improvementPlan: { priority: number; action: string; impact: string }[];
}

export function critiqueLogo(input: LogoCriticInput): ExtendedCriticResult {
  const base = input.prompt
    ? baseCritique(input.prompt)
    : createDefaultCritique(input.description);

  const scalabilityGrade = gradeFromScore(base.scalability);
  const modernismGrade = gradeFromScore(base.modernity);
  const trademarkRisk = assessTrademarkRisk(input);
  const industryFit = input.prompt ? estimateIndustryFit(input.prompt) : 6;

  const improvementPlan = buildImprovementPlan(base, input.prompt);

  return {
    ...base,
    trademarkRisk,
    scalabilityGrade,
    modernismGrade,
    industryFit,
    improvementPlan,
  };
}

function createDefaultCritique(description?: string): DesignCriticResult {
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

function gradeFromScore(score: number): ExtendedCriticResult['scalabilityGrade'] {
  if (score >= 9) return 'A';
  if (score >= 7.5) return 'B';
  if (score >= 6) return 'C';
  if (score >= 4) return 'D';
  return 'F';
}

function assessTrademarkRisk(input: LogoCriticInput): ExtendedCriticResult['trademarkRisk'] {
  const text = (input.description ?? input.prompt?.text ?? '').toLowerCase();
  if (text.includes('copy') || text.includes('similar to')) return 'high';
  if (text.includes('inspired') || text.includes('reference')) return 'medium';
  return 'low';
}

function estimateIndustryFit(prompt: ComposedPrompt): number {
  const industryPrinciples = prompt.selectedPrinciples.filter(
    (p) => p.category === 'industry' || p.industries?.some((i) => prompt.industry.toLowerCase().includes(i)),
  );
  return Math.min(10, 5 + industryPrinciples.length * 1.5);
}

function buildImprovementPlan(
  critic: DesignCriticResult,
  prompt?: ComposedPrompt,
): ExtendedCriticResult['improvementPlan'] {
  const plan: ExtendedCriticResult['improvementPlan'] = [];
  let priority = 1;

  if (prompt?.scores.cohesionScore !== undefined && prompt.scores.cohesionScore < 7) {
    plan.push({
      priority: priority++,
      action: 'Unify symbol and wordmark into one geometric lockup',
      impact: 'Improves brand cohesion and professional identity feel',
    });
  }
  if (prompt?.scores.identityScore !== undefined && prompt.scores.identityScore < 7) {
    plan.push({
      priority: priority++,
      action: 'Use custom modified letterforms instead of generic sans-serif',
      impact: 'Increases distinctiveness and wordmark quality',
    });
  }
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
