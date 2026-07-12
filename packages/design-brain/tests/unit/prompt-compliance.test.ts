import { describe, expect, it } from 'vitest';
import {
  bodyRecommendsTerm,
  buildComplianceScanContext,
  splitPromptForCompliance,
} from '@logo-platform/shared';
import { evaluateConstraintCompliance } from '../../src/reasoning/constraint-gate';
import type { BrainArchitecture, BrainGenerateRequest, ComposedPrompt, DesignDecision } from '@logo-platform/shared';

const baseArchitecture: BrainArchitecture = {
  clientIntent: {
    businessEssence: 'pizza brand',
    abstractionLevel: 'stylized',
    industryDomain: 'food',
    desiredMotifs: [],
    forbiddenMotifs: [],
    personality: [],
    visualTone: [],
    explicitRequests: [],
    confidence: 0.8,
    source: 'rules',
  },
  designStrategy: {
    markArchitecture: 'symbol',
    constructionSystem: 'modular grid',
    typographyLogic: 'none',
    colorSystem: 'black and white',
    symbolLogic: 'abstract',
    industryDirection: 'food',
    suggestFragments: [],
    avoidFragments: [],
    reasoning: 'test',
    confidence: 0.8,
  },
  agentContributions: [],
  interviewQuestions: [],
  visualReferences: [],
};

const baseDecision: DesignDecision = {
  markType: 'combination',
  typographyStyle: 'standard',
  geometry: ['circle'],
  construction: ['modular-grid'],
  composition: ['symmetry'],
  typography: [],
  era: 'swiss',
  principles: [],
  antiPatterns: [],
  catalogReferences: [],
  reasoning: 'test',
  promptText: '',
  confidence: 0.8,
};

const flatVectorRequest: BrainGenerateRequest = {
  industry: 'food',
  briefContext: {
    allowPhotoreal: false,
    allowShadows: false,
  },
};

function composedPrompt(text: string): ComposedPrompt {
  return {
    id: 'p1',
    text,
    industry: 'food',
    selectedPrinciples: [],
    scores: { brandRecognitionScore: 8, cohesionScore: 8, identityScore: 8, promptQuality: 8 },
    dna: {
      geometry: [],
      construction: [],
      balance: [],
      complexity: 'minimal',
      era: 'swiss',
      typography: [],
      recognition: 8,
      minimalism: 8,
      visualWeight: [],
      harmony: [],
    },
    metadata: { era: 'swiss' },
  };
}

/** Typical brain output after optimizePrompt — inline "no X" plus Avoid suffix. */
const TYPICAL_FLAT_VECTOR_PROMPT =
  'Flat vector logo, no gradients, no shadows, no photorealism, centered composition. Avoid: photorealism, mockups, busy backgrounds, stock clipart.';

describe('prompt-compliance (shared)', () => {
  it('splits Avoid: suffix from body', () => {
    const split = splitPromptForCompliance(TYPICAL_FLAT_VECTOR_PROMPT);
    expect(split.body).toContain('no photorealism');
    expect(split.avoidSuffix).toMatch(/^Avoid:/i);
  });

  it('splits bare Avoid without colon', () => {
    const split = splitPromptForCompliance(
      'Minimal mark. Avoid photorealism, mockups, busy backgrounds, stock clipart.',
    );
    expect(split.body).toBe('Minimal mark');
    expect(split.avoidSuffix).toMatch(/^Avoid/i);
  });

  it('does not treat inline "no photorealism" as a positive recommendation', () => {
    const { body } = buildComplianceScanContext(TYPICAL_FLAT_VECTOR_PROMPT);
    expect(bodyRecommendsTerm(body, 'photoreal')).toBe(false);
    expect(bodyRecommendsTerm(body, 'shadow')).toBe(false);
    expect(bodyRecommendsTerm(body, 'gradient')).toBe(false);
  });

  it('does not treat terms listed only in Avoid suffix as recommendations', () => {
    const { body } = buildComplianceScanContext(TYPICAL_FLAT_VECTOR_PROMPT);
    expect(bodyRecommendsTerm(body, 'mockup')).toBe(false);
    expect(bodyRecommendsTerm(body, 'clipart')).toBe(false);
  });

  it('still flags genuinely positive photoreal language in body', () => {
    expect(
      bodyRecommendsTerm(
        'Premium photorealistic 3D render of the logo on a realistic mockup scene.',
        'photoreal',
      ),
    ).toBe(true);
  });
});

describe('evaluateConstraintCompliance + typical brain prompt', () => {
  it('passes when body uses inline no-photorealism and Avoid lists style defaults', () => {
    const report = evaluateConstraintCompliance(
      baseDecision,
      composedPrompt(TYPICAL_FLAT_VECTOR_PROMPT),
      baseArchitecture,
      flatVectorRequest,
    );

    expect(report.passed).toBe(true);
    expect(report.violations.filter((v) => v.severity === 'error')).toHaveLength(0);
  });

  it('matches the user-reported false positive scenario (photoreal + mockup in Avoid excerpt)', () => {
    const report = evaluateConstraintCompliance(
      baseDecision,
      composedPrompt(TYPICAL_FLAT_VECTOR_PROMPT),
      baseArchitecture,
      flatVectorRequest,
    );

    expect(report.violations.some((v) => v.code === 'photoreal_forbidden')).toBe(false);
    expect(report.violations.some((v) => v.code === 'photoreal_forbidden' && v.message.includes('mockup'))).toBe(
      false,
    );
    expect(report.violations.some((v) => v.message.includes('mockup'))).toBe(false);
  });
});
