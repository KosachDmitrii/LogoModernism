import { describe, expect, it } from 'vitest';
import {
  buildIndustryDirection,
  resolveIndustryNode,
  selectIndustryMotifs,
} from '@logo-platform/shared';

describe('industry-graph', () => {
  it('resolves fintech to dedicated fintech node, not generic tech', () => {
    expect(resolveIndustryNode('Fintech')?.id).toBe('fintech');
    expect(resolveIndustryNode('payments')?.id).toBe('fintech');
    expect(resolveIndustryNode('SaaS')?.id).toBe('tech');
    expect(resolveIndustryNode('Investment banking')?.id).toBe('finance');
  });

  it('selects divergent motifs across creative axes', () => {
    const node = resolveIndustryNode('Fintech')!;
    const lines = ['balanced', 'construction_led', 'typography_led'].map((axis) =>
      selectIndustryMotifs(node, 'stylized', {
        seed: `fintech:${axis}`,
        count: 2,
      }).join('|'),
    );
    expect(new Set(lines).size).toBeGreaterThanOrEqual(2);
  });

  it('builds soft form-language lines without dumping the full motif bank', () => {
    const line = buildIndustryDirection('Fintech', 'stylized', [], [], {
      variantAxis: 'balanced',
      count: 2,
    });
    expect(line).toMatch(/Industry form language for Fintech/);
    expect(line).toMatch(/primary cue/);
    expect(line).toMatch(/not literal/);
    expect(line.toLowerCase()).not.toContain(
      'pixel cluster mark, data stream curves, chip grid',
    );
  });

  it('does not force pixel language for fintech across axes', () => {
    const lines = ['balanced', 'construction_led', 'typography_led'].map((axis) =>
      buildIndustryDirection('Fintech', 'stylized', [], [], { variantAxis: axis, count: 2 }),
    );
    const pixelHeavy = lines.filter((l) => /pixel cluster/i.test(l)).length;
    expect(pixelHeavy).toBeLessThanOrEqual(1);
  });

  it('honors explicit desired motif like pixel cluster', () => {
    const line = buildIndustryDirection(
      'Fintech',
      'stylized',
      ['pixel cluster mark'],
      [],
      { variantAxis: 'balanced', count: 2 },
    );
    expect(line.toLowerCase()).toContain('pixel cluster');
    expect(line).toMatch(/primary cue/i);
  });
});
