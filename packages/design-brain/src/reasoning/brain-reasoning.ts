import type { BriefContext, DesignDecision, TasteProfile } from '@logo-platform/shared';
import { buildCatalogPromptContext } from '@logo-platform/knowledge-base';

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
}

const SYSTEM_PROMPT = `You are the Design Brain — a self-learning logo design intelligence.

Given client brief, catalog references, retrieved experience memory, learned principles, and taste profile,
produce a structured design decision for a modernist logo.

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
  "reasoning": "2-4 sentences explaining the design decision",
  "promptText": "Complete image generation prompt, flat vector modernist logo, specific and actionable",
  "confidence": 0.0-1.0
}

Rules:
- Respect brief constraints and taste profile avoided patterns
- Use catalog references as inspiration, not copies
- Prefer minimal, timeless, Swiss/modernist aesthetic
- promptText must be ready for an image model`;

export async function reasonDesignDecision(context: ReasoningContext): Promise<DesignDecision> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackDecision(context);
  }

  const catalog = buildCatalogPromptContext(context.catalogReferenceIds ?? [], {
    narrative: context.catalogNarrative,
    typographyStyle: context.typographyStyle as 'standard' | 'constructed' | undefined,
  });

  const model = process.env.OPENAI_TEXT_MODEL ?? 'gpt-4o-mini';

  const userPrompt = [
    `Industry: ${context.industry}`,
    context.companyName ? `Company: ${context.companyName}` : '',
    context.markType ? `Requested mark type: ${context.markType}` : '',
    context.typographyStyle ? `Typography style: ${context.typographyStyle}` : '',
    context.preferredEra ? `Preferred era: ${context.preferredEra}` : '',
    context.minimalismLevel ? `Minimalism level: ${context.minimalismLevel}/10` : '',
    '',
    'Brief:',
    formatBrief(context.briefContext),
    '',
    'Catalog inspiration:',
    catalog?.inspirationFragments.join('\n') || 'None selected',
    '',
    'Taste profile:',
    context.tasteProfile.summary,
    `Preferred geometry: ${context.tasteProfile.preferredGeometry.join(', ')}`,
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
      max_tokens: 2000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    return fallbackDecision(context);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content ?? '';
  const parsed = parseDecisionJson(content);
  if (parsed) return parsed;

  return fallbackDecision(context);
}

function formatBrief(brief?: BriefContext): string {
  if (!brief) return 'No explicit brief — infer from industry and catalog.';

  return Object.entries(brief)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

export function parseDecisionJson(content: string): DesignDecision | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as DesignDecision;
    if (!parsed.promptText || !parsed.markType) return null;
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
  const markType = (context.markType as DesignDecision['markType']) ?? 'wordmark';
  const company = context.companyName ? ` for "${context.companyName}"` : '';

  return {
    markType,
    typographyStyle: context.typographyStyle as DesignDecision['typographyStyle'],
    geometry: context.tasteProfile.preferredGeometry,
    construction: ['grid-based', 'modular construction'],
    composition: ['optical balance', 'negative space'],
    typography: ['geometric sans-serif'],
    era: context.preferredEra ?? 'swiss',
    principles: context.learnedPrinciples.slice(0, 5).map((p) => ({
      category: p.category,
      promptFragment: p.promptFragment,
      weight: p.weight,
    })),
    antiPatterns: context.tasteProfile.avoidedPatterns,
    catalogReferences: context.catalogReferenceIds ?? [],
    reasoning: 'Fallback decision using taste profile and learned principles.',
    promptText: `Minimal geometric ${markType} logo${company}. Flat vector, Swiss modernism, black on white. ${context.tasteProfile.preferredGeometry.join(', ')}. Avoid ${context.tasteProfile.avoidedPatterns.join(', ')}.`,
    confidence: 0.5,
  };
}
