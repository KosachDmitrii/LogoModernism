import type { DesignDecision } from '@logo-platform/shared';
import type { DesignStrategy } from '@logo-platform/shared';

const DEFAULT_MODERNIST_AVOID = [
  'gradients',
  'photorealism',
  'mockups',
  'busy backgrounds',
  'stock clipart',
];

export function solveConstraints(
  decision: DesignDecision,
  strategy: DesignStrategy,
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

  const strategyPrefix = strategy.suggestFragments
    .filter((fragment) => !promptLower.includes(fragment.slice(0, 24).toLowerCase()))
    .slice(0, 3)
    .join('. ');

  const enrichedPrompt = strategyPrefix
    ? `${decision.promptText.replace(/\s*\.?\s*$/, '')}. ${strategyPrefix}.`
    : decision.promptText;

  return {
    ...decision,
    antiPatterns: filteredAvoid,
    reasoning: [decision.reasoning, strategy.reasoning].filter(Boolean).join(' '),
    promptText: enrichedPrompt,
    confidence: Math.min(0.98, (decision.confidence + strategy.confidence) / 2 + 0.05),
  };
}
