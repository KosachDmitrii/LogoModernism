import type { ImageGenerationRequest, LogoMarkType } from '@logo-platform/shared';
import {
  exactBrandSpellingInstruction,
  isMultiWordCompanyName,
  lettermarkTextFromName,
  normalizeBrandName,
  resolveMarkTypeForBrand,
  resolveTypographyStyleForBrand,
  NO_BRAND_TEXT_INSTRUCTION,
  buildImageArtDirectionSuffix,
  isCombinationMark,
  isDetailedLogoPrompt,
  stylePreferenceOverrides,
  sanitizeLiteralIndustryLanguage,
  ensureModernistFormLanguage,
} from '@logo-platform/shared';

const ICON_SUFFIX =
  ' Professional logo design, flat vector style, clean white background, ' +
  'scalable icon, modernist Swiss design, ' +
  'no gradients, no shadows, no photorealism, centered composition.';

const COMPACT_RENDER_SUFFIX =
  ' Flat vector illustration, clean white background, monochrome, ' +
  'no gradients, no shadows, no photorealism, centered composition.';

const CONSTRUCTED_SUFFIX =
  ' Professional constructed typography logo, letters built from geometric primitives — ' +
  'triangles, semicircles, and rectangles on a modular grid, dense stacked typographic block, ' +
  'bold black letterforms on light background, letters are the entire logo, ' +
  'not an off-the-shelf font, no separate icon, no roundel, no emblem, no pictorial symbol, ' +
  'flat vector, clean white background, no gradients, no shadows, no photorealism, centered composition.';

const ANTI_LITERAL_SUFFIX =
  ' Industry cues through abstract form language only — no literal clipart, stock icons, or photoreal objects.';

