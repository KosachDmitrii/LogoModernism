import type { LogoMarkType, TypographyStyle } from './types';

export const TYPOGRAPHY_STYLE_VALUES = [
  'standard',
  'constructed',
  'modified_glyph',
  'rebus',
  'monogram_ligature',
] as const satisfies readonly TypographyStyle[];

const MARK_TYPE_STYLES: Record<LogoMarkType, readonly TypographyStyle[]> = {
  wordmark: ['standard', 'constructed', 'modified_glyph', 'rebus'],
  lettermark: ['standard', 'constructed', 'monogram_ligature'],
  combination: ['standard', 'constructed'],
};

const NAME_REQUIRED_STYLES = new Set<TypographyStyle>([
  'constructed',
  'modified_glyph',
  'rebus',
  'monogram_ligature',
]);

const CONSTRUCTED_LIKE_STYLES = new Set<TypographyStyle>([
  'constructed',
  'modified_glyph',
  'rebus',
  'monogram_ligature',
]);

const GEOMETRIC_CONSTRUCTED_STYLES = new Set<TypographyStyle>([
  'constructed',
  'modified_glyph',
  'rebus',
]);

export function isTypographyStyle(value: string | undefined): value is TypographyStyle {
  return Boolean(value && (TYPOGRAPHY_STYLE_VALUES as readonly string[]).includes(value));
}

export function typographyStylesForMarkType(markType: LogoMarkType): TypographyStyle[] {
  return [...MARK_TYPE_STYLES[markType]];
}

export function normalizeTypographyStyleForMarkType(
  style: TypographyStyle | undefined,
  markType: LogoMarkType,
): TypographyStyle {
  const allowed = MARK_TYPE_STYLES[markType];
  if (style && allowed.includes(style)) return style;
  return 'standard';
}

export function typographyStyleNeedsBrandName(style: TypographyStyle | undefined): boolean {
  return Boolean(style && NAME_REQUIRED_STYLES.has(style));
}

export function isConstructedTypographyStyle(style: TypographyStyle | undefined): boolean {
  return Boolean(style && CONSTRUCTED_LIKE_STYLES.has(style));
}

export function isGeometricConstructedTypographyStyle(style: TypographyStyle | undefined): boolean {
  return Boolean(style && GEOMETRIC_CONSTRUCTED_STYLES.has(style));
}

export function isRebusTypographyStyle(style: TypographyStyle | undefined): boolean {
  return style === 'rebus';
}

export function deriveRebusWordmark(
  typographyStyle: TypographyStyle | undefined,
  legacyFlag?: boolean,
): boolean {
  return typographyStyle === 'rebus' || legacyFlag === true;
}

export function typographyStyleLabelFragment(style: TypographyStyle): string {
  switch (style) {
    case 'modified_glyph':
      return 'Modified glyph — one distinctive letter carries brand character';
    case 'rebus':
      return 'Rebus wordmark — letter integrates image via negative space';
    case 'monogram_ligature':
      return 'Monogram ligature — interlocked initials as one unified letterform';
    case 'constructed':
      return 'Constructed geometric letterforms with one modified distinctive glyph';
    default:
      return 'Custom neo-grotesque wordmark with one modified distinctive glyph';
  }
}
