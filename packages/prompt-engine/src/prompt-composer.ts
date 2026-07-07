import { randomUUID } from 'node:crypto';
import type { ComposedPrompt, DesignRule, LogoDNA, PromptScores } from '@logo-platform/shared';
import { CATEGORY_ORDER } from './design-rules-engine';
import { scorePrompt } from './prompt-scorer';
import { optimizePrompt } from './prompt-optimizer';

export interface ComposeInput {
  industry: string;
  companyName?: string;
  principles: DesignRule[];
  dna: LogoDNA;
  inspirationMode?: string;
  variationIndex?: number;
  /** Fragments from Logo Catalog references */
  catalogInspiration?: string[];
}

const CATEGORY_LABELS: Partial<Record<DesignRule['category'], string>> = {
  industry: 'Industry',
  geometry: 'Geometry',
  construction: 'Construction',
  composition: 'Composition',
  grid: 'Grid',
  typography: 'Typography',
  stroke: 'Stroke',
  balance: 'Balance',
  complexity: 'Complexity',
  era: 'Era',
  color: 'Color',
  effects: 'Effects',
  mark_type: 'Mark Type',
  rendering: 'Rendering',
};

const RICH_CATEGORIES = new Set<DesignRule['category']>([
  'construction',
  'composition',
  'era',
  'grid',
  'typography',
]);

function ruleToFragment(rule: DesignRule): string {
  if (RICH_CATEGORIES.has(rule.category) && rule.description.length > 12) {
    return `${rule.promptFragment}. ${rule.description}`;
  }
  return rule.promptFragment;
}

export function composePrompt(input: ComposeInput): ComposedPrompt {
  const fragments: string[] = [];

  fragments.push('Minimal geometric logo design');

  if (input.companyName) {
    fragments.push(`for "${input.companyName}"`);
  }

  if (input.catalogInspiration?.length) {
    fragments.push(input.catalogInspiration.join('. '));
  }

  for (const category of CATEGORY_ORDER) {
    const rules = input.principles.filter((p) => p.category === category);
    if (rules.length === 0) continue;

    const label = CATEGORY_LABELS[category];
    const categoryFragments = rules.map(ruleToFragment);
    if (label && categoryFragments.length > 1) {
      fragments.push(`${label}: ${categoryFragments.join(', ')}`);
    } else {
      fragments.push(...categoryFragments);
    }
  }

  // Anti-patterns from selected principles
  const antiPatterns = input.principles
    .flatMap((p) => p.antiPatterns)
    .filter(Boolean)
    .slice(0, 4);
  if (antiPatterns.length > 0) {
    fragments.push(`Avoid: ${antiPatterns.join(', ')}`);
  }

  fragments.push('Premium professional branding');
  fragments.push('Timeless modernist aesthetic');

  const rawText = fragments.join('. ').replace(/\.\s*\./g, '.');
  const optimized = optimizePrompt(rawText, input.principles);
  const scores = scorePrompt(optimized, input.principles, input.dna);

  return {
    id: randomUUID(),
    text: optimized,
    industry: input.industry,
    selectedPrinciples: input.principles,
    scores,
    dna: input.dna,
    metadata: {
      era: input.dna.era,
      variationIndex: input.variationIndex,
      inspirationMode: input.inspirationMode,
    },
  };
}

export function composePromptVariations(
  baseInput: Omit<ComposeInput, 'variationIndex'>,
  count: number,
  selectRules: (seed: number) => { principles: DesignRule[]; dna: LogoDNA },
): ComposedPrompt[] {
  const prompts: ComposedPrompt[] = [];
  for (let i = 0; i < count; i++) {
    const { principles, dna } = selectRules(i + 1);
    prompts.push(
      composePrompt({
        ...baseInput,
        principles,
        dna,
        variationIndex: i + 1,
      }),
    );
  }
  return prompts.sort((a, b) => b.scores.promptQuality - a.scores.promptQuality);
}

export function buildPromptFromTemplate(
  templateFragments: string[],
  principles: DesignRule[],
  industry: string,
  dna: LogoDNA,
): ComposedPrompt {
  const rawText = templateFragments.join('. ');
  const optimized = optimizePrompt(rawText, principles);
  const scores = scorePrompt(optimized, principles, dna);

  return {
    id: randomUUID(),
    text: optimized,
    industry,
    selectedPrinciples: principles,
    scores,
    dna,
    metadata: { era: dna.era },
  };
}
