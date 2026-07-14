import { describe, expect, it } from 'vitest';
import { buildCatalogPromptContext } from '@logo-platform/knowledge-base';
import { resolveCatalogIntelligence } from '../../src/retrieval/catalog-intelligence';
import {
  buildCompileKnowledgeContext,
  principlesFromIds,
  projectMemoryFromExperiences,
} from '../../src/knowledge/build-compile-knowledge';

describe('Catalog intelligence', () => {
  it('does not auto-select references unless toggle is on', () => {
    const { request, intelligence } = resolveCatalogIntelligence({
      industry: 'Food & Beverage',
      markType: 'combination',
    });

    expect(request.catalogReferenceIds).toEqual([]);
    expect(intelligence.autoSelected).toBe(false);
  });

  it('auto-selects references when toggle is on and no manual refs', () => {
    const { request, intelligence } = resolveCatalogIntelligence({
      industry: 'Food & Beverage',
      markType: 'combination',
      autoCatalogReferences: true,
    });

    expect(request.catalogReferenceIds?.length).toBeGreaterThan(0);
    expect(intelligence.autoSelected).toBe(true);
  });

  it('keeps manual references when provided', () => {
    const { request, intelligence } = resolveCatalogIntelligence({
      industry: 'E-commerce',
      catalogReferenceIds: ['ref-ikea'],
      autoCatalogReferences: true,
    });

    expect(request.catalogReferenceIds).toEqual(['ref-ikea']);
    expect(intelligence.autoSelected).toBe(false);
  });
});

describe('Compile knowledge context', () => {
  it('filters emblem likeness principles for combination briefs', () => {
    const context = buildCatalogPromptContext(['ref-starbucks'], { briefMarkType: 'combination' });
    expect(context?.principleIds).toContain('geo-circle');
    expect(context?.principleIds).not.toContain('mark-emblem');
    expect(context?.principleIds).not.toContain('mark-heraldic');
    expect(context?.inspirationFragments[0]).toContain('structure');
    expect(context?.inspirationFragments[0]).not.toContain('Starbucks');
  });

  it('merges structure-only catalog principles into compile knowledge', () => {
    const { request } = resolveCatalogIntelligence({
      industry: 'Coffee Shop',
      markType: 'combination',
      catalogReferenceIds: ['ref-starbucks'],
    });
    const knowledge = buildCompileKnowledgeContext({
      tasteProfile: {
        preferredMarkTypes: ['combination'],
        preferredGeometry: ['circle'],
        avoidedPatterns: [],
        averageScore: 7,
        signalCount: 0,
        summary: 'test',
      },
      retrievedExperiences: [],
      projectMemory: [],
      analysisPrincipleIds: request.analysisPrincipleIds,
      markType: 'combination',
    });
    const fragments = knowledge?.principleFragments ?? [];
    expect(fragments.some((f) => /circle/i.test(f))).toBe(true);
    expect(fragments.some((f) => /emblem|heraldic|shield/i.test(f))).toBe(false);
    expect(principlesFromIds(request.analysisPrincipleIds, 'combination').some((f) => /emblem/i.test(f))).toBe(
      false,
    );
  });

  it('builds avoid and cue lines from taste and project memory', () => {
    const context = buildCompileKnowledgeContext({
      tasteProfile: {
        preferredMarkTypes: ['wordmark'],
        preferredGeometry: ['grid'],
        avoidedPatterns: ['gradients', 'shadows'],
        averageScore: 7,
        signalCount: 2,
        summary: 'test',
      },
      retrievedExperiences: [
        {
          id: '1',
          sourceType: 'FEEDBACK',
          content: 'Approved geometric wordmark',
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          similarity: 0.7,
        },
      ],
      projectMemory: [
        {
          id: '2',
          sourceType: 'FEEDBACK',
          content: 'Muchachos feedback',
          metadata: { workedTags: ['geometry'], missedTags: ['color'] },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      analysisPrincipleIds: ['geo-square'],
    });

    expect(context?.tasteAvoidPatterns).toEqual(['gradients', 'shadows and depth effects']);
    expect(context?.retrievalCue).toContain('Prior project cues');
    expect(context?.principleFragments).toContain('built from square construction');
    expect(projectMemoryFromExperiences([
      {
        id: '2',
        sourceType: 'FEEDBACK',
        content: 'Muchachos feedback',
        metadata: { workedTags: ['geometry'], missedTags: ['color'] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])).toEqual({
      worked: ['precise geometric construction'],
      avoid: ['off-palette color treatment'],
    });
  });

  it('filters noisy retrieval cues and humanizes taste avoid patterns', () => {
    const context = buildCompileKnowledgeContext({
      tasteProfile: {
        preferredMarkTypes: ['wordmark'],
        preferredGeometry: ['grid'],
        avoidedPatterns: ['brief_fit', 'scalability', 'gradient', 'shadows'],
        averageScore: 7,
        signalCount: 2,
        summary: 'test',
      },
      retrievedExperiences: [
        {
          id: '1',
          sourceType: 'FEEDBACK',
          content: 'Successful generation (score 7.1)',
          summary: 'Successful generation (score 7.1)',
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          similarity: 0.7,
        },
        {
          id: '2',
          sourceType: 'FEEDBACK',
          content: 'Approved geometric wordmark with strict grid',
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          similarity: 0.8,
        },
      ],
      projectMemory: [],
      analysisPrincipleIds: [],
    });

    expect(context?.retrievalCue).toContain('Approved geometric wordmark');
    expect(context?.retrievalCue).not.toContain('Successful generation');
    expect(context?.tasteAvoidPatterns).toEqual([
      'off-brief decorative effects',
      'low legibility at small sizes',
      'gradients',
      'shadows and depth effects',
    ]);
  });
});
