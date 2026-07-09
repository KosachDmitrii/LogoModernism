import type { ClientVisualIntent } from './client-visual-intent';
import { buildIndustryDirection, resolveIndustryNode } from './industry-graph';

export interface DesignStrategy {
  markArchitecture: string;
  symbolLogic: string;
  typographyLogic: string;
  colorSystem: string;
  constructionSystem: string;
  suggestFragments: string[];
  avoidFragments: string[];
  industryDirection: string;
  reasoning: string;
  confidence: number;
}

export function buildDesignStrategy(
  intent: ClientVisualIntent,
  options?: {
    markType?: string;
    colorPalette?: string;
    minimalismLevel?: number;
  },
): DesignStrategy {
  const node = resolveIndustryNode(intent.industryDomain);
  const industryDirection = buildIndustryDirection(
    intent.industryDomain,
    intent.abstractionLevel,
    intent.desiredMotifs,
    intent.forbiddenMotifs,
  );

  const constructionSystem =
    node?.constructionBias.join(', ') ?? 'baseline grid, modular construction, optical balance';

  const markArchitecture =
    options?.markType === 'wordmark'
      ? 'Typography-led wordmark — letters are the entire identity'
      : options?.markType === 'lettermark'
        ? 'Monogram lettermark — initials as the entire identity'
        : 'Combination mark — unified symbol and wordmark lockup sharing one geometric system';

  const symbolLogic =
    intent.desiredMotifs.length > 0
      ? `Symbol explores: ${intent.desiredMotifs.slice(0, 3).join(', ')} at ${intent.abstractionLevel} abstraction`
      : `Symbol uses ${intent.abstractionLevel} industry form language derived from ${intent.industryDomain}`;

  const typographyLogic =
    intent.visualTone.includes('technical') || intent.visualTone.includes('Swiss')
      ? 'Custom geometric sans-serif with one modified distinctive glyph'
      : 'Custom neo-grotesque wordmark integrated with symbol geometry';

  const colorSystem =
    options?.colorPalette === 'black_white'
      ? 'Strict black and white only'
      : options?.colorPalette === 'monochrome'
        ? 'Monochrome single hue with tonal restraint'
        : options?.colorPalette && options.colorPalette !== 'auto'
          ? `Controlled palette: ${options.colorPalette.replace(/_/g, ' ')}`
          : 'Restrained modernist palette';

  const suggestFragments = [
    industryDirection,
    symbolLogic,
    typographyLogic,
    `Construction system: ${constructionSystem}`,
    colorSystem,
    ...intent.desiredMotifs.slice(0, 3),
  ].filter(Boolean);

  const avoidFragments = [
    ...intent.forbiddenMotifs,
    'gradients',
    'photorealism',
    'mockups',
    'busy backgrounds',
  ];

  const reasoning = [
    `Business essence: ${intent.businessEssence}.`,
    `Abstraction: ${intent.abstractionLevel}.`,
    intent.forbiddenMotifs.length
      ? `Client forbids: ${intent.forbiddenMotifs.join(', ')}.`
      : 'No explicit client prohibitions — using modernist defaults.',
    intent.desiredMotifs.length
      ? `Client desires: ${intent.desiredMotifs.join(', ')}.`
      : `Industry graph supplies ${intent.abstractionLevel} motifs for ${intent.industryDomain}.`,
  ].join(' ');

  return {
    markArchitecture,
    symbolLogic,
    typographyLogic,
    colorSystem,
    constructionSystem,
    suggestFragments: [...new Set(suggestFragments)],
    avoidFragments: [...new Set(avoidFragments.map((f) => f.trim()).filter(Boolean))],
    industryDirection,
    reasoning,
    confidence: intent.confidence,
  };
}

export function formatDesignStrategyForPrompt(strategy: DesignStrategy): string {
  return [
    `Design strategy: ${strategy.markArchitecture}.`,
    strategy.symbolLogic + '.',
    strategy.typographyLogic + '.',
    strategy.constructionSystem + '.',
    strategy.colorSystem + '.',
    strategy.industryDirection + '.',
    strategy.avoidFragments.length ? `Avoid: ${strategy.avoidFragments.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}
