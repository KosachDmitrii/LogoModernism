import type { BrainGenerateRequest, ComposedPrompt, DesignDecision, DesignRule, Era, InspirationMode } from '@logo-platform/shared';
import {
  hasExplicitBrandName,
  NO_BRAND_TEXT_FRAGMENT,
  normalizeBrandName,
  resolveMarkTypeForBrand,
} from '@logo-platform/shared';
import { searchPrinciples } from '@logo-platform/knowledge-base';
import { composePrompt, selectDesignRules, significantTokens } from '@logo-platform/prompt-engine';

export interface EnrichmentContext {
  industry: string;
  companyName?: string;
  markType?: string;
  typographyStyle?: string;
}

export function buildBasePromptFromRules(request: BrainGenerateRequest): ComposedPrompt {
  const companyName = normalizeBrandName(request.companyName);

  const selection = selectDesignRules({
    industry: request.industry,
    companyName,
    preferredEra: request.preferredEra as Era | undefined,
    minimalismLevel: request.minimalismLevel ?? 8,
    inspirationMode: request.inspirationMode as InspirationMode | undefined,
    analysisPrincipleIds: request.analysisPrincipleIds,
    catalogReferenceIds: request.catalogReferenceIds,
    catalogNarrative: request.catalogNarrative,
    markType: request.markType,
    typographyStyle: request.typographyStyle,
    variationSeed: 42,
  });

  return composePrompt({
    industry: request.industry,
    companyName,
    principles: selection.principles,
    dna: selection.dna,
    inspirationMode: request.inspirationMode as InspirationMode | undefined,
    catalogInspiration: selection.catalogInspiration,
    markType: request.markType,
    typographyStyle: request.typographyStyle,
  });
}

function splitClauses(text: string): string[] {
  return text
    .split(/\.\s+/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 12);
}

function clausePresentInText(clause: string, text: string): boolean {
  const normalized = clause.toLowerCase();
  if (text.toLowerCase().includes(normalized)) return true;

  const tokens = significantTokens(clause);
  if (tokens.size < 2) return false;

  const textTokens = significantTokens(text);
  let overlap = 0;
  for (const token of tokens) {
    if (textTokens.has(token)) overlap++;
  }

  return overlap / tokens.size >= 0.6;
}

export function ensureBaseClausesPresent(baseText: string, enrichedText: string): string {
  const missing = splitClauses(baseText).filter((clause) => !clausePresentInText(clause, enrichedText));
  if (missing.length === 0) return enrichedText;

  const trimmed = enrichedText.replace(/\.\s*$/, '');
  return `${trimmed}. ${missing.join('. ')}`;
}

export function extractNewClauses(enrichedText: string, baseText: string): string[] {
  return splitClauses(enrichedText).filter((clause) => !clausePresentInText(clause, baseText));
}

export function ensureIndustryPresent(text: string, industry: string): string {
  const normalized = industry.toLowerCase().trim();
  const lower = text.toLowerCase();

  if (normalized && lower.includes(normalized)) return text;

  const industryRules = searchPrinciples({ industry: normalized }).filter(
    (rule) => rule.category === 'industry' && !rule.id.startsWith('ent-'),
  );
  const fragment = industryRules[0]?.promptFragment ?? industry.trim();

  if (fragment && lower.includes(fragment.toLowerCase())) return text;

  const trimmed = text.replace(/\.\s*$/, '');
  return `${trimmed}. ${fragment}`;
}

const TEXTUAL_MARK_PATTERNS = [
  /\b(?:as a |featuring a |using a )?lettermark\b/gi,
  /\bwordmark\b/gi,
  /\bmonogram\b/gi,
  /\bgeometric sans(?:\s+typography)?\b/gi,
  /\bbold initials\b/gi,
  /\bstandalone initial letters\b/gi,
  /\btypographic logotype\b/gi,
];

export function stripTextualMarkLanguage(text: string): string {
  const placeholder = '__NO_BRAND_TEXT_FRAGMENT__';
  let working = text.includes(NO_BRAND_TEXT_FRAGMENT)
    ? text.replace(NO_BRAND_TEXT_FRAGMENT, placeholder)
    : text;

  for (const pattern of TEXTUAL_MARK_PATTERNS) {
    working = working.replace(pattern, 'abstract symbol mark');
  }

  return working
    .replace(placeholder, NO_BRAND_TEXT_FRAGMENT)
    .replace(/\s{2,}/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim();
}

export function ensureSymbolOnlyDirectives(text: string): string {
  if (text.toLowerCase().includes('abstract symbol mark only')) return text;
  const trimmed = text.replace(/\.\s*$/, '');
  return `${trimmed}. ${NO_BRAND_TEXT_FRAGMENT}`;
}

export function mergeEnrichedPrompt(
  baseText: string,
  enrichedText: string,
  context: EnrichmentContext,
): string {
  const base = baseText.trim();
  let enriched = enrichedText.trim();
  const brandName = normalizeBrandName(context.companyName);

  if (!enriched) return base;

  if (enriched.length < base.length * 0.7) {
    const additions = extractNewClauses(enriched, base);
    enriched = additions.length > 0 ? `${base}. ${additions.join('. ')}` : base;
  } else {
    enriched = ensureBaseClausesPresent(base, enriched);
  }

  enriched = ensureIndustryPresent(enriched, context.industry);

  if (!brandName) {
    enriched = stripTextualMarkLanguage(enriched);
    enriched = ensureSymbolOnlyDirectives(enriched);
  }

  return enriched.replace(/\.\s*\./g, '.').trim();
}

export function sanitizeDecision(
  decision: DesignDecision,
  context: EnrichmentContext,
): DesignDecision {
  const brandName = normalizeBrandName(context.companyName);
  const resolvedMarkType = resolveMarkTypeForBrand(
    context.markType as DesignDecision['markType'],
    brandName,
    context.typographyStyle as DesignDecision['typographyStyle'],
  );

  if (!brandName) {
    return {
      ...decision,
      markType: 'combination',
      typographyStyle: undefined,
      typography: [],
      promptText: ensureSymbolOnlyDirectives(
        stripTextualMarkLanguage(decision.promptText),
      ),
      principles: decision.principles.filter(
        (principle) => principle.category !== 'typography',
      ),
      antiPatterns: [
        ...new Set([
          ...decision.antiPatterns,
          'lettering',
          'wordmark',
          'lettermark',
          'photorealism',
        ]),
      ],
    };
  }

  if (resolvedMarkType && decision.markType !== resolvedMarkType) {
    return { ...decision, markType: resolvedMarkType };
  }

  return decision;
}

export function buildVariationPrompt(
  mergedPrompt: string,
  geometry: string[],
  variationIndex: number,
): string {
  if (variationIndex === 0) return mergedPrompt;

  const emphasis = geometry[variationIndex % Math.max(geometry.length, 1)] ?? 'geometric clarity';
  const trimmed = mergedPrompt.replace(/\.\s*$/, '');
  return `${trimmed}. Variation ${variationIndex + 1}: emphasize ${emphasis}, preserve industry context and all base directives.`;
}

export function mergePrincipleSets(base: DesignRule[], extra: DesignRule[]): DesignRule[] {
  const merged = [...base];
  const seen = new Set(base.map((rule) => rule.id));

  for (const rule of extra) {
    if (seen.has(rule.id)) continue;
    merged.push(rule);
    seen.add(rule.id);
  }

  return merged;
}
