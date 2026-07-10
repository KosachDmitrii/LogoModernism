import type { LogoMarkType } from './types';
import type { ClientVisualIntent } from './client-visual-intent';
import { hasExplicitBrandName, isSymbolOnlyLogo } from './brand-text';
import { buildAbstractIndustryFragment } from './industry-form-language';

export interface ArtDirectionInput {
  markType?: LogoMarkType;
  companyName?: string;
  industry?: string;
  personality?: string;
  clientIntent?: Pick<ClientVisualIntent, 'abstractionLevel' | 'desiredMotifs' | 'forbiddenMotifs'>;
}

export interface StylePreferenceInput {
  colorPalette?: string;
  colorSelections?: string[];
  allowShadows?: boolean;
  allowPhotoreal?: boolean;
  clientNotes?: string;
}

export interface StyleOverrideOptions {
  allowShadows?: boolean;
  allowPhotoreal?: boolean;
  allowMultipleColors?: boolean;
}

const COHESION_TERMS = [
  'unified lockup',
  'same geometric system',
  'shared stroke weight',
  'designed together',
  'one corporate identity',
  'matching stroke weight',
  'curve language',
];

const IDENTITY_TERMS = [
  'custom modified',
  'custom wordmark',
  'distinctive glyph',
  'modified letterform',
  'not an off-the-shelf font',
  'optically balanced',
  'custom typographic',
];

const CHARACTER_TERMS = [
  'playful yet professional',
  'brand character',
  'strong silhouette',
  'confident negative space',
  'playful professional',
];

const ANTI_GENERIC_TERMS = [
  'avoid generic',
  'avoid literal clipart',
  'avoid disconnected symbol',
  'avoid stock helvetica',
  'not literal clipart',
];

const DETAILED_PROMPT_MARKERS = [
  'baseline grid',
  'interlaced weave',
  'custom modified',
  'international typographic',
  'embroidery-ready',
  'subtractive form',
  'neo-grotesque',
  'parenthetical forms',
  'unified lockup',
  'combination mark',
  'symbol and wordmark',
];

export function isCombinationMark(
  markType?: LogoMarkType,
  companyName?: string | null,
): boolean {
  if (isSymbolOnlyLogo(companyName, markType)) return false;
  return markType === 'combination' || (!markType && hasExplicitBrandName(companyName));
}

export function isDetailedLogoPrompt(text: string): boolean {
  const lower = text.toLowerCase();
  if (lower.length >= 400) return true;
  return DETAILED_PROMPT_MARKERS.filter((marker) => lower.includes(marker)).length >= 4;
}

export function buildArtDirectionFragments(input: ArtDirectionInput): string[] {
  if (input.markType === 'wordmark' || input.markType === 'lettermark') {
    return [
      'Custom typographic identity with modified distinctive glyphs',
      'Not an off-the-shelf font — optically balanced custom letterforms',
      'Strong wordmark silhouette with unified stroke weight',
    ];
  }

  const fragments = [
    'Art direction: symbol and wordmark share one geometric system — matching stroke weight, corner radius, and curve language',
    'Custom wordmark typography with at least one modified distinctive glyph',
    'Unified vertical lockup — symbol and typography designed together as one corporate identity mark',
    'Strong silhouette readable at small sizes, playful yet professional brand character',
  ];

  if (input.personality === 'playful' || input.personality === 'approachable') {
    fragments.push('Warm playful character through organic round geometry and confident negative space');
  }

  if (input.industry?.trim()) {
    fragments.push(buildAbstractIndustryFragment(input.industry.trim(), input.clientIntent));
  }

  fragments.push(
    'Avoid generic circular bracket templates, disconnected floating symbols, and stock Helvetica wordmarks',
  );

  return fragments;
}

export function buildSymbolOnlyArtDirectionFragments(input: ArtDirectionInput): string[] {
  const fragments = [
    'Abstract symbol mark only — no lettering, no words, no initials, no monogram letters',
    'Standalone iconic symbol with strong silhouette and confident negative space',
    'Flat vector geometric mark designed for small-size recognition',
  ];

  if (input.industry?.trim()) {
    fragments.push(buildAbstractIndustryFragment(input.industry.trim(), input.clientIntent));
  }

  fragments.push(
    'Avoid wordmarks, lettermarks, typography, badges with text, and any readable characters',
  );

  return fragments;
}

export function buildImageArtDirectionSuffix(input: ArtDirectionInput): string {
  if (isSymbolOnlyLogo(input.companyName, input.markType)) {
    return (
      ' Abstract symbol mark only — no text, no lettering, no initials. ' +
      'Strong geometric silhouette, flat vector, confident negative space.'
    );
  }

  if (input.markType === 'wordmark' || input.markType === 'lettermark') {
    return (
      ' Custom typographic identity with modified distinctive glyphs, not an off-the-shelf font, ' +
      'optically balanced letterforms, strong silhouette.'
    );
  }

  let suffix =
    ' Unified symbol-and-wordmark lockup sharing one geometric system and stroke weight. ' +
    'Custom modified wordmark typography with at least one distinctive glyph. ' +
    'Playful yet professional brand character, strong silhouette, not generic stock sans-serif. ' +
    'Avoid literal clipart icons and disconnected floating symbols.';

  if (input.industry?.trim()) {
    suffix += ` ${buildAbstractIndustryFragment(input.industry.trim(), input.clientIntent)}.`;
  }

  return suffix;
}

export function scoreCohesion(text: string): number {
  const lower = text.toLowerCase();
  const hits = COHESION_TERMS.filter((term) => lower.includes(term)).length;
  return Math.min(10, 3 + hits * 1.8);
}

