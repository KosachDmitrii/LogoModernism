import type { DesignRule, StyleOverrideOptions } from '@logo-platform/shared';
import {
  sanitizeLiteralIndustryLanguage,
  ensureModernistFormLanguage,
} from '@logo-platform/shared';

const CONTRADICTIONS: [RegExp, RegExp][] = [
  [/single color/i, /two.?color/i],
  [/no gradients?/i, /(?<!no\s)gradients?/i],
  [/minimal complexity/i, /dense/i],
  [/minimal complexity/i, /medium complexity/i],
  [/no shadows/i, /(?<!no\s)shadows?/i],
  [/outline only/i, /solid fill/i],
  [/asymmetric/i, /perfect symmetry/i],
  [/strict black and white/i, /reversed light on dark/i],
  [/black and white only/i, /light on dark/i],
];

const POSITIVE_SYMMETRY_PHRASES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bperfect optical symmetry\b/gi, replacement: '' },
  { pattern: /\bperfect symmetry\b/gi, replacement: '' },
  { pattern: /\bsymmetrical appearance\b/gi, replacement: 'balanced appearance' },
  { pattern: /\bensuring a minimalist and symmetrical\b/gi, replacement: 'ensuring a minimalist balanced' },
  { pattern: /\bfor balance and symmetry\b/gi, replacement: 'for balance' },
];

const AVOID_BODY_REDUNDANCY: Array<{ avoid: RegExp; body: RegExp }> = [
  { avoid: /gradients?/i, body: /\b(?:no|avoiding)\b[^.]*\bgradients?\b/i },
  { avoid: /shadows?/i, body: /\b(?:no|avoiding)\b[^.]*\bshadows?\b/i },
  { avoid: /photorealism/i, body: /\bno photoreal/i },
  { avoid: /^flat vector$/i, body: /\bflat vector\b/i },
];

const FILLER_PHRASES = [
  /\bvery\b/gi,
  /\breally\b/gi,
  /\bquite\b/gi,
  /\bextremely\b/gi,
  /\bbeautiful\b/gi,
  /\bstunning\b/gi,
  /\bamazing\b/gi,
];

const STRENGTHENERS: { test: RegExp; phrase: string }[] = [
  { test: /\bflat vector\b/i, phrase: 'no gradients, no shadows' },
  { test: /\bnegative space\b/i, phrase: 'clever meaningful negative space' },
  { test: /\bsymmetry\b/i, phrase: 'perfect optical symmetry' },
  { test: /\bswiss\b/i, phrase: 'Swiss International Style' },
  { test: /\bcorporate\b/i, phrase: 'timeless corporate identity' },
];

const TOKEN_STOP_WORDS = new Set([
  'built',
  'from',
  'with',
  'that',
  'this',
  'only',
  'pure',
  'very',
  'into',
  'using',
  'based',
]);

export function normalizeClauseKey(clause: string): string {
  return clause
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function significantTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !TOKEN_STOP_WORDS.has(word)),
  );
}

export function clauseOverlaps(a: string, b: string): boolean {
  const left = normalizeClauseKey(a);
  const right = normalizeClauseKey(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length > 8 && right.length > 8 && (left.includes(right) || right.includes(left))) {
    return true;
  }

  const tokensA = significantTokens(a);
  const tokensB = significantTokens(b);
  if (tokensA.size === 0 || tokensB.size === 0) return false;

  let shared = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) shared++;
  }

  return shared / Math.min(tokensA.size, tokensB.size) >= 0.65;
}

export function splitPromptSections(text: string): { body: string; avoidItems: string[] } {
  const idx = text.search(/\bAvoid:\s*/i);
  if (idx === -1) {
    return { body: text.trim(), avoidItems: [] };
  }

  const body = text.slice(0, idx).trim().replace(/\.\s*$/, '');
  const avoidPart = text
    .slice(idx)
    .replace(/^Avoid:\s*/i, '')
    .replace(/\.\s*$/, '');
  const avoidItems = avoidPart
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return { body, avoidItems };
}

export function joinPromptSections(body: string, avoidItems: string[]): string {
  const cleanBody = body.trim().replace(/\.\s*$/, '');
  if (avoidItems.length === 0) return cleanBody;
  return `${cleanBody}. Avoid: ${avoidItems.join(', ')}`;
}

export function appendAntiPatterns(text: string, antiPatterns: string[]): string {
  if (antiPatterns.length === 0) return text;
  const { body, avoidItems } = splitPromptSections(text);
  return joinPromptSections(body, mergeAvoidItems(avoidItems, antiPatterns));
}

function mergeAvoidItems(existing: string[], incoming: string[]): string[] {
  const merged = [...existing];
  for (const item of incoming) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (merged.some((existingItem) => clauseOverlaps(existingItem, trimmed))) continue;
    merged.push(trimmed);
  }
  return merged;
}

