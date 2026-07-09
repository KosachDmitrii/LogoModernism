import { randomUUID } from 'node:crypto';
import type { ComposedPrompt, DesignRule, LogoDNA, LogoMarkType, PromptScores, TypographyStyle } from '@logo-platform/shared';
import {
  appendStylePreferenceFragments,
  isMultiWordCompanyName,
  lettermarkTextFromName,
  exactBrandSpellingFragment,
  normalizeBrandName,
  hasExplicitBrandName,
  resolveMarkTypeForBrand,
  resolveTypographyStyleForBrand,
  NO_BRAND_TEXT_FRAGMENT,
  buildArtDirectionFragments,
  isCombinationMark,
  stylePreferenceOverrides,
  finalizeLogoPromptText,
} from '@logo-platform/shared';
import { CATEGORY_ORDER } from './design-rules-engine';
import { scorePrompt } from './prompt-scorer';
import { clauseOverlaps, optimizePrompt } from './prompt-optimizer';
import {
  filterPrinciplesForMarkType,
  shouldSkipCategoryForMarkType,
} from './mark-type-filter';

export interface ComposeInput {
  industry: string;
  companyName?: string;
  principles: DesignRule[];
  dna: LogoDNA;
  inspirationMode?: string;
  variationIndex?: number;
  markType?: LogoMarkType;
  typographyStyle?: TypographyStyle;
  /** Fragments from Logo Catalog references */
  catalogInspiration?: string[];
  /** Client-selected style preferences from Design Brief */
  briefContext?: import('@logo-platform/shared').BriefContext;
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

export function initialsFromName(name: string): string {
  return lettermarkTextFromName(name);
}

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
  const brandName = normalizeBrandName(input.companyName);
  const markType = resolveMarkTypeForBrand(input.markType, brandName, input.typographyStyle);
  const typographyStyle = resolveTypographyStyleForBrand(input.typographyStyle, brandName);
  const isWordmark = markType === 'wordmark';
  const isLettermark = markType === 'lettermark';
  const isConstructed = typographyStyle === 'constructed';
  const markFilterOptions = { typographyStyle, companyName: brandName };
  const lettermarkText = brandName ? lettermarkTextFromName(brandName) : '';
  const lettermarkUsesInitials = brandName ? isMultiWordCompanyName(brandName) : false;
  const principles = filterPrinciplesForMarkType(input.principles, markType, markFilterOptions);

  if (isConstructed) {
    fragments.push('Modernist constructed typography logo design');
    fragments.push(
      'Geometric letterforms built from triangles, semicircles, and rectangles on a modular grid',
    );
  } else if (isWordmark) {
    fragments.push('Modernist typographic wordmark logo design');
  } else if (isLettermark) {
    fragments.push('Modernist lettermark monogram logo design');
  } else {
    fragments.push('Minimal geometric logo design');
  }

  if (brandName) {
    if (isLettermark && lettermarkText) {
      if (lettermarkUsesInitials) {
        fragments.push(`monogram of the initials "${lettermarkText}" for brand "${brandName}"`);
      } else {
        fragments.push(`lettermark built from the full word "${lettermarkText}"`);
      }
    } else if (isWordmark || !markType) {
      fragments.push(`wordmark for "${brandName}"`);
    } else {
      fragments.push(`for "${brandName}"`);
    }
    fragments.push(exactBrandSpellingFragment(brandName, markType ?? (isWordmark ? 'wordmark' : undefined)));
  } else {
    fragments.push(NO_BRAND_TEXT_FRAGMENT);
  }

  if (input.catalogInspiration?.length) {
    fragments.push(input.catalogInspiration.join('. '));
  }

  for (const category of CATEGORY_ORDER) {
    if (shouldSkipCategoryForMarkType(category, markType, markFilterOptions)) continue;

    const marker = CATALOG_CATEGORY_MARKERS[category];
    if (hasCatalog && marker && catalogText.includes(marker)) {
      continue;
    }

    const rules = filterPrinciplesForCatalog(
      principles.filter((p) => p.category === category),
      category,
      catalogText,
    );
    if (rules.length === 0) continue;

    const label = CATEGORY_LABELS[category];
    const categoryFragments = rules.map((rule) => ruleToFragment(rule, hasCatalog || isWordmark || isLettermark));
    if (label && categoryFragments.length > 1) {
      fragments.push(`${label}: ${categoryFragments.join(', ')}`);
    } else {
      fragments.push(...categoryFragments);
    }
  }

  const antiPatterns = [
    ...new Set(
      principles
        .flatMap((p) => p.antiPatterns)
        .map((pattern) => pattern?.trim())
        .filter((pattern): pattern is string => Boolean(pattern))
        .filter((pattern) => !isRedundantAvoid(pattern, principles)),
    ),
  ].slice(0, 4);

  if (antiPatterns.length > 0) {
    fragments.push(`Avoid: ${antiPatterns.join(', ')}`);
  }

  if (isConstructed) {
    fragments.push('Dense stacked typographic block — letters are the entire logo');
    fragments.push('Bold black constructive letterforms, not an off-the-shelf font');
    fragments.push('No separate icon, roundel, emblem, or pictorial symbol');
  } else if (isWordmark && brandName) {
    fragments.push('Typography-only wordmark, company name spelled as the logo');
    fragments.push('No separate icon, no symbol above text, no pictorial mark, no emblem');
  }

  if (isLettermark && brandName) {
    if (lettermarkUsesInitials) {
      fragments.push(
        lettermarkText
          ? `Monogram built only from the letters "${lettermarkText}" — do not spell the full company name`
          : 'Monogram built only from the brand initials — do not spell the full company name',
      );
    } else {
      fragments.push(
        lettermarkText
          ? `Lettermark built from the full word "${lettermarkText}" — do not abbreviate to initials`
          : 'Lettermark built from the full company name — do not abbreviate to initials',
      );
    }
    fragments.push('Letters are the entire logo. No separate icon, no pictorial symbol, no emblem, no badge, no industry imagery');
  }

  if (isCombinationMark(markType)) {
    fragments.push(...buildArtDirectionFragments({ markType, industry: input.industry }));
  } else if (isWordmark || isLettermark) {
    fragments.push(...buildArtDirectionFragments({ markType }));
  }

  fragments.push('Premium professional branding');
  fragments.push('Timeless modernist aesthetic');

  const rawText = appendStylePreferenceFragments(
    fragments.join('. ').replace(/\.\s*\./g, '.'),
    input.briefContext,
  );
  const optimized = optimizePrompt(rawText, principles, stylePreferenceOverrides(input.briefContext));
  const text = finalizeLogoPromptText(optimized, {
    clientNotes: input.briefContext?.clientNotes,
    companyName: brandName,
    markType,
    colorPalette: input.briefContext?.colorPalette,
  });
  const scores = scorePrompt(text, principles, input.dna);

  return {
    id: randomUUID(),
    text,
    industry: input.industry,
    selectedPrinciples: principles,
    scores,
    dna: input.dna,
    metadata: {
      era: input.dna.era,
      variationIndex: input.variationIndex,
      inspirationMode: input.inspirationMode,
      markType,
      typographyStyle,
      stylePreferences: input.briefContext
        ? {
            colorPalette: input.briefContext.colorPalette,
            colorSelections: input.briefContext.colorSelections,
            allowShadows: input.briefContext.allowShadows,
            allowPhotoreal: input.briefContext.allowPhotoreal,
            clientNotes: input.briefContext.clientNotes,
          }
        : undefined,
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
