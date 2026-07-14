import type { LogoMarkType, TypographyStyle } from './types';
import {
  hasExplicitBrandName,
  isSymbolOnlyLogo,
  NO_BRAND_TEXT_FRAGMENT,
  normalizeBrandName,
  resolveMarkTypeForBrand,
} from './brand-text';
import { splitAvoidSection } from './prompt-compliance';

function splitAvoidForSpec(text: string): { body: string; avoidSuffix: string } {
  return splitAvoidSection(text);
}

export type PromptMarkMode = 'symbol_only' | 'wordmark' | 'lettermark' | 'combination' | 'unspecified';

export interface ResolvePromptSpecInput {
  companyName?: string;
  markType?: LogoMarkType;
  typographyStyle?: TypographyStyle;
  colorPalette?: string;
  clientNotes?: string;
  constraints?: string;
  composition?: string;
}

export interface NormalizedPromptSpec {
  brandName?: string;
  markMode: PromptMarkMode;
  markType?: LogoMarkType;
  colorPalette?: string;
  prefersSymmetry: boolean;
  prefersDynamic: boolean;
  allowsCurves: boolean;
  strictMonochrome: boolean;
}

export interface PromptTextConflict {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  autoResolvable: boolean;
  term?: string;
}

const MONOCHROME_PALETTES = new Set(['black_white', 'monochrome']);

const SYMMETRY_SIGNALS =
  /\b(?:bilateral symmetry|perfect symmetry|symmetric(?:al)?(?: composition| balance)?|mirror(?:ed)? symmetry|centered balance)\b/i;

const DYNAMIC_SIGNALS =
  /\b(?:italic(?:ized)?|oblique|skew(?:ed)?|dynamic tension|asymmetric dynamic|forward lean|slanted letterforms?)\b/i;

const CURVE_AVOID_SIGNALS =
  /\b(?:no curves?|avoid curves?|straight lines? only|angular only|no script|no cursive|geometric only)\b/i;

const CURVE_POSITIVE_SIGNALS =
  /\b(?:script|calligraphic|cursive|swash|flowing curves?|arched|arch(?:es|ed)?|rounded script|handwritten)\b/i;

const SYMBOL_ONLY_REMNANTS = [
  /\bAbstract symbol-only logo design\b/gi,
  /\babstract symbol mark only\b/gi,
  /\bno brand name, no lettering\b/gi,
  /\bno words, no initials\b/gi,
];

const DYNAMIC_STRIP_PATTERNS = [
  /\bitalic(?:ized)?(?:\s+\w+){0,4}\b/gi,
  /\boblique(?:\s+\w+){0,3}\b/gi,
  /\bskew(?:ed)?(?:\s+\w+){0,3}\b/gi,
  /\bdynamic tension\b/gi,
  /\basymmetric dynamic\b/gi,
  /\bforward lean(?:ing)?\b/gi,
  /\bslanted letterforms?\b/gi,
];

const SYMMETRY_STRIP_PATTERNS = [
  /\bbilateral symmetry\b/gi,
  /\bperfect symmetry\b/gi,
  /\bsymmetric(?:al)? composition\b/gi,
  /\bsymmetric(?:al)? balance\b/gi,
  /\bmirror(?:ed)? symmetry\b/gi,
  /\bcentered balance\b/gi,
];

const MULTICOLOR_SIGNALS =
  /\b(?:two[- ]?color(?:\s+palette)?|multi[- ]?color(?:\s+palette)?|controlled(?:\s+two[- ]?color)?\s+palette|controlled palette:\s*two|accent color|corporate blue)\b/i;

const MONOCHROME_TEXT_SIGNALS =
  /\b(?:strict black and white only|black and white only|monochrome only|strictly black and white)\b/i;

function isEffectivelyMonochrome(text: string, spec: NormalizedPromptSpec): boolean {
  return spec.strictMonochrome || MONOCHROME_TEXT_SIGNALS.test(text);
}

const CURVE_CATALOG_SOFTEN_PATTERNS = [
  /\b(?:script|calligraphic|cursive|swash)(?:\s+\w+){0,4}\b/gi,
  /\bflowing curves?\b/gi,
  /\barched (?:letterforms?|typography)\b/gi,
  /\bhandwritten(?: style)?\b/gi,
];

