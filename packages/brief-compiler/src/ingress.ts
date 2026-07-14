import type { BrainGenerateRequest, LogoMarkType } from '@logo-platform/shared';
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

function resolveMarkType(request: BrainGenerateRequest): LogoMarkType {
  return request.markType ?? (request.companyName?.trim() ? 'combination' : 'wordmark');
}

export function buildCanonicalBrief(request: BrainGenerateRequest): CanonicalBrief {
  const brief = request.briefContext;
  const referenceId = request.catalogReferenceIds?.[0];
  const entry = referenceId ? getCatalogEntry(referenceId) : undefined;

  return {
    industry: sanitizeIngressText(request.industry),
    companyName: request.companyName?.trim() || undefined,
    era: canonicalizeEra(brief?.narrative, request.preferredEra),
    inspiration: parseInspirationMood(brief?.personality, request.inspirationMode),
    minimalism: minimalismFromLevel(request.minimalismLevel, brief?.complexity),
    markType: resolveMarkType(request),
    typographyStyle: request.typographyStyle ?? 'standard',
    shapes: normalizeShapes(brief?.preferredShapes, brief?.geometry),
    construction: normalizeConstruction(brief?.construction),
    composition: normalizeComposition(brief?.composition),
    colorPalette: brief?.colorPalette ?? 'black_white',
    colorSelections: brief?.colorSelections ?? [],
    clientNotes: sanitizeIngressText(brief?.clientNotes ?? ''),
    forbiddenMotifs: extractForbiddenMotifs(brief?.clientNotes, brief?.constraints),
    allowShadows: brief?.allowShadows ?? false,
    allowPhotoreal: brief?.allowPhotoreal ?? false,
    reference: entry ? extractReferenceProfile(entry) : undefined,
  };
}
