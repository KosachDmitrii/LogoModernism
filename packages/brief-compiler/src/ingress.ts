import type { BrainGenerateRequest, LogoMarkType } from '@logo-platform/shared';
import { deriveRebusWordmark, extractDesiredMotifsFromText } from '@logo-platform/shared';
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
  const references = (request.catalogReferenceIds ?? [])
    .map((referenceId) => getCatalogEntry(referenceId))
    .filter(Boolean)
    .map((entry) => extractReferenceProfile(entry!));
  const selectedShapes = brief?.selectedShapes?.map(sanitizeIngressText).filter(Boolean) ?? [];
  const shapes = normalizeShapes(
    selectedShapes.length > 0 ? selectedShapes.join(', ') : brief?.preferredShapes,
    selectedShapes.length > 0 ? undefined : brief?.geometry,
  );
  const clientContext = [
    brief?.personality ? `Brand personality: ${sanitizeIngressText(brief.personality)}` : '',
    brief?.primaryEmotion ? `Desired emotion: ${sanitizeIngressText(brief.primaryEmotion)}` : '',
    brief?.narrative ? `Brand narrative: ${sanitizeIngressText(brief.narrative)}` : '',
    brief?.constraints ? `Additional design guidance: ${sanitizeIngressText(brief.constraints)}` : '',
  ].filter(Boolean);

  return {
    industry: sanitizeIngressText(request.industry),
    companyName: request.companyName?.trim() || undefined,
    era: canonicalizeEra(brief?.narrative, request.preferredEra),
    inspiration: parseInspirationMood(brief?.personality, request.inspirationMode),
    minimalism: minimalismFromLevel(request.minimalismLevel, brief?.complexity),
    markType: resolveMarkType(request, rebusWordmark),
    typographyStyle,
    typographyDetails: sanitizeIngressText(brief?.typography ?? ''),
    shapes,
    shapeRequirement:
      selectedShapes.length === 1
        ? 'required'
        : selectedShapes.length > 1
          ? 'at_least_one'
          : 'automatic',
    construction: normalizeConstruction(brief?.construction),
    composition: resolveComposition(brief, rebusWordmark),
    colorPalette: brief?.colorPalette ?? 'black_white',
    colorSelections: brief?.colorSelections ?? [],
    clientNotes: sanitizeIngressText(brief?.clientNotes ?? ''),
    clientContext,
    desiredMotifs: extractDesiredMotifsFromText(
      [brief?.clientNotes, brief?.constraints, brief?.narrative].filter(Boolean).join('. '),
    ),
    forbiddenMotifs: extractForbiddenMotifs(brief?.clientNotes, brief?.constraints),
    allowShadows:
      brief?.renderEffectMode === 'shadow' || brief?.renderEffectMode === 'shadow_3d'
        ? true
        : brief?.allowShadows ?? false,
    allowPhotoreal:
      brief?.renderEffectMode === '3d' || brief?.renderEffectMode === 'shadow_3d'
        ? true
        : brief?.allowPhotoreal ?? false,
    rebusWordmark,
    styleIsExplicit: Boolean(brief?.colorPalette || brief?.renderEffectMode),
    references,
  };
}
