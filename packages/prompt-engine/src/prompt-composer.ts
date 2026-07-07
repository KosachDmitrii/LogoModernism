import { randomUUID } from 'node:crypto';
import type { ComposedPrompt, DesignRule, LogoDNA, PromptScores } from '@logo-platform/shared';
import { CATEGORY_ORDER } from './design-rules-engine';
import { scorePrompt } from './prompt-scorer';
import { clauseOverlaps, optimizePrompt } from './prompt-optimizer';

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

const CATALOG_OVERLAP_CATEGORIES = new Set<DesignRule['category']>([
  'geometry',
  'construction',
  'composition',
  'typography',
  'mark_type',
]);

const CATALOG_CATEGORY_MARKERS: Partial<Record<DesignRule['category'], string>> = {
  geometry: 'geometry vocabulary',
  construction: 'construction:',
  composition: 'composition:',
  typography: 'typography:',
  mark_type: 'mark type:',
};

function ruleToFragment(rule: DesignRule, compact = false): string {
  if (!compact && RICH_CATEGORIES.has(rule.category) && rule.description.length > 12) {
    return `${rule.promptFragment}. ${rule.description}`;
  }
  return rule.promptFragment;
}

function overlapsCatalog(fragment: string, catalogText: string): boolean {
  if (!catalogText) return false;
  const normalized = fragment.toLowerCase();
  if (catalogText.includes(normalized)) return true;
  return clauseOverlaps(fragment, catalogText);
}

function isRedundantAvoid(pattern: string, principles: DesignRule[]): boolean {
  const ids = new Set(principles.map((p) => p.id));
  const normalized = pattern.toLowerCase();

  if (normalized.includes('gradient') && (ids.has('color-no-gradient') || ids.has('fx-gradient-avoid'))) {
    return true;
  }
  if (normalized.includes('shadow') && (ids.has('render-no-shadows') || ids.has('fx-shadow-avoid'))) {
    return true;
  }

  return false;
}

function filterPrinciplesForCatalog(
  rules: DesignRule[],
  category: DesignRule['category'],
  catalogText: string,
): DesignRule[] {
  if (!catalogText || !CATALOG_OVERLAP_CATEGORIES.has(category)) return rules;

  return rules.filter((rule) => !overlapsCatalog(ruleToFragment(rule, true), catalogText));
}

export function composePrompt(input: ComposeInput): ComposedPrompt {
  const fragments: string[] = [];
  const hasCatalog = Boolean(input.catalogInspiration?.length);
  const catalogText = (input.catalogInspiration ?? []).join(' ').toLowerCase();

  fragments.push('Minimal geometric logo design');

  if (input.companyName) {
    fragments.push(`for "${input.companyName}"`);
  }

  if (input.catalogInspiration?.length) {
    fragments.push(input.catalogInspiration.join('. '));
  }

  for (const category of CATEGORY_ORDER) {
    const marker = CATALOG_CATEGORY_MARKERS[category];
    if (hasCatalog && marker && catalogText.includes(marker)) {
      continue;
    }

    const rules = filterPrinciplesForCatalog(
      input.principles.filter((p) => p.category === category),
      category,
      catalogText,
    );
    if (rules.length === 0) continue;

    const label = CATEGORY_LABELS[category];
    const categoryFragments = rules.map((rule) => ruleToFragment(rule, hasCatalog));
    if (label && categoryFragments.length > 1) {
      fragments.push(`${label}: ${categoryFragments.join(', ')}`);
    } else {
      fragments.push(...categoryFragments);
    }
  }

  const antiPatterns = [
    ...new Set(
      input.principles
        .flatMap((p) => p.antiPatterns)
        .map((pattern) => pattern?.trim())
        .filter((pattern): pattern is string => Boolean(pattern))
        .filter((pattern) => !isRedundantAvoid(pattern, input.principles)),
    ),
  ].slice(0, 4);

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