function parseBriefSignals(
  notes?: string,
  constraints?: string,
  composition?: string,
): {
  prefersSymmetry: boolean;
  prefersDynamic: boolean;
  allowsCurves: boolean;
} {
  const hay = `${notes ?? ''} ${constraints ?? ''} ${composition ?? ''}`.toLowerCase();
  const prefersSymmetry = /\b(?:symmetr|balanced|centered|stable|formal)\b/.test(hay);
  const prefersDynamic = /\b(?:italic|oblique|skew|dynamic|movement|energy|diagonal tension|forward)\b/.test(
    hay,
  );
  const allowsCurves = !CURVE_AVOID_SIGNALS.test(hay);
  return { prefersSymmetry, prefersDynamic, allowsCurves };
}

function resolveMarkMode(
  brandName?: string,
  markType?: LogoMarkType,
  typographyStyle?: TypographyStyle,
): PromptMarkMode {
  const resolved = resolveMarkTypeForBrand(markType, brandName, typographyStyle);
  if (isSymbolOnlyLogo(brandName, resolved)) return 'symbol_only';
  if (resolved === 'wordmark') return 'wordmark';
  if (resolved === 'lettermark') return 'lettermark';
  if (resolved === 'combination') return 'combination';
  if (brandName) return 'combination';
  return 'unspecified';
}

export function resolvePromptSpec(input: ResolvePromptSpecInput = {}): NormalizedPromptSpec {
  const brandName = normalizeBrandName(input.companyName);
  const markType = resolveMarkTypeForBrand(input.markType, brandName, input.typographyStyle);
  const briefSignals = parseBriefSignals(input.clientNotes, input.constraints, input.composition);

  return {
    brandName,
    markMode: resolveMarkMode(brandName, markType, input.typographyStyle),
    markType,
    colorPalette: input.colorPalette,
    prefersSymmetry: briefSignals.prefersSymmetry,
    prefersDynamic: briefSignals.prefersDynamic,
    allowsCurves: briefSignals.allowsCurves,
    strictMonochrome: Boolean(input.colorPalette && MONOCHROME_PALETTES.has(input.colorPalette)),
  };
}

function dedupePhrase(text: string, phrase: string): string {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'gi');
  let seen = false;
  return text.replace(regex, (match) => {
    if (seen) return '';
    seen = true;
    return match;
  });
}

function cleanupPromptText(text: string): string {
  return text
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,+/g, ', ')
    .replace(/\.\s*\./g, '.')
    .replace(/(?:\.\s*){2,}/g, '.')
    .replace(/\s+\./g, '.')
    .replace(/\.([A-Za-z])/g, '. $1')
    .trim();
}

function stripPatterns(text: string, patterns: RegExp[]): string {
  let result = text;
  for (const pattern of patterns) {
    result = result.replace(pattern, '');
  }
  return result;
}

function softenCurveCatalogLanguage(text: string): string {
  let result = text;
  for (const pattern of CURVE_CATALOG_SOFTEN_PATTERNS) {
    result = result.replace(pattern, 'geometric construction');
  }
  return result
    .replace(/\bTypography:\s*geometric construction,\s*geometric construction\b/gi, 'Typography: geometric sans construction')
    .trim();
}

function isCatalogReferenceBlock(fragment: string): boolean {
  return /^Catalog reference\s*—/i.test(fragment.trim());
}

function catalogMarkTypeFromFragment(fragment: string): string | undefined {
  const match = fragment.match(/\b(?:Catalog lineage mark type|Mark type):\s*([a-z_]+)/i);
  return match?.[1]?.toLowerCase();
}

function fragmentCompatibleWithSpec(fragment: string, spec: NormalizedPromptSpec): boolean {
  const catalogMark = catalogMarkTypeFromFragment(fragment);
  if (!catalogMark) return true;

  switch (spec.markMode) {
    case 'symbol_only':
      return catalogMark === 'symbol' || catalogMark === 'emblem';
    case 'wordmark':
      return catalogMark === 'wordmark' || catalogMark === 'combination';
    case 'lettermark':
      return catalogMark === 'lettermark' || catalogMark === 'wordmark' || catalogMark === 'combination';
    case 'combination':
      return catalogMark !== 'wordmark' || fragment.toLowerCase().includes('combination');
    default:
      return true;
  }
}

function fragmentCurveHeavy(fragment: string): boolean {
  return CURVE_POSITIVE_SIGNALS.test(fragment);
}

