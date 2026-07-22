import type { BrainGenerateRequest, CreativeTerritory } from '@logo-platform/shared';
import type { BrainArchitecture } from '@logo-platform/shared';
import { joinSentences } from './prose';

function territoryFromStrategy(
  id: string,
  name: string,
  thesis: string,
  architecture: BrainArchitecture,
  confidenceDelta: number,
  tradeoffs: string[],
): CreativeTerritory {
  const { designStrategy } = architecture;
  return {
    id,
    name,
    thesis,
    markArchitecture: designStrategy.markArchitecture,
    constructionFocus: designStrategy.constructionSystem,
    typographyFocus: designStrategy.typographyLogic,
    colorApproach: designStrategy.colorSystem,
    confidence: Math.min(0.95, designStrategy.confidence + confidenceDelta),
    tradeoffs,
  };
}

export function buildCreativeTerritories(
  architecture: BrainArchitecture,
  request: BrainGenerateRequest,
): CreativeTerritory[] {
  const mark = request.markType ?? 'wordmark';
  const industry = request.industry;
  const { designStrategy, clientIntent } = architecture;

  const primary = territoryFromStrategy(
    'territory-primary',
    'Primary direction',
    joinSentences(
      designStrategy.industryDirection,
      `Lead with ${designStrategy.markArchitecture} for ${industry}, aligned to ${clientIntent.abstractionLevel} abstraction`,
    ),
    architecture,
    0,
    ['Most aligned with brief and taste profile'],
  );

  const constructionLed = territoryFromStrategy(
    'territory-construction',
    'Construction-led',
    joinSentences(
      `Emphasize ${designStrategy.constructionSystem} as the hero system — form language before decoration`,
      designStrategy.industryDirection,
    ),
    architecture,
    -0.05,
    ['Stronger geometric rigor', 'Less expressive typography play'],
  );
  constructionLed.constructionFocus = designStrategy.constructionSystem;
  constructionLed.typographyFocus = 'Supportive geometric sans, subordinate to construction grid';

  const typographyLed = territoryFromStrategy(
    'territory-typography',
    'Typography-led',
    joinSentences(
      `Lead with ${designStrategy.typographyLogic} — custom letterforms as the primary recognition anchor`,
      designStrategy.industryDirection,
    ),
    architecture,
    mark === 'wordmark' || mark === 'lettermark' ? 0.02 : -0.08,
    ['Best for wordmark/lettermark briefs', 'Weaker when symbol-only is required'],
  );
  typographyLed.typographyFocus = designStrategy.typographyLogic;
  typographyLed.markArchitecture =
    mark === 'combination' ? 'Unified lockup — typography and symbol share one grid' : designStrategy.markArchitecture;

  return [primary, constructionLed, typographyLed];
}

export function selectCreativeTerritory(
  territories: CreativeTerritory[],
  request: BrainGenerateRequest,
): CreativeTerritory {
  if (request.preferredTerritoryId) {
    const preferred = territories.find((t) => t.id === request.preferredTerritoryId);
    if (preferred) return preferred;
  }

  const mark = request.markType ?? 'wordmark';
  const ranked = [...territories].sort((a, b) => b.confidence - a.confidence);

  if (mark === 'wordmark' || mark === 'lettermark') {
    const typo = ranked.find((t) => t.id === 'territory-typography');
    if (typo && typo.confidence >= (ranked[0]?.confidence ?? 0) - 0.04) return typo;
  }

  if (request.briefContext?.geometry?.toLowerCase().includes('grid')) {
    const construction = ranked.find((t) => t.id === 'territory-construction');
    if (construction) return construction;
  }

  return ranked[0] ?? territories[0]!;
}
