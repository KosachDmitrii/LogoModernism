import { describe, expect, it } from 'vitest';
import type { BrainArchitecture, BrainGenerateRequest, ComposedPrompt, DesignDecision } from '@logo-platform/shared';
import { evaluateConstraintCompliance, constraintFeedback } from '../../src/reasoning/constraint-gate';

const baseArchitecture: BrainArchitecture = {
  clientIntent: {
    businessEssence: 'fintech trust',
    abstractionLevel: 'stylized',
    industryDomain: 'fintech',
    desiredMotifs: ['grid'],
    forbiddenMotifs: ['mascot', 'cartoon'],
    personality: ['precise'],
    visualTone: ['technical'],
    explicitRequests: [],
    confidence: 0.8,
    source: 'rules',
  },
  designStrategy: {
    markArchitecture: 'wordmark lockup',
    constructionSystem: 'modular grid',
    typographyLogic: 'geometric sans',
    colorSystem: 'black and white',
    symbolLogic: 'none',
    industryDirection: 'trust and precision',
    suggestFragments: [],
    avoidFragments: ['gradients'],
    reasoning: 'test strategy',
    confidence: 0.8,
  },
  agentContributions: [],
  interviewQuestions: [],
  visualReferences: [],
};

const baseDecision: DesignDecision = {
  markType: 'wordmark',
  typographyStyle: 'constructed',
  geometry: ['circle'],
  construction: ['modular-grid'],
  composition: ['symmetry'],
  typography: ['geometric-sans'],
  era: 'swiss',
  principles: [],
  antiPatterns: [],
  catalogReferences: [],
  reasoning: 'test',
  promptText: 'Minimal geometric wordmark',
  confidence: 0.8,
};

