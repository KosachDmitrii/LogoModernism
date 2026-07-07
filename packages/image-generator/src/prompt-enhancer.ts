import type { ImageGenerationRequest, LogoMarkType } from '@logo-platform/shared';
import { isMultiWordCompanyName, lettermarkTextFromName } from '@logo-platform/shared';

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
    text.includes('wordmark logo design')
  ) {
    return 'wordmark';
  }
  return undefined;
}

export function enhanceLogoPrompt(request: ImageGenerationRequest): string {
  const base = request.prompt.trim();
  const company = request.companyName ? ` for "${request.companyName}"` : '';
  const markType = detectMarkType(request);
  const isConstructed =
    request.typographyStyle === 'constructed' ||
    base.toLowerCase().includes('constructed typography') ||
    base.toLowerCase().includes('constructed typographic');

  if (isConstructed) {
    if (base.toLowerCase().includes('constructed')) {
      return `${base}${company}. ${CONSTRUCTED_SUFFIX}`;
    }
    return `Constructed typography logo${company}: ${base}. ${CONSTRUCTED_SUFFIX}`;
  }

  if (markType === 'lettermark' && request.companyName) {
    if (base.toLowerCase().includes('lettermark')) {
      return `${base}${company}. ${lettermarkSuffix(request.companyName)}`;
    }
    return `Lettermark logo${company}: ${base}. ${lettermarkSuffix(request.companyName)}`;
  }

  if (markType === 'wordmark') {
    if (base.toLowerCase().includes('wordmark')) {
      return `${base}${company}. ${WORDMARK_SUFFIX}`;
    }
    return `Typographic wordmark logo${company}: ${base}. ${WORDMARK_SUFFIX}`;
  }

  if (base.toLowerCase().includes('logo')) {
    return `${base}${company}. ${ICON_SUFFIX}`;
  }

  return `Minimal geometric logo${company}: ${base}. ${ICON_SUFFIX}`;
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
