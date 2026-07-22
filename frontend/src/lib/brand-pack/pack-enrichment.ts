import type {
  BrainPartnerState,
  ComposedPrompt,
  CreativeTerritory,
  DesignBrief,
  DesignCriticResult,
} from '../../types';

const STUB_REASONING = /brief compiler v1|compiled deterministically/i;

export interface EnrichedDirection {
  rank: number;
  prompt: ComposedPrompt;
  territory: CreativeTerritory | null;
  reasoning: string;
  principles: Array<{ id: string; name: string }>;
  cues: string[];
  critique: DesignCriticResult | null;
  imageFiles: string[];
  hasRaster: boolean;
}

export interface EnrichedPack {
  companyName: string;
  industry: string;
  designBrief: DesignBrief;
  brainPartner: BrainPartnerState | null;
  locale: 'en' | 'ru';
  directions: EnrichedDirection[];
  packCritique: DesignCriticResult | null;
  selectedTerritory: CreativeTerritory | null;
}

function selectedTerritory(partner: BrainPartnerState | null): CreativeTerritory | null {
  if (!partner) return null;
  return (
    partner.creativeTerritories.find((t) => t.id === partner.selectedTerritoryId) ??
    partner.creativeTerritories[0] ??
    null
  );
}

function resolveTerritory(
  prompt: ComposedPrompt,
  partner: BrainPartnerState | null,
): CreativeTerritory | null {
  if (prompt.metadata?.creativeTerritory) return prompt.metadata.creativeTerritory;
  return selectedTerritory(partner);
}

/** Ensure a fragment reads as a finished sentence. */
export function ensureSentence(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (/[.!?…]$/.test(t)) return t;
  return `${t}.`;
}

export function joinSentences(...parts: Array<string | null | undefined>): string {
  const sentences: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    const sentence = ensureSentence(String(part).replace(/\s+/g, ' ').trim());
    if (!sentence) continue;
    const norm = sentence.toLowerCase();
    if (sentences.some((s) => s.toLowerCase() === norm)) continue;
    sentences.push(sentence);
  }
  return sentences.join(' ');
}

/** Repair Brain prose glued without periods (legacy stored reasoning). */
export function repairGluedProse(text: string): string {
  let t = text.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  t = t.replace(
    /\b(silhouette|system|anchor|decoration|abstraction|lockup|wordmark|lettermark|glyph|balance|grid|sans-serif|geometry|icons?)\s+(Lead|Emphasize|Construction|Typography|Mark|Symbol|Industry|Grounded|Creative|Anchors|Primary|Direction|Avoid)\b/g,
    '$1. $2',
  );
  return ensureSentence(t);
}

function uniqueLabels(labels: string[], max: number): string[] {
  const out: string[] = [];
  for (const label of labels) {
    const clean = label.replace(/\s+/g, ' ').trim();
    if (!clean) continue;
    if (out.some((x) => x.toLowerCase() === clean.toLowerCase())) continue;
    out.push(clean);
    if (out.length >= max) break;
  }
  return out;
}

function creativeDirectionLine(promptText: string): string | null {
  const match = /Creative direction:\s*([^.]+\.?)/i.exec(promptText);
  return match?.[1]?.replace(/\s+/g, ' ').trim() || null;
}

/** Shared industry/form cues from prompt text (max a few). */
export function extractSharedFormCues(promptText: string): string[] {
  const cues: string[] = [];
  const primary = /primary cue\s*[—:-]\s*([^.;]+)/i.exec(promptText);
  if (primary?.[1]?.trim()) cues.push(primary[1].trim());

  const text = promptText.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/pixel|chip grid|modular geometric|modular tile/, 'Modular geometry'],
    [/data stream|signal path|exchange-path|stream curves/, 'Flow / path curves'],
    [/shield|secure aperture|vault/, 'Trust / enclosure geometry'],
    [/ledger|pillar|column|balance bar/, 'Stability geometry'],
    [/swiss|international typographic/, 'Swiss / International Style'],
    [/black and white|monochrome/, 'Strict black & white'],
    [/no shadows|flat vector|no gradients/, 'Flat vector, no effects'],
  ];
  for (const [re, label] of rules) {
    if (re.test(text) && !cues.includes(label)) cues.push(label);
  }
  return cues.slice(0, 3);
}

/** @deprecated use extractSharedFormCues / buildDirectionAnchors */
export function extractDirectionCues(promptText: string): string[] {
  return extractSharedFormCues(promptText);
}

