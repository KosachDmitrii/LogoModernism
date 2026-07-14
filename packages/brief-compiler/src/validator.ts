import { HIGH_RISK_TRADEMARK_NAMES } from '@logo-platform/knowledge-base';
import type { CompileValidation, CompiledPrompt, ResolvedBrief } from './types';
import { isMonochromePalette } from './normalizers';

const HUE_TOKENS =
  /\b(?:orange|teal|cyan|magenta|yellow|gold|amber|green|blue|red|purple|violet|pink|brown|coral)\b/i;

export function validateCompiled(
  brief: ResolvedBrief,
  prompts: CompiledPrompt[],
): CompileValidation {
  const violations: string[] = [];
  const warnings: string[] = [...brief.blocks.map((b) => b.summary)];

  if (brief.blocks.some((b) => b.code === 'low_reference_confidence')) {
    violations.push('Reference confidence too low for reliable compile');
  }

  for (const prompt of prompts) {
    const lower = prompt.positive.toLowerCase();

    if (brief.companyName && !lower.includes(brief.companyName.toLowerCase())) {
      violations.push(`Missing brand lock for ${brief.companyName}`);
    }

    if (/\bmark type:\s*standalone symbol\b/i.test(prompt.positive)) {
      violations.push('Standalone symbol conflicts with branded brief');
    }

    const eraCount = (prompt.positive.match(/\bEra:/gi) ?? []).length;
    if (eraCount > 1) violations.push('Duplicate Era sections');

    const colorCount = (prompt.positive.match(/\bColor:/gi) ?? []).length;
    if (colorCount > 1) violations.push('Duplicate Color sections');

    if (/\bColor\.\s/i.test(prompt.positive) || /\bColor\.$/.test(prompt.positive)) {
      violations.push('Broken Color section fragment');
    }

    if (isMonochromePalette(brief.colorPalette) && HUE_TOKENS.test(prompt.positive)) {
      violations.push('Stray hue token under monochrome palette');
    }

    if (HIGH_RISK_TRADEMARK_NAMES.test(prompt.positive)) {
      violations.push('Trademark name leaked into prompt');
    }

    if (/\bthe logo employs\b/i.test(prompt.positive)) {
      violations.push('Broken inspired-by grammar');
    }

    if (/\bby\s+[A-Z]\.(?=\s|,|\.|$)/.test(prompt.positive)) {
      violations.push('Empty designer attribution crumb');
    }

    if (/\(6\/10\)|general geometric foundation/i.test(prompt.positive)) {
      violations.push('Geometry intelligence score dump leaked');
    }

    const expectedMark = brief.markType;
    if (expectedMark === 'combination' && /\bwordmark only\b/i.test(lower)) {
      warnings.push('Prompt language skews wordmark-only for combination brief');
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
  };
}

export function computeReadiness(brief: ResolvedBrief): { score: number; missing: string[] } {
  const missing: string[] = [];
  if (!brief.industry?.trim()) missing.push('industry');
  if (!brief.markType) missing.push('markType');
  if (!brief.colorPalette) missing.push('colorPalette');
  if (brief.shapes.length === 0) missing.push('shapes');

  const total = 5;
  const score = Math.round(((total - missing.length) / total) * 100);
  return { score, missing };
}
