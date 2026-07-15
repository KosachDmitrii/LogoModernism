import type { BrainFeedbackInput, BrainIngestResult } from '@logo-platform/shared';
import type { Prisma, PrismaClient } from '@logo-platform/database';
import { embedText } from '../embedding/embedding.service';
import { createExperience } from '../storage/experience.repository';
import { upsertExperienceEmbedding } from '../storage/pgvector';
import {
  normalizeStructuredFeedback,
  structuredFeedbackMetadata,
} from '../learning/structured-feedback';

function scoreDelta(signalType: BrainFeedbackInput['signalType'], score: number): number {
  switch (signalType) {
    case 'LIKE':
    case 'APPROVE':
      return Math.max(0.1, score);
    case 'DISLIKE':
    case 'REJECT':
      return -Math.max(0.1, score);
    case 'RATING':
      return score >= 0 ? score / 10 : score;
    default:
      return score;
  }
}

export async function ingestFeedback(
  prisma: PrismaClient,
  input: BrainFeedbackInput,
): Promise<BrainIngestResult> {
  const structured = normalizeStructuredFeedback(input);
  const normalizedMetadata = structuredFeedbackMetadata(
    structured,
    (input.metadata ?? {}) as Record<string, unknown>,
  );

  const tasteSignal = await prisma.brainTasteSignal.create({
    data: {
      experienceId: input.experienceId,
      signalType: input.signalType,
      score: input.score,
      context: input.context,
      metadata: normalizedMetadata as Prisma.InputJsonValue,
      organizationId: input.organizationId,
      projectId: input.projectId,
    },
  });

  const experience = await createExperience(prisma, {
    sourceType: 'FEEDBACK',
    title: `Feedback: ${input.signalType}`,
    content: input.context,
    summary: `Taste signal ${input.signalType} (${input.score})`,
    metadata: {
      tasteSignalId: tasteSignal.id,
      linkedExperienceId: input.experienceId,
      signalType: input.signalType,
      scoreDelta: scoreDelta(input.signalType, input.score),
      ...normalizedMetadata,
    },
    organizationId: input.organizationId,
    projectId: input.projectId,
  });

  const embedding = await embedText(`${input.signalType}: ${input.context}`);
  await upsertExperienceEmbedding(prisma, experience.id, embedding);

  if (input.experienceId) {
    const linked = await prisma.brainExperience.findUnique({
      where: { id: input.experienceId },
    });

    const principleIds = Array.isArray((linked?.metadata as Record<string, unknown>)?.principleIds)
      ? ((linked?.metadata as Record<string, unknown>).principleIds as string[])
      : [];

    const delta = scoreDelta(input.signalType, input.score);
    for (const principleId of principleIds) {
      const principle = await prisma.learnedPrinciple.findFirst({
        where: {
          OR: [{ id: principleId }, { promptFragment: principleId }],
        },
      });
      if (!principle) continue;

      await prisma.learnedPrinciple.update({
        where: { id: principle.id },
        data: {
          weight: Math.max(0.1, Math.min(3, principle.weight + delta * 0.1)),
          confidence: Math.max(0.1, Math.min(1, principle.confidence + delta * 0.05)),
        },
      });
    }
  }

  return {
    experienceId: experience.id,
    sourceType: 'FEEDBACK',
    title: `Feedback: ${input.signalType}`,
    chunksStored: 1,
    principlesExtracted: 0,
    summary: input.context.slice(0, 200),
  };
}
