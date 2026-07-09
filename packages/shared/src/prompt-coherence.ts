import type { LogoMarkType } from './types';
import type { AbstractionLevel } from './client-visual-intent';
import { exactBrandSpellingFragment, normalizeBrandName } from './brand-text';
import { ensureModernistFormLanguage, sanitizeLiteralIndustryLanguage, buildAbstractIndustryFragment } from './industry-form-language';

export interface PolishPromptOptions {
  clientNotes?: string;
  companyName?: string;
  markType?: LogoMarkType;
  colorPalette?: string;
  abstractionLevel?: AbstractionLevel;
  /** Reserve headroom for image-model enhancer suffixes (OpenAI hard limit is 4000). */
  maxLength?: number;
}

const DEFAULT_MAX_LENGTH = 3200;

const MONOCHROME_PALETTES = new Set(['black_white', 'monochrome']);

const MONOCHROME_SIGNALS =
  /\b(?:monochrome|black and white|black on white|single color|one-?color|strict black and white|no gradients)\b/i;

const COLOR_CONFLICT_PATTERNS = [
  /\bNeoplasticism primary colors\b/gi,
  /\bprimary colors?\b/gi,
  /\bcontrolled multi-?color\b/gi,
  /\btwo-?color system\b/gi,
];

const ACCENT_COLOR_PATTERNS = [
  /\bteal accent color\b/gi,
  /\bgreen accent color\b/gi,
  /\bcorporate blue(?:-led palette)?\b/gi,
  /\bred accent\b/gi,
  /\bwarm palette\b/gi,
  /\bcolor:\s*teal[^.]*\./gi,
  /\bcolor:\s*green[^.]*\./gi,
  /\bunified additive forms\b/gi,
  /\bmulti-?color\b/gi,
];

const TYPOGRAPHY_SANS_SIGNALS =
  /\b(?:neo-?grotesque|geometric sans|Helvetica|sans-serif|grotesque sans)\b/i;

const TYPOGRAPHY_CONFLICT_PATTERNS = [
  /\bclassic serif letterforms\b/gi,
  /\bslab serif letterforms\b/gi,
  /\bserif letterforms\b/gi,
  /\btraditional serif\b/gi,
];

const CONSTRUCTION_AXIS_PATTERNS: Array<{ pattern: RegExp; family: string; score: number }> = [
  { pattern: /\bbaseline grid\b/gi, family: 'baseline', score: 10 },
  { pattern: /\b8px baseline\b/gi, family: 'baseline', score: 9 },
  { pattern: /\bradial (?:construction|grid)\b/gi, family: 'radial', score: 9 },
  { pattern: /\binterlac(?:ed|ing)? weave\b/gi, family: 'weave', score: 8 },
  { pattern: /\bellipse construction\b/gi, family: 'radial', score: 8 },
  { pattern: /\b45[- ]?degree\b/gi, family: 'diagonal', score: 4 },
  { pattern: /\bdiagonal construction\b/gi, family: 'diagonal', score: 4 },
  { pattern: /\bisometric\b/gi, family: 'isometric', score: 3 },
  { pattern: /\b30[- ]?degree\b/gi, family: 'isometric', score: 3 },
];

const PIPELINE_METADATA_PATTERNS = [
  /\bPrompt ID:\s*[a-f0-9-]+\b/gi,
  /\bStyle preferences:\s*\{[^}]+\}\b/gi,
  /\bCompany:\s*[^.]+(?=\s+Industry:)/gi,
  /\bIndustry:\s*[^.]+(?=\s+Prompt ID:)/gi,
  /\bSymbol explores:\s*abstract geometry,\s*stylized industry cue\b/gi,
  /\bat recognizable abstraction\b/gi,
];

const REPEATED_PHRASE_PATTERNS = [
  /\bit must be recognizable and understandable\b/gi,
  /\bstrong silhouette readable at small sizes\b/gi,
  /\bscalable from small labels to large signage\b/gi,
];

const INTERVIEW_NOTES_BOILERPLATE = [
  /^abstract geometry only\.?$/i,
  /^stylized industry cue\.?$/i,
  /^open to designer interpretation\.?$/i,
  /^wordmark$/i,
  /^lettermark$/i,
  /^combination$/i,
];

const FLAT_CONFLICT_PATTERNS = [
  /\bflat pseudo-perspective\b/gi,
  /\bpseudo-?3d\b/gi,
  /\bpseudo-?perspective\b/gi,
];

const COLOR_PALETTE_FRAGMENT = 'Color palette: strict black and white only';