function prompt(text: string): ComposedPrompt {
  return {
    id: 'p1',
    text,
    industry: 'fintech',
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

const request: BrainGenerateRequest = {
  industry: 'fintech',
  companyName: 'NovaPay',
  markType: 'wordmark',
  briefContext: {
    colorPalette: 'black_white',
    allowShadows: false,
    allowPhotoreal: false,
  },
};

describe('evaluateConstraintCompliance', () => {
  it('passes compliant monochrome wordmark prompt', () => {
    const report = evaluateConstraintCompliance(
      baseDecision,
      prompt(
        'Minimal geometric wordmark for NovaPay. Flat vector Swiss modernism, black on white, modular grid construction. No gradients, no shadows.',
      ),
      baseArchitecture,
      request,
    );
    expect(report.passed).toBe(true);
    expect(report.violations.filter((v) => v.severity === 'error')).toHaveLength(0);
  });

  it('flags missing brand name', () => {
    const report = evaluateConstraintCompliance(
      baseDecision,
      prompt('Minimal geometric wordmark. Flat vector, black on white.'),
      baseArchitecture,
      request,
    );
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.code === 'brand_missing')).toBe(true);
  });

  it('flags gradient in monochrome brief', () => {
    const report = evaluateConstraintCompliance(
      baseDecision,
      prompt('NovaPay wordmark with vibrant gradient palette and multicolor accents.'),
      baseArchitecture,
      request,
    );
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.code === 'palette_violation')).toBe(true);
  });

  it('does not flag render terms listed as avoided', () => {
    const report = evaluateConstraintCompliance(
      baseDecision,
      prompt(
        'Minimal geometric wordmark for NovaPay. Flat vector Swiss modernism, black on white, modular grid construction. Avoid: gradients, photorealism, mockups, busy backgrounds, stock clipart.',
      ),
      baseArchitecture,
      request,
    );
    expect(report.passed).toBe(true);
    expect(report.violations.some((v) => v.code === 'photoreal_forbidden')).toBe(false);
  });

  it('does not flag render terms when body lists client forbids before Avoid section', () => {
    const report = evaluateConstraintCompliance(
      baseDecision,
      prompt(
        'Minimal geometric wordmark for NovaPay. Flat vector Swiss modernism. Client forbids: photorealism, mockups, gradients. Avoid: photorealism, mockups, busy backgrounds, stock clipart.',
      ),
      baseArchitecture,
      request,
    );
    expect(report.passed).toBe(true);
    expect(report.violations.some((v) => v.code === 'photoreal_forbidden')).toBe(false);
  });

  it('does not flag creative territory metadata appended after Avoid section', () => {
    const report = evaluateConstraintCompliance(
      baseDecision,
      prompt(
        'Minimal geometric wordmark for NovaPay. Flat vector Swiss modernism. Avoid: photorealism, mockups. Creative direction: Modular grid thesis. Construction focus: baseline grid. Typography focus: geometric sans. Color approach: monochrome.',
      ),
      baseArchitecture,
      request,
    );
    expect(report.passed).toBe(true);
    expect(report.violations.some((v) => v.code === 'photoreal_forbidden')).toBe(false);
  });

  it('does not flag typography when body says symbol-only with no text', () => {
    const symbolRequest: BrainGenerateRequest = {
      industry: 'food',
      markType: 'combination',
    };
    const report = evaluateConstraintCompliance(
      { ...baseDecision, markType: 'combination' },
      prompt(
        'Abstract symbol-only mark, no text, no wordmark. Flat vector geometric pizza silhouette. Avoid: photorealism, mockups.',
      ),
      baseArchitecture,
      symbolRequest,
    );
    expect(report.violations.some((v) => v.code === 'symbol_only_text')).toBe(false);
  });

  it('does not treat style anti-patterns as client motif conflicts', () => {
    const architecture = {
      ...baseArchitecture,
      clientIntent: {
        ...baseArchitecture.clientIntent,
        forbiddenMotifs: ['photoreal', 'literal reference', 'mascot'],
      },
    };
    const report = evaluateConstraintCompliance(
      baseDecision,
      prompt(
        'Minimal geometric wordmark for NovaPay. Flat vector Swiss modernism. Avoid: photorealism, mockups. Without literal reference.',
      ),
      architecture,
      request,
    );
    expect(report.violations.some((v) => v.code === 'forbidden_motif' && v.message.includes('photoreal'))).toBe(
      false,
    );
    expect(
      report.violations.some((v) => v.code === 'forbidden_motif' && v.message.includes('literal reference')),
    ).toBe(false);
  });

  it('still flags real forbidden motifs when positively recommended', () => {
    const architecture = {
      ...baseArchitecture,
      clientIntent: {
        ...baseArchitecture.clientIntent,
        forbiddenMotifs: ['mascot'],
      },
    };
    const report = evaluateConstraintCompliance(
      baseDecision,
      prompt('NovaPay logo with a friendly mascot character as the hero mark.'),
      architecture,
      request,
    );
    expect(report.violations.some((v) => v.code === 'forbidden_motif')).toBe(true);
  });

  it('flags forbidden motifs from client intent', () => {
    const report = evaluateConstraintCompliance(
      baseDecision,
      prompt('NovaPay mascot cartoon character logo with playful mascot styling.'),
      baseArchitecture,
      request,
    );
    expect(report.passed).toBe(false);
    const violation = report.violations.find((v) => v.code === 'forbidden_motif');
    expect(violation).toBeDefined();
    expect(violation?.briefSide?.role).toBe('brief');
    expect(violation?.outputSide?.role).toBe('output');
    expect(violation?.resolutions?.length).toBeGreaterThan(0);
  });

  it('includes conflict resolutions for palette violations', () => {
    const report = evaluateConstraintCompliance(
      baseDecision,
      prompt('NovaPay wordmark with vibrant gradient palette and multicolor accents.'),
      baseArchitecture,
      request,
    );
    const violation = report.violations.find((v) => v.code === 'palette_violation');
    expect(violation?.resolutions?.some((r) => r.id === 'keep_brief_recompose')).toBe(true);
    expect(violation?.resolutions?.some((r) => r.id === 'allow_two_color')).toBe(true);
  });

  it('returns actionable constraint feedback', () => {
    const report = evaluateConstraintCompliance(
      baseDecision,
      prompt('Generic logo without brand text.'),
      baseArchitecture,
      request,
    );
    const feedback = constraintFeedback(report);
    expect(feedback.length).toBeGreaterThan(0);
    expect(feedback[0]).toContain('NovaPay');
  });
});
