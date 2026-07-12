import type { ClientVisualIntent } from '@logo-platform/shared';
import type { DesignStrategy } from '@logo-platform/shared';
import type { AgentContribution } from '@logo-platform/shared';

export function runDesignAgents(
  intent: ClientVisualIntent,
  strategy: DesignStrategy,
): AgentContribution[] {
  return [
    {
      role: 'strategist',
      summary: `Abstraction ${intent.abstractionLevel} for ${intent.industryDomain}`,
      fragments: [strategy.markArchitecture, strategy.industryDirection],
    },
    {
      role: 'symbol',
      summary: strategy.symbolLogic,
      fragments: intent.desiredMotifs.slice(0, 3),
    },
    {
      role: 'typography',
      summary: strategy.typographyLogic,
      fragments: [strategy.typographyLogic],
    },
    {
      role: 'art-director',
      summary: `Construction: ${strategy.constructionSystem}`,
      fragments: [
        strategy.constructionSystem,
        strategy.colorSystem,
        ...strategy.suggestFragments.slice(0, 2),
      ],
    },
  ];
}