const IRRELEVANT_WHEN_BRAND_TEXT = [
  /\bnumeric digit mark\b/gi,
  /\bcapsule pill form\b/gi,
];

const GEOMETRY_LIST_BOILERPLATE =
  /\bThe design should incorporate a combination of geometric shapes including[^.]+\./gi;

const GEOMETRY_ANCHOR_PHRASE =
  'Anchor geometry: round focal construction, quarter-circle arcs, interlaced circular weave';

const GEOMETRY_SCORE_RULES: Array<{ pattern: RegExp; score: number }> = [
  { pattern: /round focal|circle construction|organic round|ellipse/i, score: 10 },
  { pattern: /quarter.?circle|quarter arc|radial/i, score: 9 },
  { pattern: /interlac|weave|interlock/i, score: 9 },
  { pattern: /negative space/i, score: 7 },
  { pattern: /triangle|square|angular/i, score: 4 },
  { pattern: /hexagon|hexagonal|blob|capsule|pill|chevron|numeric/i, score: -3 },
];

const LOW_PRIORITY_BOILERPLATE = [
  /\bPremium professional branding\b/gi,
  /\bTimeless modernist aesthetic\b/gi,
  /\btrademark-ready distinctiveness\b/gi,
  /\binfinitely scalable\b/gi,
];

function splitAvoidSection(text: string): { body: string; avoidSuffix: string } {
  const idx = text.search(/\bAvoid:\s*/i);
  if (idx === -1) {
    return { body: text.trim(), avoidSuffix: '' };
  }
  return {
    body: text.slice(0, idx).trim(),
    avoidSuffix: text.slice(idx).trim(),
  };
}

function scoreGeometryItem(item: string): number {
  return GEOMETRY_SCORE_RULES.reduce(
    (sum, rule) => (rule.pattern.test(item) ? sum + rule.score : sum),
    0,
  );
}

function consolidateLabeledSection(body: string, label: string, maxItems: number): string {
  const regex = new RegExp(`\\b${label}:\\s*([^.]+)\\.`, 'i');
  const match = body.match(regex);
  if (!match?.[1]) return body;

  const items = match[1]
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (items.length <= maxItems) return body;

  const kept = [...items]
    .sort((a, b) => scoreGeometryItem(b) - scoreGeometryItem(a))
    .slice(0, maxItems);

  return body.replace(regex, `${label}: ${kept.join(', ')}.`);
}

const LITERAL_INDUSTRY_HINT_FRAGMENT =
  /\b(?:pizza slice|food clipart|pizza icon|brick[- ]?oven|oven arch|open flame|flame shape|pepperoni|cheese drip|utensil icons?)\b/i;

function isLiteralIndustryHintPart(part: string): boolean {
  const lower = part.trim().toLowerCase();
  if (!lower || /^never literal\b/.test(lower)) return false;
  return LITERAL_INDUSTRY_HINT_FRAGMENT.test(lower);
}

function sanitizeIndustryHintBlock(body: string): string {
  return body.replace(
    /Industry hint for ([^:]+):\s*([^.]+)\./gi,
    (_full, industry: string, content: string) => {
      const parts = content
        .split(/,|—/)
        .map((part) => part.trim())
        .filter(Boolean)
        .filter((part) => !isLiteralIndustryHintPart(part));

      if (parts.length === 0) {
        return `${buildAbstractIndustryFragment(industry.trim())}.`;
      }

      return `Industry hint for ${industry.trim()}: ${parts.join(', ')}.`;
    },
  );
}

function isMonochromePrompt(body: string, colorPalette?: string): boolean {
  if (colorPalette && MONOCHROME_PALETTES.has(colorPalette)) return true;
  return MONOCHROME_SIGNALS.test(body);
}