export function filterCatalogInspirationFragments(
  fragments: string[],
  spec: NormalizedPromptSpec,
  maxReferences = 2,
): string[] {
  if (!fragments.length) return fragments;

  const referenceBlocks: string[] = [];
  const trailing: string[] = [];
  let current = '';

  for (const fragment of fragments) {
    if (isCatalogReferenceBlock(fragment)) {
      if (current) referenceBlocks.push(current.trim());
      current = fragment;
      continue;
    }

    if (current) {
      current = `${current}. ${fragment}`;
    } else {
      trailing.push(fragment);
    }
  }
  if (current) referenceBlocks.push(current.trim());

  const compatible = referenceBlocks.filter((block) => {
    if (!fragmentCompatibleWithSpec(block, spec)) return false;
    if (!spec.allowsCurves && fragmentCurveHeavy(block)) return false;
    return true;
  });

  const limited = (compatible.length ? compatible : referenceBlocks).slice(0, maxReferences);
  return [...limited, ...trailing];
}

export function applyPromptSpecToText(text: string, spec: NormalizedPromptSpec): string {
  let result = text;

  if (spec.markMode !== 'symbol_only' && spec.brandName) {
    result = result.replace(NO_BRAND_TEXT_FRAGMENT, '');
    for (const pattern of SYMBOL_ONLY_REMNANTS) {
      result = result.replace(pattern, '');
    }
    result = dedupePhrase(result, 'abstract symbol mark');
    // Catalog symbol refs must not override branded brief architecture.
    const briefMark =
      spec.markMode === 'wordmark'
        ? 'wordmark'
        : spec.markMode === 'lettermark'
          ? 'lettermark'
          : 'combination';
    result = result.replace(/\bMark type:\s*symbol\b/gi, `Mark type: ${briefMark}`);
  }

  if (spec.markMode === 'wordmark' && spec.brandName) {
    result = result.replace(/\babstract symbol(?:-only)? mark\b/gi, 'wordmark');
    result = result.replace(/\bNo separate icon, no symbol above text[^.]+\./gi, '');
  }

  const hasSymmetry = SYMMETRY_SIGNALS.test(result);
  const hasDynamic = DYNAMIC_SIGNALS.test(result);
  if (hasSymmetry && hasDynamic) {
    if (spec.prefersSymmetry && !spec.prefersDynamic) {
      result = stripPatterns(result, DYNAMIC_STRIP_PATTERNS);
    } else if (spec.prefersDynamic && !spec.prefersSymmetry) {
      result = stripPatterns(result, SYMMETRY_STRIP_PATTERNS);
    } else {
      result = stripPatterns(result, DYNAMIC_STRIP_PATTERNS);
    }
  }

  if (!spec.allowsCurves) {
    result = softenCurveCatalogLanguage(result);
  }

  if (isEffectivelyMonochrome(result, spec)) {
    const { body, avoidSuffix } = splitAvoidForSpec(result);
    let cleanedBody = body
      .replace(/\bColor approach:\s*Controlled(?:\s+two[- ]?color)?\s+palette\b/gi, '')
      .replace(/\bColor approach:\s*Controlled palette:\s*two[- ]?color\b/gi, '')
      .replace(/\bColor approach:\s*[^.]+\./gi, (match) =>
        MULTICOLOR_SIGNALS.test(match) ? '' : match,
      )
      .replace(MULTICOLOR_SIGNALS, '')
      .replace(/\bColor:\s*only,\s*/gi, 'Color: ');
    // Redundant avoid when body already locks monochrome.
    let cleanedAvoid = avoidSuffix
      .replace(/\bAvoid:\s*/i, '')
      .split(',')
      .map((item) => item.trim().replace(/\.$/, ''))
      .filter(Boolean)
      .filter((item) => !/^(?:multi[- ]?color|two[- ]?color|accent color|corporate blue)$/i.test(item))
      .join(', ');
    result = cleanedAvoid
      ? `${cleanedBody.replace(/\.\s*$/, '')}. Avoid: ${cleanedAvoid}.`
      : cleanedBody;
  }

  result = result.replace(/\babstract symbol mark for\s+"[^"]+"/gi, (match) => {
    if (spec.markMode === 'symbol_only') return match;
    return spec.brandName ? `combination mark for "${spec.brandName}"` : match;
  });

  return cleanupPromptText(result);
}

