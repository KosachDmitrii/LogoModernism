import { describe, expect, it } from 'vitest';
import { scorePrompt } from '@logo-platform/prompt-engine';
import type { LogoDNA } from '@logo-platform/shared';

const leanDna: LogoDNA = {
  geometry: ['circle', 'square'],
  construction: ['baseline grid'],
  balance: ['optically balanced'],
  complexity: 'minimal',
  era: 'swiss',
  typography: ['neo-grotesque'],
  recognition: 8,
  minimalism: 9,
  visualWeight: ['medium'],
  harmony: ['geometric'],
};

const leanCompilerPrompt =
  'Minimal geometric logo design. Brand name must read exactly \'Redix\' letter-for-letter. ' +
  'Wordmark. Geometry vocabulary: constructed from circle and square forms. ' +
  'Construction: baseline grid for modular alignment. Composition: symmetry. ' +
  'Typography: Custom neo-grotesque wordmark with one modified distinctive glyph. ' +
  'Balance: optically balanced, balance through reduction. ' +
  'Complexity: minimal complexity, ultra minimal elements. ' +
  'Era: International Typographic Style. Color: strict black and white only. ' +
  'Rendering: flat vector illustration, scalable silhouette readable at small sizes, no shadows no depth effects, no gradients. ' +
  'Creative direction: Typography-led — custom letterforms as primary anchor. ' +
  'Avoid: generic circular bracket templates, disconnected floating symbols, stock Helvetica wordmarks, literal clipart.';

const bloatedCompilerPrompt =
  'Minimal geometric logo design. Brand name must read exactly \'Redix\' letter-for-letter. ' +
  'Combination mark. Geometry vocabulary: crafted from modular geometric forms. ' +
  'Construction: baseline grid for optical balance. Composition: symmetry. ' +
  'Typography: Custom neo-grotesque wordmark with one modified distinctive glyph. ' +
  'Industry direction for Technology (stylized): pixel cluster mark, data stream curves, chip grid silhouette. ' +
  'Tone: innovative, clean, systematic. Balance: optically balanced, balance through reduction. ' +
  'Complexity: minimal complexity, radically simplified. Era: International Typographic Style. ' +
  'Color: strict black and white only. Rendering: flat vector illustration, scalable silhouette readable at small sizes, no shadows no depth effects, no gradients. ' +
  'Creative direction: Balanced combination lockup — symbol and wordmark share one geometric system with matching stroke weight. ' +
  'Prior direction: strict brief adherence; controlled palette discipline; custom letterform discipline. ' +
  'Design principles: Swiss International typography, custom wordmark typography, geometric sans-serif, built from circle construction, clever negative space. ' +
  'Avoid: generic circular bracket templates, disconnected floating symbols, stock Helvetica wordmarks, literal clipart, gradients, shadows and depth effects, 3d effects.';

const industryOnlyCompilerPrompt =
  'Minimal geometric logo design. Brand name must read exactly \'Redix\' letter-for-letter. ' +
  'Combination mark. Geometry vocabulary: crafted from modular geometric forms. ' +
  'Construction: baseline grid for optical balance. Composition: symmetry. ' +
  'Typography: Custom neo-grotesque wordmark with one modified distinctive glyph. ' +
  'Industry direction for Technology (stylized): pixel cluster mark, data stream curves, chip grid silhouette. ' +
  'Tone: innovative, clean, systematic. Complexity: minimal complexity, radically simplified. ' +
  'Era: International Typographic Style. Color: strict black and white only. ' +
  'Rendering: flat vector illustration, scalable silhouette readable at small sizes, no shadows no depth effects, no gradients. ' +
  'Creative direction: Balanced combination lockup — symbol and wordmark share one geometric system with matching stroke weight. ' +
  'Avoid: generic circular bracket templates, disconnected floating symbols, stock Helvetica wordmarks, literal clipart.';

describe('Compiler prompt scorer calibration', () => {
  it('scores lean compiler prompts higher than bloated ones', () => {
    const lean = scorePrompt(leanCompilerPrompt, [], leanDna);
    const bloated = scorePrompt(bloatedCompilerPrompt, [], leanDna);

    expect(lean.modernismScore).toBeGreaterThan(bloated.modernismScore);
    expect(lean.minimalismScore).toBeGreaterThan(bloated.minimalismScore);
    expect(lean.modernismScore).toBeGreaterThanOrEqual(7);
    expect(lean.minimalismScore).toBeGreaterThanOrEqual(7);
    expect(bloated.modernismScore).toBeLessThanOrEqual(8);
    expect(bloated.minimalismScore).toBeLessThanOrEqual(8);
    expect(bloated.modernismScore).toBeGreaterThanOrEqual(5);
    expect(bloated.minimalismScore).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps industry-led prompts in a fair mid-range, not near zero', () => {
    const industry = scorePrompt(industryOnlyCompilerPrompt, [], leanDna);
    expect(industry.modernismScore).toBeGreaterThanOrEqual(5.5);
    expect(industry.modernismScore).toBeLessThan(9);
    expect(industry.minimalismScore).toBeGreaterThanOrEqual(4.5);
  });

  it('does not auto-assign 10/10 to bloated compiler prompts', () => {
    const bloated = scorePrompt(bloatedCompilerPrompt, [], leanDna);
    expect(bloated.modernismScore).toBeLessThan(10);
    expect(bloated.minimalismScore).toBeLessThan(10);
  });

  it('penalizes wordmark vs combination lockup contradiction', () => {
    const contradictory = leanCompilerPrompt.replace(
      'Creative direction: Typography-led — custom letterforms as primary anchor.',
      'Creative direction: Balanced combination lockup — symbol and wordmark share one geometric system.',
    );
    const clean = scorePrompt(leanCompilerPrompt, [], leanDna);
    const conflict = scorePrompt(contradictory, [], leanDna);
    expect(conflict.modernismScore).toBeLessThan(clean.modernismScore);
    expect(conflict.minimalismScore).toBeLessThanOrEqual(clean.minimalismScore);
  });
});