function resolveColorContradictions(body: string, colorPalette?: string): string {
  if (!isMonochromePrompt(body, colorPalette)) return body;

  let result = body;
  for (const pattern of [...COLOR_CONFLICT_PATTERNS, ...ACCENT_COLOR_PATTERNS]) {
    result = result.replace(pattern, '').replace(/\s+,/g, ',');
  }

  return result
    .replace(/\bColor:\s*teal[^.]*\./gi, '')
    .replace(/\bColor:\s*green[^.]*\./gi, '')
    .replace(/\bColor:\s*,/gi, '')
    .replace(/\bColor:\s*\./gi, '')
    .replace(/De Stijl neoplastic influence\.\s*Neoplasticism primary colors/gi, 'De Stijl geometric influence')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function resolveTypographyContradictions(body: string): string {
  if (!TYPOGRAPHY_SANS_SIGNALS.test(body)) return body;

  let result = body;
  for (const pattern of TYPOGRAPHY_CONFLICT_PATTERNS) {
    result = result.replace(pattern, '');
  }

  return result.replace(/,\s*,+/g, ', ').replace(/\s{2,}/g, ' ').trim();
}

function consolidateConstructionAxis(body: string): string {
  const families = new Map<string, number>();

  for (const axis of CONSTRUCTION_AXIS_PATTERNS) {
    if (axis.pattern.test(body)) {
      families.set(axis.family, (families.get(axis.family) ?? 0) + axis.score);
    }
  }

  if (families.size <= 1) return body;

  const winner = [...families.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!winner) return body;

  let result = body;
  for (const axis of CONSTRUCTION_AXIS_PATTERNS) {
    if (axis.family !== winner) {
      result = result.replace(axis.pattern, '');
    }
  }

  return result
    .replace(/Construction:\s*,/gi, 'Construction:')
    .replace(/,\s*,+/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function resolveAbstractionLanguage(body: string, abstractionLevel?: AbstractionLevel): string {
  if (abstractionLevel === 'recognizable') return body;

  let result = body;
  for (const pattern of [
    /\bat recognizable abstraction\b/gi,
    /\brecognizable and understandable\b/gi,
    /\brecognizable abstraction\b/gi,
  ]) {
    result = result.replace(pattern, '');
  }

  if (abstractionLevel === 'abstract') {
    result = result.replace(/\bstylized industry cue\b/gi, 'abstract form language');
  }

  return result.replace(/\s{2,}/g, ' ').trim();
}

function resolveMarkTypeConflicts(body: string): string {
  return body
    .replace(/\bemblem badge format\b/gi, 'vertical combination lockup')
    .replace(/\bbadge-style enclosed mark\b/gi, 'unified symbol-and-wordmark lockup')
    .trim();
}

function stripPipelineMetadata(body: string): string {
  let result = body;
  for (const pattern of PIPELINE_METADATA_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.replace(/\s{2,}/g, ' ').trim();
}

function dedupeRepeatedPhrases(body: string): string {
  let result = body;
  for (const pattern of REPEATED_PHRASE_PATTERNS) {
    let seen = false;
    result = result.replace(pattern, (match) => {
      if (seen) return '';
      seen = true;
      return match;
    });
  }
  return result.replace(/\s{2,}/g, ' ').trim();
}

function stripClientPreferencesFromBody(body: string): string {
  return body
    .replace(/\s*Client preferences:[^.]+\./gi, '')
    .replace(/\s*Client preferences:[^.,]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function sanitizeClientNotesForPrompt(notes: string): string {
  const trimmed = notes.trim().replace(/\.+$/, '');
  if (!trimmed) return '';

  const clauses = trimmed
    .split(/\.\s+/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0 && !INTERVIEW_NOTES_BOILERPLATE.some((p) => p.test(clause)));

  return clauses.join('. ').trim();
}

function resolveFlatContradictions(body: string): string {
  const wantsFlat =
    /\bflat vector\b/i.test(body) ||
    /\bno shadows?\b/i.test(body) ||
    /\bno depth effects?\b/i.test(body);

  if (!wantsFlat) return body;

  let result = body;
  for (const pattern of FLAT_CONFLICT_PATTERNS) {
    result = result.replace(pattern, '');
  }

  return result.replace(/\s{2,}/g, ' ').trim();
}

function dedupeExactFragment(text: string, fragment: string): string {
  const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'gi');
  const matches = text.match(regex);
  if (!matches || matches.length <= 1) return text;

  let seen = false;
  return text.replace(regex, (match) => {
    if (seen) return '';
    seen = true;
    return match;
  });
}

function dedupeRepeatedFragments(text: string): string {
  let result = dedupeExactFragment(text, COLOR_PALETTE_FRAGMENT);
  result = result
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,+/g, ', ')
    .replace(/(?:\.\s*){2,}/g, '.')
    .trim();
  return result;
}

function polishTailSection(tail: string, options: PolishPromptOptions): string {
  if (!tail.trim()) return '';

  let result = sanitizeIndustryHintBlock(tail);
  result = resolveColorContradictions(result, options.colorPalette);
  result = resolveFlatContradictions(result);
  result = dedupeRepeatedFragments(result);

  return result.trim();
}

function removeIrrelevantFragments(body: string, options: PolishPromptOptions): string {
  let result = body;
  const hasBrandText = Boolean(normalizeBrandName(options.companyName));

  if (hasBrandText) {
    for (const pattern of IRRELEVANT_WHEN_BRAND_TEXT) {
      result = result.replace(pattern, '');
    }
  }

  result = result.replace(GEOMETRY_LIST_BOILERPLATE, GEOMETRY_ANCHOR_PHRASE);

  return result.replace(/\s*,\s*,+/g, ', ').replace(/\s{2,}/g, ' ').trim();
}

function consolidateGeometrySections(body: string): string {
  let result = consolidateLabeledSection(body, 'Geometry', 3);
  result = consolidateLabeledSection(result, 'Construction', 2);
  result = consolidateLabeledSection(result, 'Composition', 2);
  result = consolidateLabeledSection(result, 'Complexity', 2);
  result = consolidateLabeledSection(result, 'Era', 1);
  return result;
}

function dedupeArtDirection(body: string): string {
  const marker = 'Art direction:';
  const first = body.indexOf(marker);
  if (first === -1) return body;

  const second = body.indexOf(marker, first + marker.length);
  if (second === -1) return body;

  const beforeSecond = body.slice(0, second).trim();
  const afterSecond = body.slice(second);
  const endOfBlock = afterSecond.indexOf('.');
  const rest = endOfBlock === -1 ? '' : afterSecond.slice(endOfBlock + 1).trim();
  return [beforeSecond, rest].filter(Boolean).join(' ').trim();
}

function hasSpellingConstraint(body: string, brandName: string): boolean {
  const lower = body.toLowerCase();
  const brandLower = brandName.toLowerCase();
  return (
    lower.includes('letter-for-letter') ||
    lower.includes('read exactly') ||
    lower.includes('spell exactly') ||
    (lower.includes(`"${brandLower}"`) && lower.includes('exact'))
  );
}

export function ensureBrandSpellingConstraint(
  body: string,
  companyName?: string,
  markType?: LogoMarkType,
): string {
  const brandName = normalizeBrandName(companyName);
  if (!brandName || hasSpellingConstraint(body, brandName)) return body;

  const fragment = exactBrandSpellingFragment(brandName, markType);
  const firstDot = body.indexOf('.');
  if (firstDot === -1) return `${body}. ${fragment}`;

  return `${body.slice(0, firstDot + 1)} ${fragment}. ${body.slice(firstDot + 1).trim()}`.trim();
}

function trimToMaxLength(body: string, avoidSuffix: string, maxLength: number): string {
  let combined = avoidSuffix ? `${body} ${avoidSuffix}` : body;
  if (combined.length <= maxLength) return combined;

  let trimmedBody = dedupeArtDirection(body);
  for (const pattern of LOW_PRIORITY_BOILERPLATE) {
    trimmedBody = trimmedBody.replace(pattern, '');
  }

  trimmedBody = consolidateLabeledSection(trimmedBody, 'Geometry', 2);
  trimmedBody = consolidateLabeledSection(trimmedBody, 'Construction', 1);
  trimmedBody = consolidateLabeledSection(trimmedBody, 'Composition', 1);

  combined = avoidSuffix ? `${trimmedBody} ${avoidSuffix}` : trimmedBody;
  if (combined.length <= maxLength) return combined.replace(/\s{2,}/g, ' ').trim();

  const sentences = trimmedBody
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const protectedIndexes = new Set<number>();
  sentences.forEach((sentence, index) => {
    if (
      /brand name must read exactly|Industry hint for|wordmark for|for "/i.test(sentence) ||
      /International Typographic Style|Anchor geometry/i.test(sentence)
    ) {
      protectedIndexes.add(index);
    }
  });

  const kept: string[] = [];
  let length = avoidSuffix.length + (avoidSuffix ? 1 : 0);

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]!;
    const nextLength = length + sentence.length + (kept.length > 0 ? 1 : 0);
    if (protectedIndexes.has(i) || nextLength <= maxLength) {
      kept.push(sentence);
      length = nextLength;
    }
  }

  trimmedBody = kept.join(' ').replace(/\s{2,}/g, ' ').trim();
  return avoidSuffix ? `${trimmedBody} ${avoidSuffix}`.trim() : trimmedBody;
}

function truncateClientNotes(notes: string, maxChars = 220): string {
  const trimmed = notes.trim().replace(/\.+$/, '');
  if (trimmed.length <= maxChars) return trimmed;

  const clauseBoundary = trimmed.lastIndexOf('.', maxChars);
  if (clauseBoundary > maxChars * 0.5) {
    return trimmed.slice(0, clauseBoundary).trim();
  }

  return `${trimmed.slice(0, maxChars - 3).trim()}...`;
}

export function polishLogoPrompt(text: string, options: PolishPromptOptions = {}): string {
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
  const { body: rawBody, avoidSuffix } = splitAvoidSection(text);

  let body = stripPipelineMetadata(rawBody);
  body = sanitizeLiteralIndustryLanguage(body);
  body = resolveColorContradictions(body, options.colorPalette);
  body = resolveTypographyContradictions(body);
  body = consolidateConstructionAxis(body);
  body = resolveAbstractionLanguage(body, options.abstractionLevel);
  body = resolveMarkTypeConflicts(body);
  body = resolveFlatContradictions(body);
  body = removeIrrelevantFragments(body, options);
  body = sanitizeIndustryHintBlock(body);
  body = consolidateGeometrySections(body);
  body = dedupeRepeatedPhrases(body);
  body = ensureModernistFormLanguage(body);
  body = ensureBrandSpellingConstraint(body, options.companyName, options.markType);
  body = dedupeArtDirection(body);
  body = stripClientPreferencesFromBody(body);

  let tail = polishTailSection(avoidSuffix, options);
  let combined = dedupeRepeatedFragments(tail ? `${body} ${tail}`.trim() : body);

  combined = combined
    .replace(/(?:\.\s*){2,}/g, '.')
    .replace(/\.([A-Za-z])/g, '. $1')
    .replace(/,\s*,+/g, ', ')
    .replace(/\s+,/g, ',')
    .replace(/([^\s.])\s+Avoid:/i, '$1. Avoid:')
    .trim();

  if (isMonochromePrompt(combined, options.colorPalette) && !combined.includes(COLOR_PALETTE_FRAGMENT)) {
    const avoidIdx = combined.search(/\bAvoid:\s*/i);
    if (avoidIdx > 0) {
      combined = `${combined.slice(0, avoidIdx).trim()}. ${COLOR_PALETTE_FRAGMENT}. ${combined.slice(avoidIdx)}`;
    } else {
      combined = `${combined.replace(/\.\s*$/, '')}. ${COLOR_PALETTE_FRAGMENT}.`;
    }
    combined = dedupeRepeatedFragments(combined);
  }

  const { body: finalBody, avoidSuffix: finalAvoid } = splitAvoidSection(combined);
  return trimToMaxLength(finalBody, finalAvoid, maxLength);
}

export function finalizeLogoPromptText(
  text: string,
  options?: string | PolishPromptOptions,
): string {
  const opts: PolishPromptOptions =
    typeof options === 'string' ? { clientNotes: options } : (options ?? {});

  const polished = polishLogoPrompt(text, {
    companyName: opts.companyName,
    markType: opts.markType,
    colorPalette: opts.colorPalette,
    abstractionLevel: opts.abstractionLevel,
    maxLength: opts.maxLength,
  });

  if (!opts.clientNotes?.trim()) return polished;

  const sanitizedNotes = sanitizeLiteralIndustryLanguage(
    sanitizeClientNotesForPrompt(truncateClientNotes(opts.clientNotes)),
  );
  const fragment = `Client preferences: ${sanitizedNotes.replace(/\.+$/, '')}`;
  const cleanBody = polished.replace(/\.\s*$/, '').trim();
  if (!cleanBody) return `${fragment}.`;

  const lowerBody = cleanBody.toLowerCase();
  const lowerNotes = sanitizedNotes.toLowerCase();
  if (lowerBody.includes(lowerNotes.slice(0, Math.min(lowerNotes.length, 48)))) {
    return cleanBody.endsWith('.') ? cleanBody : `${cleanBody}.`;
  }

  const combined = `${cleanBody}. ${fragment}.`;
  if (combined.length <= (opts.maxLength ?? DEFAULT_MAX_LENGTH)) return combined;

  const notesBudget = Math.min(180, sanitizedNotes.length);
  const shorterNotes = truncateClientNotes(sanitizedNotes, notesBudget);
  const shorterFragment = `Client preferences: ${shorterNotes.replace(/\.+$/, '')}`;
  return polishLogoPrompt(`${cleanBody}. ${shorterFragment}.`, {
    companyName: opts.companyName,
    markType: opts.markType,
    colorPalette: opts.colorPalette,
    abstractionLevel: opts.abstractionLevel,
    maxLength: opts.maxLength,
  });
}