function dedupeAvoidItems(items: string[]): string[] {
  const unique: string[] = [];
  for (const item of items) {
    if (unique.some((existing) => clauseOverlaps(existing, item))) continue;
    unique.push(item);
  }
  return unique;
}

function avoidsOpticalSymmetry(avoidItems: string[]): boolean {
  return avoidItems.some((item) => /(?:perfect\s+)?optical symmetry/i.test(item));
}

function filterAvoidRedundantWithBody(body: string, avoidItems: string[]): string[] {
  return avoidItems.filter((item) => {
    const match = AVOID_BODY_REDUNDANCY.find(({ avoid }) => avoid.test(item));
    if (!match) return true;
    return !match.body.test(body);
  });
}

function reconcileSymmetry(
  body: string,
  avoidItems: string[],
): { body: string; avoidItems: string[] } {
  if (!avoidsOpticalSymmetry(avoidItems)) {
    return { body, avoidItems };
  }

  let cleaned = body;
  for (const { pattern, replacement } of POSITIVE_SYMMETRY_PHRASES) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  cleaned = cleaned
    .replace(/\band\s+symmetry\b/gi, '')
    .replace(/,\s*,+/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();

  return { body: cleaned, avoidItems };
}

export function optimizePrompt(
  text: string,
  principles: DesignRule[],
  options: StyleOverrideOptions = {},
): string {
  let { body, avoidItems } = splitPromptSections(text);

  body = sanitizeLiteralIndustryLanguage(body);
  body = ensureModernistFormLanguage(body);
  body = applyStyleOverrides(body, options);
  avoidItems = filterAvoidItemsForStyleOverrides(avoidItems, options);
  body = removeDuplicates(body);
  body = removeContradictions(body);
  body = removeFiller(body);
  body = strengthenPrompt(body, avoidItems, options);
  body = enforceRestrictions(body, principles, options);
  body = collapseRepeatedWords(body);

  avoidItems = dedupeAvoidItems(avoidItems);
  avoidItems = filterAvoidItemsForStyleOverrides(avoidItems, options);
  avoidItems = filterAvoidRedundantWithBody(body, avoidItems);
  ({ body, avoidItems } = reconcileSymmetry(body, avoidItems));

  let result = joinPromptSections(body, avoidItems);
  result = normalizePunctuation(result);
  return result;
}

function splitClauses(text: string): string[] {
  return text
    .split(/(?<=\.)\s+|,\s+/)
    .map((clause) => clause.trim().replace(/\.+$/, ''))
    .filter(Boolean);
}

function dedupeClauses(text: string): string {
  const unique: string[] = [];

  for (const clause of splitClauses(text)) {
    if (unique.some((existing) => clauseOverlaps(existing, clause))) continue;
    unique.push(clause);
  }

  return unique.join(', ');
}

function removeDuplicates(text: string): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const unique: string[] = [];

  for (const sentence of sentences) {
    const dedupedSentence = dedupeClauses(sentence);
    if (!dedupedSentence) continue;
    if (unique.some((existing) => clauseOverlaps(existing, dedupedSentence))) continue;
    unique.push(dedupedSentence);
  }

  return unique.join('. ');
}

