import { describe, expect, it } from 'vitest';
import type { CreativeTerritory } from '@logo-platform/shared';
import {
  buildDirectionReasoning,
  repairGluedProse,
  territoryForAxis,
} from '../../src/reasoning/prompt-explainability';
import { joinSentences } from '../../src/reasoning/prose';

const territories: CreativeTerritory[] = [
  {
    id: 'territory-primary',
    name: 'Primary',
    thesis: 'Balanced modernist lockup for fintech trust.',
    markArchitecture: 'Combination mark',
    constructionFocus: 'modular grid',
    typographyFocus: 'geometric sans',
    colorApproach: 'black and white',
    confidence: 0.8,
    tradeoffs: [],
  },
  {
    id: 'territory-construction',
    name: 'Construction-led',
    thesis: 'Grid-first construction as the hero system.',
    markArchitecture: 'Combination mark',
    constructionFocus: 'modular grid',
    typographyFocus: 'supportive sans',
    colorApproach: 'black and white',
    confidence: 0.75,
    tradeoffs: [],
  },
  {
    id: 'territory-typography',
    name: 'Typography-led',
    thesis: 'Letterforms carry recognition.',
    markArchitecture: 'Wordmark',
    constructionFocus: 'baseline grid',
    typographyFocus: 'constructed sans',
    colorApproach: 'black and white',
    confidence: 0.7,
    tradeoffs: [],
  },
];

describe('prompt-explainability', () => {
  it('maps variant axes to territories', () => {
    expect(territoryForAxis(territories, 'balanced')?.id).toBe('territory-primary');
    expect(territoryForAxis(territories, 'construction_led')?.id).toBe('territory-construction');
    expect(territoryForAxis(territories, 'typography_led')?.id).toBe('territory-typography');
  });

  it('builds non-stub direction reasoning', () => {
    const reasoning = buildDirectionReasoning({
      territory: territories[1],
      architecture: {
        clientIntent: {
          businessEssence: 'payments',
          industryDomain: 'fintech',
          desiredMotifs: ['shield'],
          forbiddenMotifs: ['gradients'],
          abstractionLevel: 'abstract',
          personality: ['trust'],
          visualTone: ['Swiss'],
          explicitRequests: [],
          confidence: 0.8,
          source: 'test',
        },
        designStrategy: {
          markArchitecture: 'Combination',
          symbolLogic: 'Symbol explores shield at abstract abstraction',
          typographyLogic: 'Geometric sans',
          colorSystem: 'mono',
          constructionSystem: 'modular grid',
          suggestFragments: [],
          avoidFragments: [],
          industryDirection: 'fintech',
          reasoning: 'Trust through clarity.',
          confidence: 0.8,
        },
        agentContributions: [],
        interviewQuestions: [],
        visualReferences: [],
      },
      compile: {
        resolved: {
          markType: 'combination',
          typographyStyle: 'standard',
          construction: 'modular grid',
          composition: 'centered',
          era: 'swiss',
          shapes: ['circle'],
          colorPalette: 'black_white',
          colorSelections: [],
          allowShadows: false,
          allowPhotoreal: false,
          forbiddenMotifs: [],
          references: [],
          blocks: [],
          overrides: [],
        },
        readiness: { score: 80, missing: [], warnings: [] },
        validation: { passed: true, violations: [] },
        prompts: [],
        briefHash: 'x',
      } as never,
      axis: 'construction_led',
      principles: [{ name: 'Swiss Grid' }, { name: 'Optical Balance' }],
    });

    expect(reasoning).not.toContain('Brief compiler v1');
    expect(reasoning.toLowerCase()).toContain('grid');
    expect(reasoning).toContain('Swiss Grid');
    expect(reasoning).not.toMatch(/silhouette Lead/i);
  });

  it('repairs glued Brain prose and joins sentences', () => {
    expect(
      repairGluedProse(
        'Industry form language for Fintech (stylized): primary cue — shield grid silhouette Lead with Combination mark',
      ),
    ).toBe(
      'Industry form language for Fintech (stylized): primary cue — shield grid silhouette. Lead with Combination mark.',
    );
    expect(joinSentences('First clause', 'Second clause')).toBe('First clause. Second clause.');
  });
});
