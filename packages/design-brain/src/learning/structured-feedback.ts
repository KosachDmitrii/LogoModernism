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
  return {
    ...extra,
    workedTags: dimensions.workedTags ?? [],
    missedTags: dimensions.missedTags ?? [],
    scalability: dimensions.scalability,
    briefFit: dimensions.briefFit,
    originality: dimensions.originality,
  };
}
