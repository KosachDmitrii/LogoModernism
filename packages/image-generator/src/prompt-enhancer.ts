import type { ImageGenerationRequest, LogoMarkType } from '@logo-platform/shared';
import {
  exactBrandSpellingInstruction,
  isMultiWordCompanyName,
  lettermarkTextFromName,
  normalizeBrandName,
  resolveMarkTypeForBrand,
  resolveTypographyStyleForBrand,
  isGeometricConstructedTypographyStyle,
  NO_BRAND_TEXT_INSTRUCTION,
  buildImageArtDirectionSuffix,
  isCombinationMark,
  isDetailedLogoPrompt,
  stylePreferenceOverrides,
  sanitizeLiteralIndustryLanguage,
  ensureModernistFormLanguage,
  buildImageColorDirective,
  usesMultipleLogoColors,
  promptImpliesColorPalette,
} from '@logo-platform/shared';

const ICON_SUFFIX =
  ' Professional logo design, flat vector style, clean white background, ' +
  'scalable icon, modernist Swiss design, ' +
  'no gradients, no shadows, no photorealism, centered composition.';

const COMPACT_RENDER_SUFFIX =
  ' Flat vector illustration, clean white background, ' +
  'no gradients, no shadows, no photorealism, centered composition.';

function depthRenderTail(request: ImageGenerationRequest): string {
  const parts: string[] = [];
  if (request.allowShadows) parts.push('include subtle controlled shadows');
  else parts.push('no shadows');
  if (request.allowPhotoreal) parts.push('include controlled 3D dimensional depth');
  else parts.push('no 3D dimensional depth', 'no photorealism');
  const tail = [...parts];
  if (!request.allowPhotoreal) tail.push('no gradients');
  return tail.join(', ');
}

function constructedSuffix(colorDirective: string, request: ImageGenerationRequest): string {
  return (
    ' Professional constructed typography logo, letters built from geometric primitives — ' +
    'triangles, semicircles, and rectangles on a modular grid, dense stacked typographic block, ' +
    `bold letterforms on light background (${colorDirective}), letters are the entire logo, ` +
    'not an off-the-shelf font, no separate icon, no roundel, no emblem, no pictorial symbol, ' +
    `vector letterforms, clean white background, ${depthRenderTail(request)}, centered composition.`
  );
}

const ANTI_LITERAL_SUFFIX =
  ' Industry cues through abstract form language only — no literal clipart, stock icons, or photoreal objects.';

const SYMBOL_ONLY_SUFFIX =
  ' Professional abstract symbol logo, standalone iconic mark with no text, no lettering, no initials, ' +
  'flat vector style, clean white background, strong geometric silhouette, ' +
  'no gradients, no shadows, no photorealism, centered composition.';

function wordmarkSuffix(colorDirective: string, request: ImageGenerationRequest): string {
  return (
    ' Professional typographic wordmark logo, letters spelling the brand name are the entire logo, ' +
    'typography only, no icon, no symbol, no emblem, no pictorial mark above or beside the text, ' +
    `vector letterforms, clean white background (${colorDirective}), ` +
    `${depthRenderTail(request)}, centered horizontal wordmark.`
  );
}

