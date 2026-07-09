import type { BriefContext, DesignDecision, DesignRule, TasteProfile } from '@logo-platform/shared';
import type { ClientVisualIntent, DesignStrategy } from '@logo-platform/shared';
import { buildCatalogPromptContext } from '@logo-platform/knowledge-base';
import {
  exactBrandSpellingFragment,
  hasExplicitBrandName,
  normalizeBrandName,
  NO_BRAND_TEXT_FRAGMENT,
  resolveMarkTypeForBrand,
} from '@logo-platform/shared';
import {
  mergeEnrichedPrompt,
  sanitizeDecision,
  type EnrichmentContext,
} from './prompt-enrichment';

export interface ReasoningContext {
  industry: string;
  companyName?: string;
  catalogReferenceIds?: string[];
  catalogNarrative?: string;
  briefContext?: BriefContext;
  retrievedExperiences: Array<{ title?: string | null; summary?: string | null; content: string; similarity?: number }>;
  learnedPrinciples: Array<{ category: string; ruleText: string; promptFragment: string; weight: number }>;
  tasteProfile: TasteProfile;
  markType?: string;
  typographyStyle?: string;
  preferredEra?: string;
  minimalismLevel?: number;
  /** Rules-engine base prompt — Brain must enrich, not replace */
  basePromptText?: string;
  basePrinciples?: DesignRule[];
  designStrategy?: DesignStrategy;
  clientIntent?: ClientVisualIntent;
}

const SYSTEM_PROMPT = `You are the Brain — a self-learning logo design knowledge system.

You ENRICH a base prompt from the rules engine. Your job is to make it MORE specific and BETTER — never shorter or more generic.

Return ONLY JSON:
{
  "markType": "wordmark|lettermark|combination",
  "typographyStyle": "standard|constructed",
  "geometry": ["circle", "triangle"],
  "construction": ["grid-based", "modular-grid"],
  "composition": ["symmetry", "negative-space"],
  "typography": ["geometric-sans"],
  "era": "swiss|bauhaus|corporate_identity|1960s|1970s",
  "principles": [
    { "category": "geometry", "promptFragment": "built from circle construction", "weight": 1.0 }
  ],
  "antiPatterns": ["gradients", "shadows", "photorealism"],
  "catalogReferences": ["ref-id or name"],
  "reasoning": "2-4 sentences explaining what you added and why",
  "promptText": "Full enriched image-generation prompt preserving all base directives",
  "confidence": 0.0-1.0
}

Enrichment rules:
- The BASE PROMPT is the foundation — keep every substantive directive from it
- ADD industry context ONLY through abstract form language — geometry, construction, silhouette, negative space
- Translate industry into form vocabulary: round focal geometry, quarter-circle arcs, radial construction, interlaced weave, warm balanced silhouette
- Use ONE construction axis only (baseline grid OR radial/weave — never diagonal + isometric together)
- Use ONE color system only — if brief says black & white, never add accent colors
- Do NOT use emblem badge format for combination marks unless client explicitly requests it
- Do NOT mix serif and sans-serif typography in the same prompt
- Translate industry into form vocabulary appropriate to abstraction level from DESIGN STRATEGY
- Only put client EXPLICIT prohibitions in antiPatterns — do not invent industry-specific negatives
- ADD insights from retrieved experience, learned principles, and catalog references
- promptText must be AT LEAST as long and detailed as the base prompt
- NEVER replace the base prompt with a short generic template
- For food, restaurant, retail, or hospitality brands: include International Typographic Style and Bauhaus geometric system language
- Respect brief constraints and taste profile avoided patterns
- If CLIENT NOTES are provided, use them for enrichment only — do NOT paste them verbatim in promptText and do NOT duplicate a Client preferences block (notes are appended automatically at the end)
- Do NOT append long geometry laundry lists (circles, squares, triangles, hexagons, blobs together) — keep at most three geometry anchors: round focal geometry, quarter-circle arcs, interlaced weave
- Do NOT add numeric digit marks, capsule pill forms, or primary color palettes when the brief implies monochrome or flat vector black-on-white
- Use catalog references as inspiration, not copies
- Prefer minimal, timeless, Swiss/modernist aesthetic
- promptText must be ready for an image model
- If companyName is provided, the logo text must spell that name exactly — correct letters in order, no substitutions or invented letters
- If companyName is NOT provided: symbol-only logo, markType must NOT be wordmark or lettermark, no typography in promptText, no text/letters/words/initials
- Do not require symmetry in promptText while listing perfect optical symmetry in antiPatterns — prefer grid-based balance or optical balance instead
- antiPatterns must not repeat restrictions already stated in promptText (e.g. if prompt says "no gradients", do not list gradients in antiPatterns)`;

