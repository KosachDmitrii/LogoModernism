import { describe, expect, it } from 'vitest';
import { compileBrief, extractReferenceProfile } from '@logo-platform/brief-compiler';
import { scoreCompiledPrompt } from '../../src/reasoning/compiler-scoring';

const baseRequest = {
  industry: 'Food & Beverage',
  companyName: 'Burger Company',
  markType: 'combination' as const,
  typographyStyle: 'standard' as const,
  minimalismLevel: 9,
  preferredEra: 'international_style',
  variationCount: 1,
  briefContext: {
    colorPalette: 'black_white' as const,
    geometry: 'circle, square',
    construction: 'grid-based',
    composition: 'symmetry',
    preferredShapes: 'circle, square',
  },
};

describe('Brief Compiler', () => {
  it('compiles deterministic B&W combination prompt', () => {
    const result = compileBrief(baseRequest);
    expect(result.validation.passed).toBe(true);
    const text = result.prompts[0]!.positive.toLowerCase();
    expect(text).toContain('burger company');
    expect(text).toContain('combination mark');
    expect(text).toContain('color: strict black and white only');
    expect(text).not.toContain('the logo employs');
    expect(text).not.toMatch(/\(6\/10\)/);
  });

  it('does not force monochrome when palette is custom yellow', () => {
    const result = compileBrief({
      ...baseRequest,
      briefContext: {
        ...baseRequest.briefContext,
        colorPalette: 'custom',
        colorSelections: ['#F5C518'],
      },
    });
    expect(result.validation.passed).toBe(true);
    const text = result.prompts[0]!.positive.toLowerCase();
    expect(text).not.toContain('strict black and white only');
    expect(text).toContain('#f5c518');
  });

  it('reference overrides client mark type (IKEA wordmark ref)', () => {
    const result = compileBrief({
      ...baseRequest,
      companyName: 'Corso',
      industry: 'E-commerce',
      markType: 'combination',
      catalogReferenceIds: ['ref-ikea'],
      briefContext: {
        ...baseRequest.briefContext,
        colorPalette: 'black_white',
      },
    });
    expect(result.validation.passed).toBe(true);
    const text = result.prompts[0]!.positive.toLowerCase();
    expect(text).toContain('corso');
    expect(text).toContain('wordmark');
    expect(text).not.toContain('ikea');
    expect(text).not.toContain('standalone symbol');
    expect((text.match(/\bera:/g) ?? []).length).toBe(1);
  });

  it('symbol reference yields combination for branded brief (brand lock)', () => {
    const result = compileBrief({
      ...baseRequest,
      companyName: 'Corso',
      industry: 'E-commerce',
      markType: 'combination',
      catalogReferenceIds: ['ref-lufthansa'],
      briefContext: {
        ...baseRequest.briefContext,
        colorPalette: 'black_white',
      },
    });
    expect(result.validation.passed).toBe(true);
    const text = result.prompts[0]!.positive.toLowerCase();
    expect(text).toContain('combination mark');
    expect(result.resolved.markType).toBe('combination');
  });

  it('strips Avito-class defects (orange, by E., balance jam)', () => {
    const result = compileBrief({
      industry: 'E-commerce',
      companyName: 'Avito',
      markType: 'combination',
      variationCount: 1,
      catalogReferenceIds: ['ref-swissair'],
      briefContext: {
        colorPalette: 'black_white',
        geometry: 'triangle',
        preferredShapes: 'triangle',
        construction: 'utilizing a baseline grid',
        composition: 'employing negative space',
        constraints: 'no stock clipart',
      },
    });
    expect(result.validation.passed).toBe(true);
    const text = result.prompts[0]!.positive.toLowerCase();
    expect(text).not.toContain('orange');
    expect(text).not.toContain('by e.');
    expect(text).not.toContain('balanced visual weight');
    expect(text).not.toContain('utilizing');
    expect(text).toContain('color: strict black and white only');
    expect(text).toContain('avito');
  });

  it('plans 3 variants with different territory axes', () => {
    const result = compileBrief({ ...baseRequest, variationCount: 3 });
    expect(result.prompts).toHaveLength(3);
    const axes = new Set(result.prompts.map((p) => p.schema.variantAxis));
    expect(axes.size).toBeGreaterThan(1);
  });

  it('emits negative prompt channel', () => {
    const result = compileBrief(baseRequest);
    expect(result.prompts[0]!.negative).toContain('gradients');
    expect(result.prompts[0]!.negative).toContain('stock clipart');
  });

  it('records reference overrides in resolved brief', () => {
    const result = compileBrief({
      ...baseRequest,
      catalogReferenceIds: ['ref-lufthansa'],
      briefContext: {
        ...baseRequest.briefContext,
        construction: 'radial grid',
      },
    });
    expect(result.resolved.overrides.some((o) => o.field === 'construction')).toBe(true);
  });

  it('uses angular industry motifs for square-only F&B briefs', () => {
    const result = compileBrief({
      industry: 'Food & Beverage',
      companyName: 'Muchachos',
      markType: 'combination',
      typographyStyle: 'standard',
      minimalismLevel: 9,
      variationCount: 1,
      briefContext: {
        colorPalette: 'black_white',
        geometry: 'square',
        preferredShapes: 'square',
        construction: 'baseline grid',
        composition: 'symmetry',
      },
    });
    const text = result.prompts[0]!.positive.toLowerCase();
    expect(text).not.toContain('round focal arc');
    expect(text).not.toContain('communal circular weave');
    expect(text).not.toContain('quarter-circle');
    expect(text).toMatch(/angular|modular square|corner-cut/);
  });

  it('mentions brand name once when brand lock is present', () => {
    const result = compileBrief({
      ...baseRequest,
      companyName: 'Muchachos',
      variationCount: 1,
      briefContext: {
        ...baseRequest.briefContext,
        geometry: 'square',
        preferredShapes: 'square',
      },
    });
    const text = result.prompts[0]!.positive;
    expect((text.match(/muchachos/gi) ?? []).length).toBe(1);
    expect(text).not.toContain("Combination mark for 'Muchachos'");
    expect(text).toContain('Combination mark.');
  });

  it('emits one creative direction section instead of art direction + territory', () => {
    const result = compileBrief(baseRequest);
    const text = result.prompts[0]!.positive.toLowerCase();
    expect(text).toContain('creative direction:');
    expect(text).not.toContain('art direction:');
    expect(text).not.toContain('territory emphasis:');
  });

  it('prefers structural catalog cues over generic marketing significance', () => {
    const profile = extractReferenceProfile({
      id: 'ref-test-cheese',
      name: 'Käse Tufenk',
      designer: 'Unknown',
      year: 1971,
      chapter: 'geometric',
      section: 'angular',
      industry: 'food',
      era: 'swiss',
      markType: 'symbol',
      geometry: ['angular'],
      shape: ['angular'],
      construction: ['grid-based'],
      composition: ['symmetry'],
      significance: 'The logo reflects the artisanal quality of the food products.',
    });

    expect(profile.structureCue.toLowerCase()).toContain('angular');
    expect(profile.structureCue.toLowerCase()).toContain('grid');
    expect(profile.structureCue.toLowerCase()).not.toContain('reflects the artisanal');
  });

  it('sanitizes typography lab leaked into composition field', () => {
    const pollutedComposition =
      'combination mark, typographic lockup with optional supporting mark, Primary wordmark: Medium to Bold, tracking -20, Tagline: Regular, tracking +50, Monogram: Bold to Black, tracking -30, Align cap height to grid module, Maintain consistent x-height across weights, Negative Space Figure-Ground';

    const result = compileBrief({
      industry: 'Food & Beverage',
      companyName: 'Muchachos',
      markType: 'combination',
      typographyStyle: 'standard',
      minimalismLevel: 9,
      variationCount: 1,
      briefContext: {
        colorPalette: 'two_color',
        colorSelections: ['#000000', '#E63946'],
        geometry: 'circle, square, triangle',
        preferredShapes: 'circle, square, triangle',
        construction: 'baseline grid',
        composition: pollutedComposition,
        personality: 'playful',
        constraints: 'no literal oven',
      },
    });

    const text = result.prompts[0]!.positive.toLowerCase();
    expect(text).not.toContain('tracking -20');
    expect(text).not.toContain('medium to bold');
    expect(text).not.toContain('tagline: regular');
    expect(text).toContain('color: two-color palette (#000000 and #e63946)');
    expect(text).toMatch(/composition:.*lockup|symmetry|negative space/);
  });

  it('renders limited palette with selected colors in prompt', () => {
    const result = compileBrief({
      industry: 'Food & Beverage',
      companyName: 'Muchachos',
      markType: 'combination',
      typographyStyle: 'standard',
      minimalismLevel: 9,
      variationCount: 1,
      briefContext: {
        colorPalette: 'limited',
        colorSelections: ['#000000', '#F5C518'],
        geometry: 'circle',
        preferredShapes: 'circle',
        construction: 'baseline grid',
        composition: 'symmetry',
      },
    });

    expect(result.prompts[0]!.positive.toLowerCase()).toContain(
      'color: limited palette (#000000, #f5c518)',
    );
  });

  it('scores compiler prompts with structured sections', () => {
    const result = compileBrief({
      industry: 'Food & Beverage',
      companyName: 'Muchachos',
      markType: 'combination',
      typographyStyle: 'standard',
      minimalismLevel: 9,
      variationCount: 1,
      briefContext: {
        colorPalette: 'two_color',
        colorSelections: ['#000000', '#E63946'],
        geometry: 'square',
        preferredShapes: 'square',
        construction: 'baseline grid',
        composition: 'symmetry',
      },
    });

    const scores = scoreCompiledPrompt(
      result.prompts[0]!.positive,
      result,
      {
        industry: 'Food & Beverage',
        companyName: 'Muchachos',
        markType: 'combination',
        typographyStyle: 'standard',
        minimalismLevel: 9,
      },
    );

    expect(scores.modernismScore).toBeGreaterThanOrEqual(6.5);
    expect(scores.promptQuality).toBeGreaterThanOrEqual(6);
    expect(result.prompts[0]!.positive).toContain('two-color palette (#000000 and #E63946)');
  });

  it('builds rebus wordmark prompt for short animal brand names', () => {
    const result = compileBrief({
      industry: 'Pet Services',
      companyName: 'cat',
      markType: 'wordmark',
      typographyStyle: 'rebus',
      minimalismLevel: 9,
      variationCount: 1,
      preferredTerritoryId: 'territory-typography',
      briefContext: {
        colorPalette: 'black_white',
        composition: 'negative space figure-ground',
        construction: 'modular grid',
        geometry: 'circle',
        preferredShapes: 'circle',
      },
    });

    const text = result.prompts[0]!.positive.toLowerCase();
    expect(text).toContain('wordmark rebus');
    expect(text).toContain('typographic integration');
    expect(text).toContain("letter 'c'");
    expect(text).toContain('cat silhouette');
    expect(text).toContain('negative space');
    expect(text).not.toContain('combination mark');
  });

  it('forces rebus mode from typographyStyle rebus', () => {
    const result = compileBrief({
      industry: 'Pet Services',
      companyName: 'Cat',
      typographyStyle: 'rebus',
      variationCount: 1,
      preferredTerritoryId: 'territory-typography',
      briefContext: {
        colorPalette: 'black_white',
      },
    });

    const text = result.prompts[0]!.positive.toLowerCase();
    expect(text).toContain('wordmark rebus');
    expect(result.resolved.markType).toBe('wordmark');
    expect(result.resolved.typographyStyle).toBe('rebus');
    expect(result.resolved.rebusWordmark).toBe(true);
  });

  it('forces rebus mode from explicit rebusWordmark flag', () => {
    const result = compileBrief({
      industry: 'Pet Services',
      companyName: 'Cat',
      rebusWordmark: true,
      variationCount: 1,
      preferredTerritoryId: 'territory-typography',
      briefContext: {
        colorPalette: 'black_white',
      },
    });

    const text = result.prompts[0]!.positive.toLowerCase();
    expect(text).toContain('wordmark rebus');
    expect(text).toContain('typography-led rebus wordmark');
    expect(text).toContain('typographic integration');
    expect(text).toContain("letter 'c'");
    expect(result.resolved.markType).toBe('wordmark');
    expect(result.resolved.typographyStyle).toBe('rebus');
    expect(result.resolved.composition).toContain('negative space');
  });

  it('parses explicit typographic trick from client notes when rebus is enabled', () => {
    const result = compileBrief({
      industry: 'Creative Agency',
      companyName: 'fox',
      markType: 'wordmark',
      typographyStyle: 'rebus',
      variationCount: 1,
      briefContext: {
        colorPalette: 'black_white',
        clientNotes: 'letter f contains fox silhouette via negative space',
        composition: 'symmetry',
      },
    });

    const text = result.prompts[0]!.positive.toLowerCase();
    expect(text).toContain('typographic integration');
    expect(text).toContain("letter 'f'");
    expect(text).toContain('fox silhouette');
    expect(text).toContain('separate clipart icon beside text');
  });

  it('respects lettermark and monogram ligature without auto rebus for animal names', () => {
    const result = compileBrief({
      industry: 'Food & Beverage',
      companyName: 'Cow',
      markType: 'lettermark',
      typographyStyle: 'monogram_ligature',
      minimalismLevel: 9,
      variationCount: 1,
      preferredTerritoryId: 'territory-typography',
      briefContext: {
        colorPalette: 'black_white',
        composition: 'negative space figure-ground',
        construction: 'baseline grid for optical balance',
        geometry: 'modular geometric forms',
      },
    });

    const text = result.prompts[0]!.positive.toLowerCase();
    expect(text).toContain('lettermark');
    expect(text).toContain('monogram ligature');
    expect(text).not.toContain('wordmark rebus');
    expect(text).not.toContain('typographic integration');
    expect(text).not.toContain('cow silhouette');
    expect(result.resolved.markType).toBe('lettermark');
    expect(result.resolved.typographyStyle).toBe('monogram_ligature');
    expect(result.resolved.rebusWordmark).toBe(false);
  });

  it('merges knowledge enrichment into prompt sections', () => {
    const result = compileBrief({
      ...baseRequest,
      analysisPrincipleIds: ['geo-circle'],
      compileKnowledge: {
        retrievalCue: 'Prior project cues: tight grid wordmark',
        tasteAvoidPatterns: ['gradients', 'photorealism'],
        principleFragments: ['built from circle construction'],
        projectWorkedCues: ['strict brief adherence'],
        projectAvoidCues: ['off-brief decorative effects'],
      },
    });

    const text = result.prompts[0]!.positive.toLowerCase();
    expect(text).not.toContain('prior direction');
    expect(text).not.toContain('tight grid wordmark');
    expect(text).toContain('design principles');
    expect(text).toContain('built from circle construction');
    expect(text).toContain('gradients');
    expect(text).toContain('off-brief decorative effects');
  });

  it('allows shadows and 3D rendering when enabled in brief', () => {
    const result = compileBrief({
      ...baseRequest,
      briefContext: {
        ...baseRequest.briefContext,
        allowShadows: true,
        allowPhotoreal: true,
      },
      compileKnowledge: {
        tasteAvoidPatterns: ['shadows and depth effects', '3d effects', 'gradients'],
        principleFragments: [],
        projectWorkedCues: [],
        projectAvoidCues: [],
      },
    });

    const positive = result.prompts[0]!.positive.toLowerCase();
    const negative = result.prompts[0]!.negative.toLowerCase();

    expect(positive).toContain('include subtle controlled shadows and controlled 3d dimensional depth');
    expect(positive).not.toContain('no shadows no depth effects');
    expect(negative).not.toContain('3d render');
    expect(negative).not.toContain('shadows and depth effects');
    expect(negative).not.toContain('3d effects');
  });
});