export function scoreIdentity(text: string): number {
  const lower = text.toLowerCase();
  const hits = IDENTITY_TERMS.filter((term) => lower.includes(term)).length;
  const antiGeneric = ANTI_GENERIC_TERMS.some((term) => lower.includes(term)) ? 1.5 : 0;
  return Math.min(10, 3 + hits * 1.6 + antiGeneric);
}

export function scoreCharacter(text: string): number {
  const lower = text.toLowerCase();
  const hits = CHARACTER_TERMS.filter((term) => lower.includes(term)).length;
  return Math.min(10, 4 + hits * 2);
}

export function countArtDirectionTerms(text: string): number {
  const lower = text.toLowerCase();
  const allTerms = [...COHESION_TERMS, ...IDENTITY_TERMS, ...CHARACTER_TERMS, ...ANTI_GENERIC_TERMS];
  return allTerms.filter((term) => lower.includes(term)).length;
}

export function appendArtDirectionFragments(text: string, input: ArtDirectionInput): string {
  const fragments = buildArtDirectionFragments(input);
  const lower = text.toLowerCase();
  const missing = fragments.filter((fragment) => {
    const marker = fragment.slice(0, Math.min(fragment.length, 32)).toLowerCase();
    return marker.length > 0 && !lower.includes(marker);
  });

  if (!missing.length) return text;
  return `${text.replace(/\s*\.?\s*$/, '')}. ${missing.join('. ')}`;
}

export function stylePreferenceOverrides(input?: StylePreferenceInput): StyleOverrideOptions {
  return {
    allowShadows: input?.allowShadows === true,
    allowPhotoreal: input?.allowPhotoreal === true,
    allowMultipleColors:
      input?.colorPalette === 'two_color' ||
      input?.colorPalette === 'multi_color' ||
      input?.colorPalette === 'limited' ||
      input?.colorPalette === 'custom' ||
      Boolean(input?.colorSelections?.length),
  };
}

export function buildStylePreferenceFragments(input?: StylePreferenceInput): string[] {
  if (!input) return [];

  const fragments: string[] = [];
  const colors = input.colorSelections?.map((color) => color.trim()).filter(Boolean) ?? [];

  switch (input.colorPalette) {
    case 'black_white':
      fragments.push('Color palette: strict black and white only');
      break;
    case 'monochrome':
      fragments.push('Color palette: monochrome single hue with tonal restraint');
      break;
    case 'two_color':
      fragments.push('Color palette: two-color system maximum');
      break;
    case 'multi_color':
      fragments.push('Color palette: controlled multi-color system');
      break;
    case 'corporate_blue':
      fragments.push('Color palette: corporate blue-led palette');
      break;
    case 'red_accent':
      fragments.push('Color palette: black or neutral base with red accent');
      break;
    case 'limited':
      fragments.push('Color palette: limited restrained palette');
      break;
    case 'custom':
      fragments.push('Color palette: client-selected custom palette');
      break;
  }

  if (colors.length) {
    fragments.push(`Use selected colors: ${colors.join(', ')}`);
  }

  if (input.allowShadows) {
    fragments.push('Client explicitly allows subtle controlled shadows when they improve legibility');
  }

  if (input.allowPhotoreal) {
    fragments.push('Client explicitly allows photoreal presentation or realistic mockup rendering');
  }

  return fragments;
}

export function buildClientNotesFragment(notes?: string): string | undefined {
  const trimmed = notes?.trim().replace(/\.+$/, '');
  if (!trimmed) return undefined;
  return `Client preferences: ${trimmed}`;
}

export function stripClientNotesFromPrompt(text: string): string {
  return text
    .replace(/\s*Brand context from client brief:[^.]+\./gi, '')
    .replace(/\s*Brand context from client brief:[^.,]+/gi, '')
    .replace(/\s*Client preferences:[^.]+\./gi, '')
    .replace(/\s*Client preferences:[^.,]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripEnrichmentBoilerplate(text: string): string {
  return text
    .replace(/^ENRICHED image generation prompt:\s*/i, '')
    .replace(/\bENRICHED image generation prompt:\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripRawClientNote(text: string, notes: string): string {
  const trimmed = notes.trim().replace(/\.+$/, '');
  if (!trimmed) return text;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text
    .replace(new RegExp(`\\b${escaped}\\.?`, 'gi'), '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim();
}

export function preparePromptBodyForClientNotes(text: string, notes?: string): string {
  const trimmed = notes?.trim().replace(/\.+$/, '');
  let body = stripClientNotesFromPrompt(text);
  if (trimmed) {
    body = stripRawClientNote(body, trimmed);
  }
  body = stripEnrichmentBoilerplate(body);
  return body.replace(/^\.\s*/, '').replace(/\.\s*$/, '').trim();
}

export function appendClientNotes(text: string, notes?: string): string {
  const fragment = buildClientNotesFragment(notes);
  const trimmed = notes?.trim();
  if (!fragment || !trimmed) return stripEnrichmentBoilerplate(text);

  const body = preparePromptBodyForClientNotes(text, trimmed);
  if (!body) return `${fragment}.`;
  return `${body}. ${fragment}.`;
}

export function prependClientNotes(text: string, notes?: string): string {
  const fragment = buildClientNotesFragment(notes);
  const trimmed = notes?.trim();
  if (!fragment || !trimmed) return stripEnrichmentBoilerplate(text);

  const body = preparePromptBodyForClientNotes(text, trimmed);
  if (!body) return `${fragment}.`;
  return `${fragment}. ${body}.`;
}

export function appendStylePreferenceFragments(text: string, input?: StylePreferenceInput): string {
  const fragments = buildStylePreferenceFragments(input);
  if (!fragments.length) return text;
  return `${text.replace(/\s*\.?\s*$/, '')}. ${fragments.join('. ')}`;
}
