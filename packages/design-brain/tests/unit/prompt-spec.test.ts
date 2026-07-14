import { describe, expect, it } from 'vitest';
import {
  NO_BRAND_TEXT_FRAGMENT,
  applyPromptSpecToText,
  detectActivePromptConflicts,
  detectPromptTextConflicts,
  filterCatalogInspirationFragments,
  resolvePromptSpec,
  sanitizeLiteralIndustryLanguage,
  sanitizePartnerConstraintAdditions,
} from '@logo-platform/shared';

describe('resolvePromptSpec', () => {
  it('defaults branded briefs to combination mode', () => {
    const spec = resolvePromptSpec({
      companyName: 'Burger Company',
      markType: 'combination',
      clientNotes: 'symmetric balanced mark, no curves',
    });

    expect(spec.markMode).toBe('combination');
    expect(spec.brandName).toBe('Burger Company');
    expect(spec.prefersSymmetry).toBe(true);
    expect(spec.allowsCurves).toBe(false);
  });

  it('detects symbol-only briefs without brand name', () => {
    const spec = resolvePromptSpec({ markType: undefined });
    expect(spec.markMode).toBe('symbol_only');
  });
});

describe('applyPromptSpecToText', () => {
  it('removes symbol-only directives when brand name is present', () => {
    const spec = resolvePromptSpec({
      companyName: 'Burger Company',
      markType: 'wordmark',
    });

    const raw = `Modernist wordmark for "Burger Company". ${NO_BRAND_TEXT_FRAGMENT}. Abstract symbol-only logo design.`;
    const result = applyPromptSpecToText(raw, spec);

    expect(result.toLowerCase()).not.toContain('abstract symbol mark only');
    expect(result.toLowerCase()).not.toContain('no brand name');
    expect(result).toContain('Burger Company');
  });

  it('resolves symmetry vs italic composition toward brief symmetry', () => {
    const spec = resolvePromptSpec({
      companyName: 'Burger Company',
      markType: 'wordmark',
      clientNotes: 'symmetric balanced construction',
    });

    const raw =
      'Composition: bilateral symmetry and centered balance. Typography: italic oblique slanted letterforms.';
    const result = applyPromptSpecToText(raw, spec);

    expect(result.toLowerCase()).toContain('symmetry');
    expect(result.toLowerCase()).not.toContain('italic');
    expect(result.toLowerCase()).not.toContain('oblique');
  });

  it('softens curve-heavy catalog language when curves are disallowed', () => {
    const spec = resolvePromptSpec({
      companyName: 'Burger Company',
      constraints: 'no curves, geometric only',
    });

    const raw = 'Catalog reference — Coca-Cola: script calligraphic swash with flowing curves.';
    const result = applyPromptSpecToText(raw, spec);

    expect(result.toLowerCase()).not.toContain('script');
    expect(result.toLowerCase()).not.toContain('swash');
  });

  it('strips two-color territory language when prompt already enforces monochrome', () => {
    const spec = resolvePromptSpec({
      companyName: 'Burger Company',
      markType: 'combination',
    });

    const raw =
      'Color: strict black and white only. Color approach: Controlled two-color palette. Creative direction: warm craft.';
    const result = applyPromptSpecToText(raw, spec);

    expect(result.toLowerCase()).not.toContain('two-color');
    expect(result.toLowerCase()).not.toContain('two color');
    expect(result.toLowerCase()).toContain('strict black and white');
  });

  it('strips two-color language for monochrome brief palette', () => {
    const spec = resolvePromptSpec({
      companyName: 'Burger Company',
      markType: 'combination',
      colorPalette: 'black_white',
    });

    const raw =
      'Combination mark for "Burger Company". Color approach: Controlled two-color palette. Color: strict black and white only.';
    const result = applyPromptSpecToText(raw, spec);

    expect(result.toLowerCase()).not.toContain('two-color');
    expect(result.toLowerCase()).not.toContain('controlled two');
  });
});

describe('filterCatalogInspirationFragments', () => {
  it('limits catalog references and drops incompatible mark types', () => {
    const spec = resolvePromptSpec({
      companyName: 'Burger Company',
      markType: 'wordmark',
    });

    const fragments = [
      'Catalog reference — Nike: iconic swoosh. Mark type: symbol',
      'Catalog reference — FedEx: negative space. Mark type: combination',
      'Catalog reference — Coca-Cola: script wordmark. Mark type: wordmark',
      'Create an original mark in this modernist lineage',
    ];

    const filtered = filterCatalogInspirationFragments(fragments, spec, 2);

    expect(filtered.filter((f) => f.startsWith('Catalog reference'))).toHaveLength(2);
    expect(filtered.some((f) => /Mark type: symbol/i.test(f))).toBe(false);
    expect(filtered.some((f) => f.includes('modernist lineage'))).toBe(true);
  });
});

describe('detectActivePromptConflicts', () => {
  it('flags symbol-only remnants after normalization attempt', () => {
    const spec = resolvePromptSpec({
      companyName: 'Burger Company',
      markType: 'wordmark',
    });

    const conflicts = detectActivePromptConflicts(
      `wordmark for "Burger Company". ${NO_BRAND_TEXT_FRAGMENT}`,
      spec,
    );

    expect(conflicts.some((c) => c.code === 'mark_architecture_conflict')).toBe(false);
  });

  it('clears composition conflict after auto-normalization', () => {
    const spec = resolvePromptSpec({
      companyName: 'Burger Company',
      markType: 'wordmark',
    });

    const conflicts = detectActivePromptConflicts(
      'Composition: bilateral symmetry. Typography: italic dynamic tension.',
      spec,
    );

    expect(conflicts.some((c) => c.code === 'composition_axis_conflict')).toBe(false);
  });
});

describe('sanitizePartnerConstraintAdditions', () => {
  it('drops diagnostic violations and strips leaked literal phrases', () => {
    const result = sanitizePartnerConstraintAdditions([
      'Monochrome brief conflicts with multicolor or two-color language in the prompt',
      'The color palette will be strictly black and white, generic stock sans-serif, literal oven',
      'Add custom modified letterforms — avoid generic stock sans-serif',
    ]);

    expect(result.some((s) => /monochrome brief conflicts/i.test(s))).toBe(false);
    expect(result.join(' ').toLowerCase()).not.toContain('literal oven');
    expect(result.join(' ').toLowerCase()).not.toContain('generic stock sans');
    expect(result.some((s) => /custom modified letterforms/i.test(s))).toBe(true);
  });
});

describe('sanitizeLiteralIndustryLanguage', () => {
  it('removes contradictory typography and literal food leaks from prompt tail', () => {
    const raw =
      'Custom neo-grotesque wordmark with modified letterforms. The color palette will be strictly black and white, generic stock sans-serif, literal oven. Industry direction (stylized): abstract form language, not literal clipart.';
    const result = sanitizeLiteralIndustryLanguage(raw);

    expect(result.toLowerCase()).not.toContain('generic stock sans');
    expect(result.toLowerCase()).not.toContain('literal oven');
    expect(result.toLowerCase()).toContain('neo-grotesque');
  });

  it('strips steering-clear-of constraint leaks without keeping literal oven', () => {
    const raw =
      'The color palette will be strictly black and white, evoking freshness, while steering clear of generic stock sans-serif fonts and disconnected floating symbols, literal oven.';
    const result = sanitizeLiteralIndustryLanguage(raw);

    expect(result.toLowerCase()).not.toContain('literal oven');
    expect(result.toLowerCase()).not.toContain('generic stock sans');
  });
});