function lettermarkSuffix(companyName: string, colorDirective: string, request: ImageGenerationRequest): string {
  const text = lettermarkTextFromName(companyName);
  const usesInitials = isMultiWordCompanyName(companyName);

  if (usesInitials) {
    return (
      ` Professional lettermark monogram logo built only from the initials "${text}", ` +
      'the letterforms themselves are the entire logo, do not spell the full brand name, ' +
      'no icon, no pictorial symbol, no emblem, no badge, no industry imagery, ' +
      `vector letterforms, clean white background (${colorDirective}), ` +
      `${depthRenderTail(request)}, centered composition.`
    );
  }

  return (
    ` Professional lettermark logo built from the full word "${text}", ` +
    'the full word is the entire logo, do not abbreviate to initials, ' +
    'no icon, no pictorial symbol, no emblem, no badge, no industry imagery, ' +
    `vector letterforms, clean white background (${colorDirective}), ` +
    `${depthRenderTail(request)}, centered composition.`
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
  const colorDirective = buildImageColorDirective(request, base);
  const depthParts: string[] = [];
  if (request.allowShadows) depthParts.push('include subtle controlled shadows');
  else depthParts.push('no shadows');
  if (request.allowPhotoreal) depthParts.push('include controlled 3D dimensional depth');
  else depthParts.push('no 3D dimensional depth');
  const depthHint = depthParts.join(', ');
  const renderLead = request.allowPhotoreal
    ? 'Vector logo with controlled 3D dimensional depth'
    : 'Flat vector illustration';
  const renderBase = [
    renderLead,
    'clean white background',
    usesMultipleLogoColors(request, base) ? colorDirective : 'monochrome',
    depthHint,
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
  const allowColor = style.allowMultipleColors || promptImpliesColorPalette(text);
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
  if (allowColor) {
    result = result.replace(/\bsingle color\b/gi, '').replace(/\bone-color\b/gi, '');
    result = result
      .replace(/\bmonochrome\b/gi, '')
      .replace(/\bblack on white\b/gi, '')
      .replace(/\bblack letterforms on light background\b/gi, 'colored letterforms on light background');
  }

  const allowDepth = request.allowShadows || request.allowPhotoreal;
  if (allowDepth) {
    result = result
      .replace(/\bno shadows?\b/gi, '')
      .replace(/\bno depth effects?\b/gi, '')
      .replace(/\bno gradients\b/gi, request.allowPhotoreal ? '' : 'no gradients')
      .replace(
        /\bsubtle controlled shadows and 3d dimensional depth allowed\b/gi,
        'include subtle controlled shadows and controlled 3D dimensional depth',
      )
      .replace(/\bsubtle controlled shadows allowed\b/gi, 'include subtle controlled shadows')
      .replace(/\bcontrolled 3d dimensional depth allowed\b/gi, 'include controlled 3D dimensional depth');
    if (request.allowPhotoreal) {
      result = result
        .replace(/\bflat vector illustration\b/gi, 'vector logo with controlled 3D dimensional depth')
        .replace(/\bflat vector letterforms\b/gi, 'vector letterforms with controlled 3D dimensional depth')
        .replace(/\bflat vector style\b/gi, 'vector style with controlled 3D dimensional depth');
    }
    if (request.allowShadows && !/\binclude subtle controlled shadows\b/i.test(result)) {
      result += ' Include subtle controlled shadows on the letterforms.';
    }
    if (request.allowPhotoreal && !/\binclude controlled 3d dimensional depth\b/i.test(result)) {
      result += ' Include controlled 3D dimensional depth on the letterforms.';
    }
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
  const colorDirective = buildImageColorDirective(request, base);
  const isGeometricConstructed =
    isGeometricConstructedTypographyStyle(typographyStyle) ||
    base.toLowerCase().includes('constructed typography') ||
    base.toLowerCase().includes('constructed typographic');

  if (!brandName) {
    const suffix = renderSuffixForPrompt(base, undefined, detailed, request, brandName);
    const text = base.toLowerCase().includes('logo')
      ? `${base}. ${suffix} ${NO_BRAND_TEXT_INSTRUCTION}`
      : `Abstract symbol-only logo: ${base}. ${suffix} ${NO_BRAND_TEXT_INSTRUCTION}`;
    return finalizeEnhancedPrompt(text, request);
  }

  if (markType === 'lettermark' && brandName) {
    const suffix = detailed
      ? renderSuffixForPrompt(base, markType, detailed, request, brandName)
      : lettermarkSuffix(brandName, colorDirective, request);
    const text = base.toLowerCase().includes('lettermark')
      ? `${base}${company}. ${suffix}`
      : `Lettermark logo${company}: ${base}. ${suffix}`;
    return finalizeEnhancedPrompt(withExactSpelling(text, brandName, 'lettermark'), request, 'lettermark');
  }

  if (isGeometricConstructed) {
    const constructed = constructedSuffix(colorDirective, request);
    const suffix = detailed ? renderSuffixForPrompt(base, markType, detailed, request, brandName) : constructed;
    const text = base.toLowerCase().includes('constructed')
      ? `${base}${company}. ${suffix}`
      : `Constructed typography logo${company}: ${base}. ${suffix}`;
    return finalizeEnhancedPrompt(withExactSpelling(text, brandName, markType), request, markType);
  }

  if (markType === 'wordmark') {
    const suffix = detailed
      ? `${renderSuffixForPrompt(base, markType, detailed, request, brandName)}${buildImageArtDirectionSuffix({ markType: 'wordmark', companyName: brandName })}`
      : wordmarkSuffix(colorDirective, request);
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