function removeContradictions(text: string): string {
  let result = text;
  for (const [a, b] of CONTRADICTIONS) {
    if (a.test(result) && b.test(result)) {
      result = result
        .replace(new RegExp(`(?<!no\\s)${b.source}`, b.flags), '')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
  return result;
}

function removeFiller(text: string): string {
  let result = text;
  for (const pattern of FILLER_PHRASES) {
    result = result.replace(pattern, '').replace(/\s+/g, ' ').trim();
  }
  return result;
}

function conceptMostlyPresent(text: string, phrase: string): boolean {
  const phraseTokens = significantTokens(phrase);
  const textTokens = significantTokens(text);
  if (phraseTokens.size === 0) return true;

  let shared = 0;
  for (const token of phraseTokens) {
    if (textTokens.has(token)) shared++;
  }

  return shared / phraseTokens.size >= 0.75;
}

function strengthenPrompt(
  text: string,
  avoidItems: string[] = [],
  options: StyleOverrideOptions = {},
): string {
  const additions: string[] = [];

  for (const { test, phrase } of STRENGTHENERS) {
    if (phrase.includes('symmetry') && avoidsOpticalSymmetry(avoidItems)) continue;
    if (options.allowShadows && /no shadows/i.test(phrase)) continue;
    if (!test.test(text)) continue;
    if (conceptMostlyPresent(text, phrase)) continue;
    if (additions.some((existing) => clauseOverlaps(existing, phrase))) continue;
    additions.push(phrase);
  }

  if (additions.length === 0) return text;
  return `${text}, ${additions.join(', ')}`;
}

function enforceRestrictions(
  text: string,
  principles: DesignRule[],
  options: StyleOverrideOptions = {},
): string {
  const restrictions: string[] = [];
  const ids = new Set(principles.map((p) => p.id));

  if (!options.allowPhotoreal && (ids.has('color-no-gradient') || ids.has('fx-gradient-avoid'))) {
    restrictions.push('no gradients');
  }
  if (!options.allowShadows && (ids.has('render-no-shadows') || ids.has('fx-shadow-avoid'))) {
    restrictions.push('no shadows');
  }
  if (!options.allowMultipleColors && ids.has('color-one-color')) {
    restrictions.push('single color');
  }
  if (!options.allowPhotoreal && ids.has('render-flat-vector')) {
    restrictions.push('flat vector');
  }

  let result = text;
  for (const restriction of restrictions) {
    if (!conceptMostlyPresent(result, restriction)) {
      result += `, ${restriction}`;
    }
  }
  return result;
}

function applyStyleOverrides(body: string, options: StyleOverrideOptions): string {
  let result = body;

  if (options.allowShadows) {
    result = result
      .replace(/\bno shadows?\b/gi, '')
      .replace(/\bavoid(?:ing)? shadows?\b/gi, '')
      .replace(/\bavoiding shadows?\b/gi, '')
      .replace(/\bshadowless\b/gi, '');
  }

  if (options.allowPhotoreal) {
    result = result
      .replace(/\bno photoreal(?:ism|istic)?\b/gi, '')
      .replace(/\bavoid(?:ing)? photoreal(?:ism|istic)?\b/gi, '')
      .replace(/\bavoid(?:ing)? gradients?\b/gi, '')
      .replace(/\bno photographic effects?\b/gi, '')
      .replace(/\bflat vector only\b/gi, 'vector-compatible identity');
  }

  if (options.allowMultipleColors) {
    result = result
      .replace(/\bsingle color\b/gi, '')
      .replace(/\bone-color\b/gi, '')
      .replace(/\bmonochrome only\b/gi, '');
  }

  return result.replace(/\s+,/g, ',').replace(/,\s*,+/g, ', ').replace(/\s+/g, ' ').trim();
}

function filterAvoidItemsForStyleOverrides(
  avoidItems: string[],
  options: StyleOverrideOptions,
): string[] {
  return avoidItems.filter((item) => {
    if (options.allowShadows && /shadows?/i.test(item)) return false;
    if (options.allowPhotoreal && /photoreal|photographic|3d|gradient/i.test(item)) return false;
    if (options.allowMultipleColors && /single color|one.?color|multi.?color|two.?color/i.test(item)) return false;
    return true;
  });
}

function normalizePunctuation(text: string): string {
  return (
    text
      .replace(/\s+/g, ' ')
      .replace(/,\s*,+/g, ', ')
      .replace(/:\s*,+/g, ': ')
      .replace(/Avoid:\s*\./gi, '')
      .replace(/Avoid:\s*$/gi, '')
      .replace(/,\s*\./g, '.')
      .replace(/\.+/g, '.')
      .replace(/\s+,/g, ',')
      .replace(/,\s*$/g, '')
      .replace(/\.\s*$/, '')
      .trim() + '.'
  );
}

function collapseRepeatedWords(text: string): string {
  let result = text;
  let previous = '';

  while (result !== previous) {
    previous = result;
    result = result.replace(/\b(\w+)(\s+\1\b)+/gi, '$1');
  }

  return result;
}

export function detectPromptIssues(text: string): string[] {
  const issues: string[] = [];

  const clauses = splitClauses(text);
  const seen: string[] = [];
  for (const clause of clauses) {
    if (seen.some((existing) => clauseOverlaps(existing, clause))) {
      issues.push(`Duplicate: "${clause}"`);
    }
    seen.push(clause);
  }

  for (const [a, b] of CONTRADICTIONS) {
    if (a.test(text) && b.test(text)) {
      issues.push(`Contradiction between "${a.source}" and "${b.source}"`);
    }
  }

  const { body, avoidItems } = splitPromptSections(text);
  if (avoidsOpticalSymmetry(avoidItems) && /\b(?:perfect\s+)?(?:optical\s+)?symmetry\b/i.test(body)) {
    issues.push('Contradiction between symmetry in prompt body and "avoid perfect optical symmetry"');
  }

  if (/\b(\w+)\s+\1\b/i.test(text)) {
    issues.push('Repeated adjacent words detected');
  }

  if (text.length > 500) issues.push('Prompt may be too long for image models');
  if (text.length < 50) issues.push('Prompt may be too short');

  return issues;
}