export async function reasonDesignDecision(context: ReasoningContext): Promise<DesignDecision> {
  const enrichmentContext = toEnrichmentContext(context);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return finalizeDecision(fallbackDecision(context), context);
  }

  const catalog = buildCatalogPromptContext(context.catalogReferenceIds ?? [], {
    narrative: context.catalogNarrative,
    typographyStyle: context.typographyStyle as 'standard' | 'constructed' | undefined,
  });

  const model = process.env.OPENAI_TEXT_MODEL ?? 'gpt-4o-mini';
  const brandName = normalizeBrandName(context.companyName);
  const symbolOnly = !hasExplicitBrandName(brandName);

  const userPrompt = [
    `Industry: ${context.industry}`,
    brandName ? `Company: ${brandName}` : 'Company: (none — symbol-only logo, no text)',
    brandName
      ? `Required logo text: ${exactBrandSpellingFragment(brandName, context.markType as DesignDecision['markType'])}`
      : `Required: ${NO_BRAND_TEXT_FRAGMENT}`,
    context.markType ? `Requested mark type: ${context.markType}` : '',
    symbolOnly ? 'Mark type constraint: abstract symbol only — NOT lettermark or wordmark' : '',
    context.typographyStyle ? `Typography style: ${context.typographyStyle}` : '',
    context.preferredEra ? `Preferred era: ${context.preferredEra}` : '',
    context.minimalismLevel ? `Minimalism level: ${context.minimalismLevel}/10` : '',
    '',
    context.basePromptText
      ? [
          'BASE PROMPT (preserve ALL directives — enrich with specificity, do NOT shorten or replace):',
          context.basePromptText,
          '',
        ].join('\n')
      : '',
    'Brief:',
    formatBrief(context.briefContext),
    '',
    context.designStrategy
      ? [
          'DESIGN STRATEGY (follow this architecture):',
          `Mark: ${context.designStrategy.markArchitecture}`,
          `Symbol: ${context.designStrategy.symbolLogic}`,
          `Typography: ${context.designStrategy.typographyLogic}`,
          `Construction: ${context.designStrategy.constructionSystem}`,
          `Color: ${context.designStrategy.colorSystem}`,
          context.designStrategy.industryDirection,
          context.designStrategy.avoidFragments.length
            ? `Client forbids: ${context.designStrategy.avoidFragments.join(', ')}`
            : '',
          '',
        ].join('\n')
      : '',
    context.clientIntent
      ? [
          'CLIENT VISUAL INTENT:',
          `Abstraction: ${context.clientIntent.abstractionLevel}`,
          context.clientIntent.desiredMotifs.length
            ? `Desired motifs: ${context.clientIntent.desiredMotifs.join(', ')}`
            : 'Desired motifs: infer from industry at appropriate abstraction',
          context.clientIntent.forbiddenMotifs.length
            ? `Forbidden: ${context.clientIntent.forbiddenMotifs.join(', ')}`
            : 'Forbidden: none explicit — use modernist defaults only',
          '',
        ].join('\n')
      : '',
    'Catalog inspiration:',
    catalog?.inspirationFragments.join('\n') || 'None selected',
    '',
    'Taste profile:',
    context.tasteProfile.summary,
    `Preferred geometry: ${context.tasteProfile.preferredGeometry.join(', ')}`,
    context.tasteProfile.preferredColors?.length
      ? `Preferred colors: ${context.tasteProfile.preferredColors.join(', ')}`
      : '',
    context.tasteProfile.preferredRendering?.length
      ? `Preferred rendering: ${context.tasteProfile.preferredRendering.join(', ')}`
      : '',
    `Avoid: ${context.tasteProfile.avoidedPatterns.join(', ')}`,
    '',
    'Retrieved experience memory:',
    context.retrievedExperiences
      .slice(0, 6)
      .map((exp, i) => `${i + 1}. [${exp.similarity?.toFixed(2) ?? '?'}] ${exp.title ?? 'Untitled'}: ${exp.summary ?? exp.content.slice(0, 200)}`)
      .join('\n') || 'No relevant experience yet',
    '',
    'Learned principles:',
    context.learnedPrinciples
      .slice(0, 12)
      .map((p) => `- [${p.category}] ${p.promptFragment} (w=${p.weight})`)
      .join('\n') || 'No learned principles yet',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 3000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    return finalizeDecision(fallbackDecision(context), context);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content ?? '';
  const parsed = parseDecisionJson(content, symbolOnly);
  if (parsed) return finalizeDecision(parsed, context);

  return finalizeDecision(fallbackDecision(context), context);
}

function toEnrichmentContext(context: ReasoningContext): EnrichmentContext {
  return {
    industry: context.industry,
    companyName: context.companyName,
    markType: context.markType,
    typographyStyle: context.typographyStyle,
    colorPalette: context.briefContext?.colorPalette,
  };
}

