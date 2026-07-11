import { describe, expect, it } from 'vitest';
import type { BrainArchitecture, BrainGenerateRequest } from '@logo-platform/shared';
import { buildCreativeTerritories, selectCreativeTerritory } from '../../src/reasoning/creative-strategy';

const architecture: BrainArchitecture = {
  clientIntent: {
    businessEssence: 'fintech trust',
    abstractionLevel: 'stylized',
    industryDomain: 'fintech',
    desiredMotifs: ['grid'],
    forbiddenMotifs: [],
    personality: ['precise'],
    visualTone: ['technical'],
    explicitRequests: [],
    confidence: 0.82,
    source: 'rules',
  },
  designStrategy: {
    markArchitecture: 'wordmark lockup',
    constructionSystem: 'modular grid circles',
    typographyLogic: 'constructed geometric sans',
    colorSystem: 'monochrome',
    symbolLogic: 'letterform as mark',
    industryDirection: 'trust and precision',
    suggestFragments: [],
    avoidFragments: [],
    reasoning: 'test strategy',
    confidence: 0.82,
  },
  agentContributions: [],
  interviewQuestions: [],
  visualReferences: [],
};

describe('creative strategy', () => {
  it('builds three distinct creative territories', () => {
    const request: BrainGenerateRequest = {
      industry: 'fintech',
      companyName: 'NovaPay',
      markType: 'wordmark',
    };

    const territories = buildCreativeTerritories(architecture, request);
    expect(territories).toHaveLength(3);
    expect(new Set(territories.map((t) => t.id)).size).toBe(3);
    expect(territories[0]?.confidence).toBeGreaterThanOrEqual(territories[1]?.confidence ?? 0);
  });

  it('prefers typography territory for wordmark briefs', () => {
    const request: BrainGenerateRequest = {
      industry: 'fintech',
      markType: 'wordmark',
      briefContext: { geometry: 'grid-based modular system' },
    };

    const territories = buildCreativeTerritories(architecture, request);
    const selected = selectCreativeTerritory(territories, request);
    expect(['territory-typography', 'territory-primary']).toContain(selected.id);
  });

  it('prefers construction territory when brief emphasizes grid geometry', () => {
    const request: BrainGenerateRequest = {
      industry: 'fintech',
      markType: 'combination',
      briefContext: { geometry: 'strict modular grid construction' },
    };

    const territories = buildCreativeTerritories(architecture, request);
    const selected = selectCreativeTerritory(territories, request);
    expect(selected.id).toBe('territory-construction');
  });

  it('honors preferredTerritoryId over auto rules', () => {
    const request: BrainGenerateRequest = {
      industry: 'fintech',
      markType: 'wordmark',
      preferredTerritoryId: 'territory-construction',
    };

    const territories = buildCreativeTerritories(architecture, request);
    const selected = selectCreativeTerritory(territories, request);
    expect(selected.id).toBe('territory-construction');
  });
});
