import type { DesignDecision } from '@logo-platform/shared';
import type { AbstractionLevel, DesignStrategy } from '@logo-platform/shared';
import { polishLogoPrompt } from '@logo-platform/shared';

const DEFAULT_MODERNIST_AVOID = [
  'gradients',
  'photorealism',
  'mockups',
  'busy backgrounds',
  'stock clipart',
  'emblem badge format',
];

export function solveConstraints(
  decision: DesignDecision,
  strategy: DesignStrategy,
  abstractionLevel: AbstractionLevel = 'stylized',
): DesignDecision {
  const avoidSet = new Set<string>();

  for (const item of [...strategy.avoidFragments, ...DEFAULT_MODERNIST_AVOID, ...decision.antiPatterns]) {
    const trimmed = item.trim();
    if (trimmed) avoidSet.add(trimmed);
  }

  const promptLower = decision.promptText.toLowerCase();
  const filteredAvoid = [...avoidSet].filter((pattern) => {
    const lower = pattern.toLowerCase();
    if (promptLower.includes(`no ${lower}`)) return false;
    if (promptLower.includes(`avoid ${lower}`)) return false;
    return true;
  });

  const polished = polishLogoPrompt(decision.promptText, {
    colorPalette: strategy.colorSystem.toLowerCase().includes('black and white') ? 'black_white' : undefined,
    abstractionLevel,
  });

  return {
    ...decision,
    antiPatterns: filteredAvoid,
    reasoning: [decision.reasoning, strategy.reasoning].filter(Boolean).join(' '),
    promptText: polished,
    confidence: Math.min(0.98, (decision.confidence + strategy.confidence) / 2 + 0.05),
  };
}
