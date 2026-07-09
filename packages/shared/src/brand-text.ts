import type { LogoMarkType, TypographyStyle } from './types';
import { isMultiWordCompanyName, lettermarkTextFromName } from './lettermark-text';

export function normalizeBrandName(companyName?: string | null): string | undefined {
  const trimmed = companyName?.trim();
  return trimmed || undefined;
}

export function hasExplicitBrandName(companyName?: string | null): boolean {
  return Boolean(normalizeBrandName(companyName));
}

const TEXTUAL_MARK_TYPES = new Set<LogoMarkType>(['wordmark', 'lettermark']);

/** Wordmark, lettermark, combination, and constructed type need an explicit brand name. */
export function resolveMarkTypeForBrand(
  markType: LogoMarkType | undefined,
  companyName?: string | null,
  typographyStyle?: TypographyStyle,
): LogoMarkType | undefined {
  if (hasExplicitBrandName(companyName)) return markType;
  if (typographyStyle === 'constructed') return undefined;
  if (markType && TEXTUAL_MARK_TYPES.has(markType)) return undefined;
  if (markType === 'combination') return undefined;
  return markType;
}

export function resolveTypographyStyleForBrand(
  typographyStyle: TypographyStyle | undefined,
  companyName?: string | null,
): TypographyStyle | undefined {
  if (!hasExplicitBrandName(companyName) && typographyStyle === 'constructed') {
    return undefined;
  }
  return typographyStyle;
}

export const NO_BRAND_TEXT_FRAGMENT =
  'Abstract symbol mark only — no brand name, no lettering, no words, no initials, no monogram letters';

export const NO_BRAND_TEXT_INSTRUCTION =
  'CRITICAL: Do not include any readable text, brand name, letters, words, or initials in the logo.';

/**
 * Instruction block appended to image/prompt text when a brand name must appear verbatim in the logo.
 */
export function exactBrandSpellingInstruction(
  companyName: string,
  markType?: LogoMarkType,
): string {
  const trimmed = companyName.trim();
  if (!trimmed) return '';

  const isLettermark = markType === 'lettermark';
  const usesInitials = isLettermark && isMultiWordCompanyName(trimmed);
  const displayText = isLettermark ? lettermarkTextFromName(trimmed) : trimmed;

  if (usesInitials) {
    return (
      `CRITICAL: The logo must show only the initials "${displayText}" — ` +
      'correct letters, correct order, no full company name, no extra letters.'
    );
  }

  return (
    `CRITICAL: The readable text in the logo must spell exactly "${displayText}" — ` +
    'every letter correct and in order, no substitutions, no invented letters, ' +
    'no missing or extra letters, no abstract shapes instead of letters.'
  );
}

/**
 * Short fragment for composed prompt pipelines (rule-based + brain context).
 */
export function exactBrandSpellingFragment(
  companyName: string,
  markType?: LogoMarkType,
): string {
  const trimmed = companyName.trim();
  if (!trimmed) return '';

  const isLettermark = markType === 'lettermark';
  const usesInitials = isLettermark && isMultiWordCompanyName(trimmed);
  const displayText = isLettermark ? lettermarkTextFromName(trimmed) : trimmed;

  if (usesInitials) {
    return `lettermark must read exactly "${displayText}"`;
  }

  return `brand name must read exactly "${displayText}" letter-for-letter`;
}
