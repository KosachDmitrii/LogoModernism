import { expect } from 'vitest';
import type { DesignDecision } from '@logo-platform/shared';
import type { ClientVisualIntent } from '@logo-platform/shared';
import type { ExtractedPrinciple } from '../../../src/ingest/principle-extractor';

export interface ReasoningEvalExpectations {
  companyName?: string;
  minPromptLength?: number;
  minBaseRatio?: number;
  requiredInPrompt?: string[];
  /** Terms that must not be recommended (allows "no gradients", "avoid wordmarks", etc.) */
  forbiddenRecommendations?: string[];
  requiredAntiPatterns?: string[];
  allowedMarkTypes?: Array<'wordmark' | 'lettermark' | 'combination'>;
  maxGeometryFamilies?: number;
}

function promptRecommends(prompt: string, term: string): boolean {
  const lower = prompt.toLowerCase();
  const termLower = term.toLowerCase();
  if (!lower.includes(termLower)) return false;

  const prohibition = new RegExp(
    `(no|without|avoid|not\\s+(?:a|an|use|using)?\\s*)[\\w\\s-]{0,24}${termLower}`,
    'i',
  );
  if (prohibition.test(lower)) return false;

  const avoidList = new RegExp(`avoid[^.]{0,80}${termLower}`, 'i');
  if (avoidList.test(lower)) return false;

  return true;
}

export function assertReasoningQuality(
  decision: DesignDecision,
  basePromptText: string,
  expectations: ReasoningEvalExpectations,
): void {
  const prompt = decision.promptText.toLowerCase();
  const minLength = expectations.minPromptLength ?? 120;

  expect(decision.promptText.length).toBeGreaterThanOrEqual(minLength);

  if (basePromptText.trim()) {
    const ratio = expectations.minBaseRatio ?? 0.85;
    expect(decision.promptText.length).toBeGreaterThanOrEqual(basePromptText.length * ratio);
  }

  if (expectations.companyName) {
    expect(decision.promptText).toMatch(new RegExp(expectations.companyName, 'i'));
  }

  if (expectations.allowedMarkTypes?.length) {
    expect(expectations.allowedMarkTypes).toContain(decision.markType);
  }

  for (const term of expectations.requiredInPrompt ?? []) {
    expect(prompt).toMatch(new RegExp(term, 'i'));
  }

  for (const term of expectations.forbiddenRecommendations ?? []) {
    expect(promptRecommends(prompt, term)).toBe(false);
  }

  for (const pattern of expectations.requiredAntiPatterns ?? []) {
    const anti = decision.antiPatterns.join(' ').toLowerCase();
    expect(anti.length === 0 || anti).toMatch(new RegExp(pattern, 'i'));
  }

  if (expectations.maxGeometryFamilies !== undefined) {
    const geometryTerms = ['circle', 'blob', 'triangle', 'square', 'hexagon', 'organic'];
    const families = geometryTerms.filter((term) => prompt.includes(term));
    expect(families.length).toBeLessThanOrEqual(expectations.maxGeometryFamilies);
  }

  expect(decision.confidence).toBeGreaterThan(0.3);
  expect(decision.reasoning.length).toBeGreaterThan(20);
  expect(decision.principles.length).toBeGreaterThan(0);
}

export function assertPrincipleExtractionQuality(principles: ExtractedPrinciple[]): void {
  expect(principles.length).toBeGreaterThanOrEqual(5);

  const categories = new Set(principles.map((p) => p.category));
  expect(categories.size).toBeGreaterThanOrEqual(2);

  for (const principle of principles) {
    expect(principle.promptFragment.length).toBeGreaterThan(3);
    expect(principle.ruleText.length).toBeGreaterThan(10);
    expect(principle.confidence).toBeGreaterThanOrEqual(0.3);
    expect(principle.confidence).toBeLessThanOrEqual(1);
  }

  const vague = principles.filter((p) =>
    /good design|be creative|make it nice|look professional/i.test(p.ruleText),
  );
  expect(vague.length).toBeLessThan(principles.length / 2);
}

export function assertClientIntentQuality(
  intent: ClientVisualIntent,
  expectations: {
    forbiddenAny?: string[];
    desiredAny?: string[];
    abstractionLevel?: ClientVisualIntent['abstractionLevel'];
  },
): void {
  const forbidden = intent.forbiddenMotifs.join(' ').toLowerCase();
  const desired = intent.desiredMotifs.join(' ').toLowerCase();

  for (const term of expectations.forbiddenAny ?? []) {
    expect(forbidden).toMatch(new RegExp(term, 'i'));
  }

  for (const term of expectations.desiredAny ?? []) {
    expect(desired).toMatch(new RegExp(term, 'i'));
  }

  if (expectations.abstractionLevel) {
    expect(intent.abstractionLevel).toBe(expectations.abstractionLevel);
  }

  expect(intent.confidence).toBeGreaterThan(0);
}