export function detectPromptTextConflicts(
  text: string,
  spec: NormalizedPromptSpec,
): PromptTextConflict[] {
  const conflicts: PromptTextConflict[] = [];
  const lower = text.toLowerCase();

  if (spec.markMode !== 'symbol_only' && spec.brandName) {
    if (lower.includes('abstract symbol mark only') || lower.includes(NO_BRAND_TEXT_FRAGMENT.toLowerCase())) {
      conflicts.push({
        code: 'mark_architecture_conflict',
        severity: 'error',
        message: 'Prompt mixes brand name with symbol-only directives',
        autoResolvable: true,
      });
    }
    if (/\bmark type:\s*symbol\b/i.test(lower) && /\b(?:wordmark|lettermark|combination mark|neo-grotesque wordmark)\b/i.test(lower)) {
      conflicts.push({
        code: 'mark_architecture_conflict',
        severity: 'error',
        message: 'Catalog symbol mark type conflicts with branded wordmark/combination language',
        autoResolvable: true,
        term: 'Mark type: symbol',
      });
    }
  }

  if (SYMMETRY_SIGNALS.test(text) && DYNAMIC_SIGNALS.test(text)) {
    conflicts.push({
      code: 'composition_axis_conflict',
      severity: 'warning',
      message: 'Prompt mixes symmetric and dynamic/italic composition language',
      autoResolvable: spec.prefersSymmetry !== spec.prefersDynamic,
    });
  }

  if (!spec.allowsCurves && CURVE_POSITIVE_SIGNALS.test(text) && CURVE_AVOID_SIGNALS.test(text)) {
    const termMatch = text.match(CURVE_POSITIVE_SIGNALS);
    conflicts.push({
      code: 'curve_policy_conflict',
      severity: 'warning',
      message: 'Brief avoids curves but prompt still references script or arched forms',
      autoResolvable: true,
      term: termMatch?.[0],
    });
  }

  if (spec.markMode === 'wordmark' && /\babstract symbol(?:-only)? mark\b/i.test(text)) {
    conflicts.push({
      code: 'mark_type_text_conflict',
      severity: 'error',
      message: 'Wordmark brief conflicts with symbol-only language in the prompt',
      autoResolvable: true,
    });
  }

  if (isEffectivelyMonochrome(text, spec) && MULTICOLOR_SIGNALS.test(text)) {
    const termMatch = text.match(MULTICOLOR_SIGNALS);
    conflicts.push({
      code: 'palette_territory_conflict',
      severity: 'error',
      message: 'Monochrome brief conflicts with multicolor or two-color language in the prompt',
      autoResolvable: true,
      term: termMatch?.[0],
    });
  }

  return conflicts;
}

/** Detect conflicts that remain after spec normalization — use for constraint gate. */
export function detectActivePromptConflicts(
  text: string,
  spec: NormalizedPromptSpec,
): PromptTextConflict[] {
  const normalized = applyPromptSpecToText(text, spec);
  return detectPromptTextConflicts(normalized, spec).map((conflict) => ({
    ...conflict,
    autoResolvable: false,
  }));
}

export function filterCatalogPrincipleIds(
  principleIds: string[],
  spec: NormalizedPromptSpec,
): string[] {
  const blockedWhenNoCurves = new Set([
    'typ-extra-serif-classic',
    'typ-extra-slab-serif',
    'mark-emblem',
  ]);
  const blockedForWordmark = new Set([
    'mark-iconic-symbol',
    'mark-abstract-symbol',
    'mark-symbol-only',
    'mark-emblem',
    'mark-heraldic',
  ]);
  const blockedForCombination = new Set(['mark-emblem', 'mark-heraldic', 'mark-pictogram']);
  const blockedForSymbolOnly = new Set(['typ-wordmark', 'mark-combination-mark']);

  return principleIds.filter((id) => {
    if (!spec.allowsCurves && blockedWhenNoCurves.has(id)) return false;
    if (spec.markMode === 'wordmark' && blockedForWordmark.has(id)) return false;
    if (spec.markMode === 'lettermark' && id === 'mark-iconic-symbol') return false;
    if (spec.markMode === 'symbol_only' && blockedForSymbolOnly.has(id)) return false;
    if (spec.markMode === 'combination' && blockedForCombination.has(id)) return false;
    return true;
  });
}
