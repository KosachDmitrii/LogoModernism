import { describe, expect, it } from 'vitest';
import { buildBasePromptFromRules } from '../../src/reasoning/prompt-enrichment';
import { sampleGenerateRequest } from '../helpers/fixtures';

describe('prompt-enrichment (pure)', () => {
  it('builds a non-empty rules-engine base prompt', () => {
    const base = buildBasePromptFromRules(sampleGenerateRequest());
    expect(base.text.length).toBeGreaterThan(80);
    expect(base.selectedPrinciples.length).toBeGreaterThan(0);
    expect(base.industry).toBe('fintech');
  });

  it('respects symbol-only requests without brand name', () => {
    const base = buildBasePromptFromRules(
      sampleGenerateRequest({ companyName: undefined, markType: 'combination' }),
    );
    expect(base.text.toLowerCase()).toMatch(/symbol|abstract|no text|no letters/);
  });

  it('includes brand name spelling when company is provided', () => {
    const base = buildBasePromptFromRules(sampleGenerateRequest({ companyName: 'NovaPay' }));
    expect(base.text).toMatch(/NovaPay/i);
  });
});
