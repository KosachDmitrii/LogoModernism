import type { ImageGenerationRequest, LogoMarkType } from '@logo-platform/shared';
import {
  exactBrandSpellingInstruction,
  isMultiWordCompanyName,
  lettermarkTextFromName,
  normalizeBrandName,
  resolveMarkTypeForBrand,
  resolveTypographyStyleForBrand,
  NO_BRAND_TEXT_INSTRUCTION,
} from '@logo-platform/shared';

const ICON_SUFFIX =
  ' Professional logo design, flat vector style, clean white background, ' +
  'scalable icon, modernist Swiss design, ' +
  'no gradients, no shadows, no photorealism, centered composition.';

const CONSTRUCTED_SUFFIX =
  ' Professional constructed typography logo, letters built from geometric primitives — ' +
  'triangles, semicircles, and rectangles on a modular grid, dense stacked typographic block, ' +
  'bold black letterforms on light background, letters are the entire logo, ' +
  'not an off-the-shelf font, no separate icon, no roundel, no emblem, no pictorial symbol, ' +
  'flat vector, clean white background, no gradients, no shadows, no photorealism, centered composition.';

const WORDMARK_SUFFIX =
  ' Professional typographic wordmark logo, letters spelling the brand name are the entire logo, ' +
  'typography only, no icon, no symbol, no emblem, no pictorial mark above or beside the text, ' +
  'flat vector letterforms, clean white background, black on white, ' +
  'no gradients, no shadows, no photorealism, centered horizontal wordmark.';

function lettermarkSuffix(companyName: string): string {
  const text = lettermarkTextFromName(companyName);
  const usesInitials = isMultiWordCompanyName(companyName);

  if (usesInitials) {
    return (
      ` Professional lettermark monogram logo built only from the initials "${text}", ` +
      'the letterforms themselves are the entire logo, do not spell the full brand name, ' +
      'no icon, no pictorial symbol, no emblem, no badge, no industry imagery, ' +
      'flat vector letterforms, clean white background, black on white, ' +
      'no gradients, no shadows, no photorealism, centered composition.'
    );
  }

  return (
    ` Professional lettermark logo built from the full word "${text}", ` +
    'the full word is the entire logo, do not abbreviate to initials, ' +
    'no icon, no pictorial symbol, no emblem, no badge, no industry imagery, ' +
    'flat vector letterforms, clean white background, black on white, ' +
    'no gradients, no shadows, no photorealism, centered composition.'
  );
}

export { lettermarkTextFromName as initialsFromName };

function detectMarkType(request: ImageGenerationRequest): LogoMarkType | undefined {
  if (request.markType) return request.markType;
  const text = request.prompt.toLowerCase();
  if (text.includes('lettermark monogram') || text.includes('lettermark logo') || text.includes('lettermark built')) {
    return 'lettermark';
  }
  if (
    text.includes('wordmark only') ||
    text.includes('typography-only wordmark') ||
    text.includes('typography only wordmark') ||
    text.includes('wordmark logo design') ||
    text.includes('typographic wordmark')
  ) {
    return 'wordmark';
  }
  return undefined;
}

function withExactSpelling(
  text: string,
  companyName: string | undefined,
  markType: LogoMarkType | undefined,
): string {
  if (!companyName?.trim()) return text;
  const effectiveMarkType = markType ?? 'wordmark';
  const spelling = exactBrandSpellingInstruction(companyName, effectiveMarkType);
  return `${text} ${spelling}`;
}

export function enhanceLogoPrompt(request: ImageGenerationRequest): string {
  const base = request.prompt.trim();
  const brandName = normalizeBrandName(request.companyName);
  const company = brandName ? ` for "${brandName}"` : '';
  const detectedMarkType = detectMarkType(request);
  const typographyStyle = resolveTypographyStyleForBrand(request.typographyStyle, brandName);
  const markType = brandName
    ? (request.markType ?? detectedMarkType)
    : resolveMarkTypeForBrand(request.markType ?? detectedMarkType, brandName, typographyStyle);
  const isConstructed =
    typographyStyle === 'constructed' ||
    base.toLowerCase().includes('constructed typography') ||
    base.toLowerCase().includes('constructed typographic');

  if (!brandName) {
    const text = base.toLowerCase().includes('logo')
      ? `${base}. ${ICON_SUFFIX} ${NO_BRAND_TEXT_INSTRUCTION}`
      : `Minimal geometric logo: ${base}. ${ICON_SUFFIX} ${NO_BRAND_TEXT_INSTRUCTION}`;
    return text;
  }

  if (isConstructed) {
    const text = base.toLowerCase().includes('constructed')
      ? `${base}${company}. ${CONSTRUCTED_SUFFIX}`
      : `Constructed typography logo${company}: ${base}. ${CONSTRUCTED_SUFFIX}`;
    return withExactSpelling(text, brandName, markType);
  }

  if (markType === 'lettermark' && brandName) {
    const text = base.toLowerCase().includes('lettermark')
      ? `${base}${company}. ${lettermarkSuffix(brandName)}`
      : `Lettermark logo${company}: ${base}. ${lettermarkSuffix(brandName)}`;
    return withExactSpelling(text, brandName, 'lettermark');
  }

  if (markType === 'wordmark') {
    const text = base.toLowerCase().includes('wordmark')
      ? `${base}${company}. ${WORDMARK_SUFFIX}`
      : `Typographic wordmark logo${company}: ${base}. ${WORDMARK_SUFFIX}`;
    return withExactSpelling(text, brandName, 'wordmark');
  }

  if (base.toLowerCase().includes('logo')) {
    return withExactSpelling(`${base}${company}. ${ICON_SUFFIX}`, brandName, markType);
  }

  return withExactSpelling(`Minimal geometric logo${company}: ${base}. ${ICON_SUFFIX}`, brandName, markType);
}

export function resolveMarkTypeFromPrompt(text: string): LogoMarkType | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('wordmark only') || lower.includes('typography-only wordmark')) {
    return 'wordmark';
  }
  if (lower.includes('lettermark')) return 'lettermark';
  if (lower.includes('combination mark')) return 'combination';
  return undefined;
}
