import type { DesignDecision } from '@logo-platform/shared';
import type { AbstractionLevel, DesignStrategy, BrainGenerateRequest } from '@logo-platform/shared';
import { scrubCatalogSignificanceLeaks } from '@logo-platform/knowledge-base';

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
  requestOrMinimalism?: BrainGenerateRequest | number,
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

  const polished = scrubCatalogSignificanceLeaks(decision.promptText);

  return {
    ...decision,
    antiPatterns: filteredAvoid,
    reasoning: [decision.reasoning, strategy.reasoning].filter(Boolean).join(' '),
    promptText: polished,
    confidence: Math.min(0.98, (decision.confidence + strategy.confidence) / 2 + 0.05),
  };
}