/**
 * Per-direction anchors — territory/axis first, then a light shared form language.
 * Avoids identical cue lists across Primary / Construction / Typography.
 */
export function buildDirectionAnchors(
  prompt: ComposedPrompt,
  territory: CreativeTerritory | null,
  locale: 'en' | 'ru',
): string[] {
  const isRu = locale === 'ru';
  const id = territory?.id;
  const focus: string[] = [];

  if (id === 'territory-construction') {
    focus.push(
      isRu ? 'Сетка как герой системы' : 'Grid as hero system',
      territory?.constructionFocus
        ? isRu
          ? `Конструкция: ${territory.constructionFocus}`
          : `Construction: ${territory.constructionFocus}`
        : isRu
          ? 'Модульная геометрия'
          : 'Modular geometry',
      isRu ? 'Типографика подчинена сетке' : 'Typography subordinate to grid',
    );
  } else if (id === 'territory-typography') {
    focus.push(
      isRu ? 'Кастомные буквоформы' : 'Custom letterforms',
      territory?.typographyFocus
        ? isRu
          ? `Типографика: ${territory.typographyFocus}`
          : `Typography: ${territory.typographyFocus}`
        : isRu
          ? 'Модифицированный глиф'
          : 'Modified distinctive glyph',
      isRu ? 'Знак вторичен к wordmark' : 'Symbol secondary to wordmark',
    );
  } else {
    focus.push(
      isRu ? 'Единый combination lockup' : 'Unified combination lockup',
      territory?.markArchitecture
        ? territory.markArchitecture.replace(/\s+/g, ' ').trim().slice(0, 72)
        : isRu
          ? 'Символ и wordmark в одной геометрии'
          : 'Symbol and wordmark share one geometry',
      isRu ? 'Оптический баланс lockup' : 'Optically balanced lockup',
    );
  }

  const creative = creativeDirectionLine(prompt.text);
  if (creative) {
    const short = creative.replace(/^—\s*/, '').slice(0, 64);
    if (short.length > 12) focus.push(short);
  }

  const shared = extractSharedFormCues(prompt.text).slice(0, 2);
  return uniqueLabels([...focus, ...shared], 5);
}

export function derivePrinciples(
  prompt: ComposedPrompt,
  territory: CreativeTerritory | null,
  cues: string[],
): Array<{ id: string; name: string }> {
  const fromKb = (prompt.selectedPrinciples ?? []).map((p) => ({
    id: p.id,
    name: p.name,
  }));
  if (fromKb.length > 0) return fromKb.slice(0, 6);

  const names: string[] = [];
  if (territory?.constructionFocus) {
    names.push(
      territory.constructionFocus.length > 48
        ? territory.constructionFocus.slice(0, 45) + '…'
        : territory.constructionFocus,
    );
  }
  if (territory?.typographyFocus) {
    names.push(
      territory.typographyFocus.length > 48
        ? territory.typographyFocus.slice(0, 45) + '…'
        : territory.typographyFocus,
    );
  }
  for (const g of prompt.dna?.geometry ?? []) {
    if (g) names.push(g);
  }
  for (const c of prompt.dna?.construction ?? []) {
    if (c) names.push(c);
  }
  for (const cue of cues) names.push(cue);

  return uniqueLabels(names, 5).map((name, i) => ({
    id: `derived-${prompt.id?.slice(0, 8) || 'dir'}-${i}`,
    name,
  }));
}

export function resolveComplexity(
  brief: DesignBrief,
  prompts: ComposedPrompt[],
): string {
  if (brief.complexity?.trim()) return brief.complexity.trim();
  const fromDna = prompts.map((p) => p.dna?.complexity?.trim()).find(Boolean);
  if (fromDna) return fromDna;
  const text = prompts.map((p) => p.text).join(' ').toLowerCase();
  if (/ultra minimal|minimal complexity|simple forms/.test(text)) return 'minimal';
  if (/high complexity|rich detail|ornament/.test(text)) return 'high';
  if (/medium complexity|moderate/.test(text)) return 'medium';
  return 'minimal';
}

export function isStubReasoning(value?: string | null): boolean {
  if (!value?.trim()) return true;
  return STUB_REASONING.test(value.trim());
}

