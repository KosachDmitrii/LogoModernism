import type {
  BrainFeedbackInput,
  StructuredFeedbackDimensions,
  StructuredFeedbackTag,
} from '@logo-platform/shared';

const VALID_TAGS = new Set<StructuredFeedbackTag>([
  'geometry',
  'typography',
  'color',
  'scalability',
  'brief_fit',
  'originality',
  'construction',
  'industry_fit',
]);

const BLOCKED_METADATA_KEY =
  /^(?:imageUrl|imageData|dataUrl|base64|b64_json|buffer|binary|fileData)$/i;
const MAX_METADATA_STRING_LENGTH = 4_000;
const MAX_METADATA_ARRAY_LENGTH = 50;
const MAX_METADATA_DEPTH = 4;

function sanitizeMetadataValue(value: unknown, depth: number): unknown {
  if (depth > MAX_METADATA_DEPTH) return undefined;
  if (typeof value === 'string') {
    if (/^data:image\//i.test(value)) return undefined;
    return value.slice(0, MAX_METADATA_STRING_LENGTH);
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_METADATA_ARRAY_LENGTH)
      .map((item) => sanitizeMetadataValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (typeof value !== 'object') return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 50)) {
    if (BLOCKED_METADATA_KEY.test(key)) continue;
    const next = sanitizeMetadataValue(item, depth + 1);
    if (next !== undefined) sanitized[key] = next;
  }
  return sanitized;
}

export function sanitizeTasteMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  return sanitizeMetadataValue(metadata, 0) as Record<string, unknown>;
}

export function normalizeStructuredFeedback(
  input: BrainFeedbackInput,
): StructuredFeedbackDimensions {
  const metadata = (input.metadata ?? {}) as Record<string, unknown>;
  const worked = Array.isArray(metadata.workedTags)
    ? (metadata.workedTags as string[])
        .map((t) => t.toLowerCase())
        .filter((t): t is StructuredFeedbackTag => VALID_TAGS.has(t as StructuredFeedbackTag))
    : [];
  const missed = Array.isArray(metadata.missedTags)
    ? (metadata.missedTags as string[])
        .map((t) => t.toLowerCase())
        .filter((t): t is StructuredFeedbackTag => VALID_TAGS.has(t as StructuredFeedbackTag))
    : [];

  const text = input.context.toLowerCase();
  if (text.includes('16px') || text.includes('small size') || text.includes('scalab')) {
    if (input.signalType === 'LIKE' || input.signalType === 'APPROVE') {
      if (!worked.includes('scalability')) worked.push('scalability');
    } else if (input.signalType === 'DISLIKE' || input.signalType === 'REJECT') {
      if (!missed.includes('scalability')) missed.push('scalability');
    }
  }

  if (text.includes('brief') || text.includes('constraint') || text.includes('client')) {
    if (input.signalType === 'LIKE' || input.signalType === 'APPROVE') {
      if (!worked.includes('brief_fit')) worked.push('brief_fit');
    } else if (input.signalType === 'DISLIKE' || input.signalType === 'REJECT') {
      if (!missed.includes('brief_fit')) missed.push('brief_fit');
    }
  }

  return {
    workedTags: worked,
    missedTags: missed,
    scalability: metadata.scalability as StructuredFeedbackDimensions['scalability'],
    briefFit: metadata.briefFit as StructuredFeedbackDimensions['briefFit'],
    originality: metadata.originality as StructuredFeedbackDimensions['originality'],
  };
}

export function structuredFeedbackMetadata(
  dimensions: StructuredFeedbackDimensions,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return sanitizeTasteMetadata({
    ...extra,
    workedTags: dimensions.workedTags ?? [],
    missedTags: dimensions.missedTags ?? [],
    scalability: dimensions.scalability,
    briefFit: dimensions.briefFit,
    originality: dimensions.originality,
  });
}