const SYMBOL_ONLY_SUFFIX =
  ' Professional abstract symbol logo, standalone iconic mark with no text, no lettering, no initials, ' +
  'flat vector style, clean white background, strong geometric silhouette, ' +
  'no gradients, no shadows, no photorealism, centered composition.';

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
  if (
    text.includes('combination mark') ||
    text.includes('symbol and wordmark') ||
    text.includes('corporate identity mark')
  ) {
    return 'combination';
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

function renderSuffixForPrompt(
  base: string,
  markType: LogoMarkType | undefined,
  detailed: boolean,
  request: ImageGenerationRequest,
  brandName?: string,
): string {
  const style = stylePreferenceOverrides(request);
  const renderBase = [
    'Flat vector illustration',
    'clean white background',
    'monochrome',
    !style.allowShadows ? 'no shadows' : '',
    !style.allowPhotoreal ? 'no photorealism' : '',
    'centered composition',
  ]
    .filter(Boolean)
    .join(', ');
  const compactSuffix = ` ${renderBase}.`;
  const artDirection = buildImageArtDirectionSuffix({
    markType,
    companyName: brandName,
  });

  if (!brandName) {
    return `${compactSuffix}${artDirection}${SYMBOL_ONLY_SUFFIX}`;
  }

  if (detailed) {
    if (isCombinationMark(markType, brandName)) {
      return `${compactSuffix}${artDirection}${ANTI_LITERAL_SUFFIX}`;
    }
    return compactSuffix;
  }

  if (isCombinationMark(markType, brandName)) {
    return `${compactSuffix}${artDirection}${ANTI_LITERAL_SUFFIX}`;
  }

  return compactSuffix;
}

function applyImageStyleOverrides(text: string, request: ImageGenerationRequest): string {
  const style = stylePreferenceOverrides(request);
  let result = text;

  if (style.allowShadows) {
    result = result.replace(/\bno shadows?\b/gi, '').replace(/\bavoiding shadows?\b/gi, '');
  }
  if (style.allowPhotoreal) {
    result = result
      .replace(/\bno photoreal(?:ism|istic)?\b/gi, '')
      .replace(/\bno photographic effects?\b/gi, '')
      .replace(/\bflat vector only\b/gi, 'vector-compatible identity');
  }
  if (style.allowMultipleColors) {
    result = result.replace(/\bsingle color\b/gi, '').replace(/\bone-color\b/gi, '');
  }

  return result.replace(/\s+,/g, ',').replace(/,\s*,+/g, ', ').replace(/\s+/g, ' ').trim();
}

function finalizeEnhancedPrompt(
  text: string,
  request: ImageGenerationRequest,
  markType?: LogoMarkType,
): string {
  return applyImageStyleOverrides(text, request);
}

export function enhanceLogoPrompt(request: ImageGenerationRequest): string {
  const base = sanitizeLiteralIndustryLanguage(request.prompt.trim());
  const brandName = normalizeBrandName(request.companyName);
  const company = brandName ? ` for "${brandName}"` : '';
  const detectedMarkType = detectMarkType(request);
  const typographyStyle = resolveTypographyStyleForBrand(request.typographyStyle, brandName);
  const markType = brandName
    ? (request.markType ?? detectedMarkType)
    : resolveMarkTypeForBrand(request.markType ?? detectedMarkType, brandName, typographyStyle);
  const detailed = isDetailedLogoPrompt(base);
  const isConstructed =
    typographyStyle === 'constructed' ||
    base.toLowerCase().includes('constructed typography') ||
    base.toLowerCase().includes('constructed typographic');

  if (!brandName) {
    const suffix = renderSuffixForPrompt(base, undefined, detailed, request, brandName);
    const text = base.toLowerCase().includes('logo')
      ? `${base}. ${suffix} ${NO_BRAND_TEXT_INSTRUCTION}`
      : `Abstract symbol-only logo: ${base}. ${suffix} ${NO_BRAND_TEXT_INSTRUCTION}`;
    return finalizeEnhancedPrompt(text, request);
  }

  if (isConstructed) {
    const suffix = detailed ? renderSuffixForPrompt(base, markType, detailed, request, brandName) : CONSTRUCTED_SUFFIX;
    const text = base.toLowerCase().includes('constructed')
      ? `${base}${company}. ${suffix}`
      : `Constructed typography logo${company}: ${base}. ${suffix}`;
    return finalizeEnhancedPrompt(withExactSpelling(text, brandName, markType), request, markType);
  }

  if (markType === 'lettermark' && brandName) {
    const text = base.toLowerCase().includes('lettermark')
      ? `${base}${company}. ${lettermarkSuffix(brandName)}`
      : `Lettermark logo${company}: ${base}. ${lettermarkSuffix(brandName)}`;
    return finalizeEnhancedPrompt(withExactSpelling(text, brandName, 'lettermark'), request, 'lettermark');
  }

  if (markType === 'wordmark') {
    const suffix = detailed
      ? `${renderSuffixForPrompt(base, markType, detailed, request, brandName)}${buildImageArtDirectionSuffix({ markType: 'wordmark', companyName: brandName })}`
      : WORDMARK_SUFFIX;
    const text = base.toLowerCase().includes('wordmark')
      ? `${base}${company}. ${suffix}`
      : `Typographic wordmark logo${company}: ${base}. ${suffix}`;
    return finalizeEnhancedPrompt(withExactSpelling(text, brandName, 'wordmark'), request, 'wordmark');
  }

  const suffix = renderSuffixForPrompt(base, markType, detailed, request, brandName);

  if (base.toLowerCase().includes('logo')) {
    return finalizeEnhancedPrompt(
      ensureModernistFormLanguage(withExactSpelling(`${base}${company}. ${suffix}`, brandName, markType)),
      request,
      markType,
    );
  }

  return finalizeEnhancedPrompt(
    ensureModernistFormLanguage(
      withExactSpelling(`Minimal geometric logo${company}: ${base}. ${suffix}`, brandName, markType),
    ),
    request,
    markType,
  );
}

export function resolveMarkTypeFromPrompt(text: string): LogoMarkType | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('wordmark only') || lower.includes('typography-only wordmark')) {
    return 'wordmark';
  }
  if (lower.includes('lettermark')) return 'lettermark';
  if (lower.includes('combination mark') || lower.includes('symbol and wordmark')) return 'combination';
  return undefined;
}
