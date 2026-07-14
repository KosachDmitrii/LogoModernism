import type { BrainGenerateRequest, LogoMarkType } from '@logo-platform/shared';
import { deriveRebusWordmark } from '@logo-platform/shared';
import { getCatalogEntry } from '@logo-platform/knowledge-base';
import type { CanonicalBrief } from './types';
import {
  canonicalizeEra,
  extractForbiddenMotifs,
  minimalismFromLevel,
  normalizeComposition,
  normalizeConstruction,
  normalizeShapes,
  parseInspirationMood,
  sanitizeIngressText,
} from './normalizers';
import { extractReferenceProfile } from './reference-extractor';

function resolveMarkType(request: BrainGenerateRequest, rebusWordmark: boolean): LogoMarkType {
  if (rebusWordmark) return 'wordmark';
  if (request.markType) return request.markType;
  return request.companyName?.trim() ? 'combination' : 'wordmark';
}

function resolveTypographyStyle(request: BrainGenerateRequest, rebusWordmark: boolean) {
  if (rebusWordmark && request.typographyStyle !== 'rebus') return 'rebus' as const;
  return request.typographyStyle ?? 'standard';
}

function resolveComposition(brief: BrainGenerateRequest['briefContext'], rebusWordmark: boolean): string {
  const normalized = normalizeComposition(brief?.composition);
  if (rebusWordmark && (normalized === 'symmetry' || !brief?.composition?.trim())) {
    return 'negative space figure-ground';
  }
  return normalized;
}

export function buildCanonicalBrief(request: BrainGenerateRequest): CanonicalBrief {
  const brief = request.briefContext;
  const rebusWordmark = deriveRebusWordmark(request.typographyStyle, request.rebusWordmark === true);
  const typographyStyle = resolveTypographyStyle(request, rebusWordmark);
  const referenceId = request.catalogReferenceIds?.[0];
  const entry = referenceId ? getCatalogEntry(referenceId) : undefined;

  return {
    industry: sanitizeIngressText(request.industry),
    companyName: request.companyName?.trim() || undefined,
    era: canonicalizeEra(brief?.narrative, request.preferredEra),
    inspiration: parseInspirationMood(brief?.personality, request.inspirationMode),
    minimalism: minimalismFromLevel(request.minimalismLevel, brief?.complexity),
    markType: resolveMarkType(request, rebusWordmark),
    typographyStyle,
    shapes: normalizeShapes(brief?.preferredShapes, brief?.geometry),
    construction: normalizeConstruction(brief?.construction),
    composition: resolveComposition(brief, rebusWordmark),
    colorPalette: brief?.colorPalette ?? 'black_white',
    colorSelections: brief?.colorSelections ?? [],
    clientNotes: sanitizeIngressText(brief?.clientNotes ?? ''),
    forbiddenMotifs: extractForbiddenMotifs(brief?.clientNotes, brief?.constraints),
    allowShadows: brief?.allowShadows ?? false,
    allowPhotoreal: brief?.allowPhotoreal ?? false,
    rebusWordmark,
    reference: entry ? extractReferenceProfile(entry) : undefined,
  };
}