export function resolveDirectionReasoning(
  prompt: ComposedPrompt,
  territory: CreativeTerritory | null,
  locale: 'en' | 'ru',
): string {
  const meta = prompt.metadata;
  const candidates = [
    meta?.reasoning,
    meta?.creativeTerritory?.thesis,
    territory?.thesis,
    meta?.brainArchitecture?.designStrategy?.reasoning,
    meta?.brainArchitecture?.designStrategy?.symbolLogic,
  ]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v) && !isStubReasoning(v))
    .map(repairGluedProse);

  if (candidates[0]) {
    // Prefer first candidate, but if it's a single glued blob, still repaired.
    // Merge thesis + symbol only when first is short.
    if (candidates[0].length < 80 && candidates[1]) {
      return joinSentences(candidates[0], candidates[1]);
    }
    return candidates[0];
  }

  const cues = buildDirectionAnchors(prompt, territory, locale);
  const mark = meta?.markType || 'mark';
  const era = meta?.era || 'modernist';
  if (locale === 'ru') {
    return joinSentences(
      territory?.name ? `Территория «${territory.name}»` : null,
      `Направление ${mark} (${era})`,
      cues.length ? `Опоры: ${cues.slice(0, 3).join('; ')}` : null,
      `Качество направления: ${(prompt.scores?.promptQuality ?? 0).toFixed(1)}/10`,
    );
  }
  return joinSentences(
    territory?.name ? `${territory.name} territory` : null,
    `${mark} direction in a ${era} register`,
    cues.length ? `Anchors: ${cues.slice(0, 3).join('; ')}` : null,
    `Direction quality ${(prompt.scores?.promptQuality ?? 0).toFixed(1)}/10`,
  );
}

function critiqueFromScores(prompt: ComposedPrompt): DesignCriticResult {
  const s = prompt.scores;
  const modernity = s?.modernismScore ?? 6;
  const simplicity = s?.minimalismScore ?? 6;
  const scalability = s?.scalabilityScore ?? 6;
  const recognizability = s?.brandRecognitionScore ?? 6;
  const balance = s?.cohesionScore ?? 6;
  const overall =
    s?.promptQuality ??
    (modernity + simplicity + scalability + recognizability + balance) / 5;

  return {
    recognizability,
    scalability,
    balance,
    contrast: s?.geometryScore ?? 6,
    simplicity,
    modernity,
    registrability: Math.min(10, (recognizability + simplicity) / 2),
    overallScore: overall,
    feedback: [
      `Prompt quality ${overall.toFixed(1)}/10`,
      `Modernism ${modernity.toFixed(1)} · Minimalism ${simplicity.toFixed(1)} · Scale ${scalability.toFixed(1)}`,
    ],
  };
}

export function resolveCritique(
  prompt: ComposedPrompt,
  partner: BrainPartnerState | null,
): DesignCriticResult | null {
  return (
    partner?.critique ??
    prompt.metadata?.partnerCritique ??
    (prompt.scores ? critiqueFromScores(prompt) : null)
  );
}

export function enrichPack(input: {
  companyName: string;
  industry: string;
  designBrief: DesignBrief;
  prompts: ComposedPrompt[];
  brainPartner: BrainPartnerState | null;
  locale: 'en' | 'ru';
}): EnrichedPack {
  const territory = selectedTerritory(input.brainPartner);
  const complexity = resolveComplexity(input.designBrief, input.prompts);
  const designBrief: DesignBrief = {
    ...input.designBrief,
    complexity,
  };

  const directions = input.prompts.map((prompt, index) => {
    const dirTerritory = resolveTerritory(prompt, input.brainPartner);
    const cues = buildDirectionAnchors(prompt, dirTerritory, input.locale);
    const principles = derivePrinciples(prompt, dirTerritory, cues);
    return {
      rank: index + 1,
      prompt,
      territory: dirTerritory
        ? {
            ...dirTerritory,
            thesis: repairGluedProse(dirTerritory.thesis),
          }
        : null,
      reasoning: resolveDirectionReasoning(prompt, dirTerritory, input.locale),
      principles,
      cues,
      critique: resolveCritique(prompt, input.brainPartner),
      imageFiles: [],
      hasRaster: (prompt.logos?.length ?? 0) > 0,
    };
  });

  return {
    companyName: input.companyName,
    industry: input.industry,
    designBrief,
    brainPartner: input.brainPartner,
    locale: input.locale,
    directions,
    packCritique:
      input.brainPartner?.critique ??
      directions[0]?.critique ??
      null,
    selectedTerritory: territory
      ? { ...territory, thesis: repairGluedProse(territory.thesis) }
      : null,
  };
}