function finalizeDecision(decision: DesignDecision, context: ReasoningContext): DesignDecision {
  const enrichmentContext = toEnrichmentContext(context);
  const sanitized = sanitizeDecision(decision, enrichmentContext);

  if (!context.basePromptText?.trim()) {
    return sanitized;
  }

  return {
    ...sanitized,
    promptText: mergeEnrichedPrompt(
      context.basePromptText,
      sanitized.promptText,
      enrichmentContext,
      context.briefContext?.clientNotes,
    ),
  };
}

function formatBrief(brief?: BriefContext): string {
  if (!brief) return 'No explicit brief — infer from industry and catalog.';

  const lines: string[] = [];
  if (brief.clientNotes?.trim()) {
    lines.push(`CLIENT NOTES (context only — do not paste verbatim into promptText): ${brief.clientNotes.trim()}`);
  }

  for (const [key, value] of Object.entries(brief)) {
    if (key === 'clientNotes' || !value) continue;
    lines.push(`${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
  }

  return lines.length > 0 ? lines.join('\n') : 'No explicit brief — infer from industry and catalog.';
}

const VALID_MARK_TYPES = new Set(['wordmark', 'lettermark', 'combination']);

export function parseDecisionJson(content: string, symbolOnly = false): DesignDecision | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as DesignDecision;
    if (!parsed.promptText || !parsed.markType) return null;
    if (!VALID_MARK_TYPES.has(parsed.markType)) return null;
    if (symbolOnly && (parsed.markType === 'wordmark' || parsed.markType === 'lettermark')) {
      parsed.markType = 'combination';
      parsed.typography = [];
    }

    return {
      markType: parsed.markType,
      typographyStyle: parsed.typographyStyle,
      geometry: parsed.geometry ?? [],
      construction: parsed.construction ?? [],
      composition: parsed.composition ?? [],
      typography: parsed.typography ?? [],
      era: parsed.era ?? 'swiss',
      principles: parsed.principles ?? [],
      antiPatterns: parsed.antiPatterns ?? [],
      catalogReferences: parsed.catalogReferences ?? [],
      reasoning: parsed.reasoning ?? '',
      promptText: parsed.promptText,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
    };
  } catch {
    return null;
  }
}

function fallbackDecision(context: ReasoningContext): DesignDecision {
  const brandName = normalizeBrandName(context.companyName);
  const markType =
    resolveMarkTypeForBrand(
      context.markType as DesignDecision['markType'],
      brandName,
      context.typographyStyle as DesignDecision['typographyStyle'],
    ) ?? 'combination';

  if (context.basePromptText?.trim()) {
    return {
      markType: brandName ? ((context.markType as DesignDecision['markType']) ?? 'wordmark') : 'combination',
      typographyStyle: context.typographyStyle as DesignDecision['typographyStyle'],
      geometry: context.tasteProfile.preferredGeometry,
      construction: ['grid-based', 'modular construction'],
      composition: ['optical balance', 'negative space'],
      typography: brandName ? ['geometric sans-serif'] : [],
      era: context.preferredEra ?? 'swiss',
      principles: context.learnedPrinciples.slice(0, 5).map((p) => ({
        category: p.category,
        promptFragment: p.promptFragment,
        weight: p.weight,
      })),
      antiPatterns: context.tasteProfile.avoidedPatterns,
      catalogReferences: context.catalogReferenceIds ?? [],
      reasoning: 'Brain unavailable — using rules-engine base prompt with taste profile.',
      promptText: context.basePromptText,
      confidence: 0.55,
    };
  }

  const company = brandName ? ` for "${brandName}"` : '';
  const noText = brandName ? '' : ` ${NO_BRAND_TEXT_FRAGMENT}.`;

  return {
    markType: brandName ? ((context.markType as DesignDecision['markType']) ?? 'wordmark') : 'combination',
    typographyStyle: context.typographyStyle as DesignDecision['typographyStyle'],
    geometry: context.tasteProfile.preferredGeometry,
    construction: ['grid-based', 'modular construction'],
    composition: ['optical balance', 'negative space'],
    typography: brandName ? ['geometric sans-serif'] : [],
    era: context.preferredEra ?? 'swiss',
    principles: context.learnedPrinciples.slice(0, 5).map((p) => ({
      category: p.category,
      promptFragment: p.promptFragment,
      weight: p.weight,
    })),
    antiPatterns: context.tasteProfile.avoidedPatterns,
    catalogReferences: context.catalogReferenceIds ?? [],
    reasoning: 'Fallback decision using taste profile and learned principles.',
    promptText: `Minimal geometric ${brandName ? markType : 'symbol'} logo${company}. Flat vector, Swiss modernism, black on white. ${context.industry}. ${context.tasteProfile.preferredGeometry.join(', ')}. Avoid ${context.tasteProfile.avoidedPatterns.join(', ')}.${noText}${brandName ? ` ${exactBrandSpellingFragment(brandName, markType)}.` : ''}`,
    confidence: 0.5,
  };
}
