import type { BrainConsolidateResult, BrainTenantScope } from '@logo-platform/shared';
import type { PrismaClient } from '@logo-platform/database';
import { embedText } from '../embedding/embedding.service';
import { searchExperienceEmbeddings } from '../storage/pgvector';

function normalizeFragment(fragment: string): string {
  return fragment.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export async function consolidateBrain(
  prisma: PrismaClient,
  scope?: BrainTenantScope,
): Promise<BrainConsolidateResult> {
  let mergedPrinciples = 0;
  let prunedPrinciples = 0;
  let deduplicatedExperiences = 0;
  let updatedWeights = 0;

  const principles = await prisma.learnedPrinciple.findMany({
    where: {
      ...(scope?.organizationId ? { organizationId: scope.organizationId } : {}),
      ...(scope?.projectId ? { projectId: scope.projectId } : {}),
    },
    orderBy: [{ weight: 'desc' }, { confidence: 'desc' }],
  });

  const fragmentIndex = new Map<string, string>();

  for (const principle of principles) {
    const key = normalizeFragment(principle.promptFragment);
    const existingId = fragmentIndex.get(key);

    if (existingId && existingId !== principle.id) {
      const keeper = await prisma.learnedPrinciple.findUnique({ where: { id: existingId } });
      if (!keeper) continue;

      await prisma.learnedPrinciple.update({
        where: { id: keeper.id },
        data: {
          weight: Math.min(3, keeper.weight + principle.weight * 0.25),
          confidence: Math.min(1, (keeper.confidence + principle.confidence) / 2),
          sourceIds: [...new Set([...keeper.sourceIds, ...principle.sourceIds])],
          antiPatterns: [...new Set([...keeper.antiPatterns, ...principle.antiPatterns])],
          tags: [...new Set([...keeper.tags, ...principle.tags])],
        },
      });

      await prisma.learnedPrinciple.delete({ where: { id: principle.id } });
      mergedPrinciples += 1;
      updatedWeights += 1;
      continue;
    }

    fragmentIndex.set(key, principle.id);
  }

  const weak = await prisma.learnedPrinciple.findMany({
    where: {
      AND: [{ weight: { lt: 0.35 } }, { confidence: { lt: 0.25 } }],
      ...(scope?.organizationId ? { organizationId: scope.organizationId } : {}),
      ...(scope?.projectId ? { projectId: scope.projectId } : {}),
    },
  });

  for (const principle of weak) {
    if (principle.sourceIds.length > 2) continue;
    await prisma.learnedPrinciple.delete({ where: { id: principle.id } });
    prunedPrinciples += 1;
  }

  const tasteSignals = await prisma.brainTasteSignal.findMany({
    where: {
      ...(scope?.organizationId ? { organizationId: scope.organizationId } : {}),
      ...(scope?.projectId ? { projectId: scope.projectId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  for (const signal of tasteSignals) {
    const metadata = (signal.metadata ?? {}) as Record<string, unknown>;
    const principleIds = Array.isArray(metadata.principleIds)
      ? (metadata.principleIds as string[])
      : [];

    const delta =
      signal.signalType === 'LIKE' || signal.signalType === 'APPROVE'
        ? signal.score * 0.05
        : signal.signalType === 'DISLIKE' || signal.signalType === 'REJECT'
          ? -Math.abs(signal.score) * 0.05
          : signal.score * 0.02;

    for (const principleId of principleIds) {
      const principle = await prisma.learnedPrinciple.findFirst({
        where: {
          OR: [{ id: principleId }, { promptFragment: principleId }],
          ...(scope?.organizationId ? { organizationId: scope.organizationId } : {}),
          ...(scope?.projectId ? { projectId: scope.projectId } : {}),
        },
      });
      if (!principle) continue;

      await prisma.learnedPrinciple.update({
        where: { id: principle.id },
        data: {
          weight: Math.max(0.1, Math.min(3, principle.weight + delta)),
          confidence: Math.max(0.1, Math.min(1, principle.confidence + delta * 0.5)),
        },
      });
      updatedWeights += 1;
    }
  }

  const experiences = await prisma.brainExperience.findMany({
    where: {
      ...(scope?.organizationId ? { organizationId: scope.organizationId } : {}),
      ...(scope?.projectId ? { projectId: scope.projectId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  for (const experience of experiences) {
    try {
      const embedding = await embedText(`${experience.title ?? ''}\n${experience.summary ?? ''}\n${experience.content.slice(0, 400)}`);
      const matches = await searchExperienceEmbeddings(
        prisma,
        embedding,
        3,
        undefined,
        scope?.organizationId,
        scope?.projectId,
      );
      const duplicate = matches.find(
        (match) => match.experience_id !== experience.id && match.similarity > 0.97,
      );

      if (duplicate) {
        await prisma.brainExperience.delete({ where: { id: experience.id } });
        deduplicatedExperiences += 1;
      }
    } catch {
      // Skip dedup when embeddings unavailable
    }
  }

  return {
    mergedPrinciples,
    prunedPrinciples,
    deduplicatedExperiences,
    updatedWeights,
    ranAt: new Date().toISOString(),
  };
}

export function scheduleNightlyConsolidation(
  run: () => Promise<BrainConsolidateResult>,
  hourUtc = 3,
): NodeJS.Timeout {
  const msPerHour = 60 * 60 * 1000;

  const tick = async () => {
    const now = new Date();
    if (now.getUTCHours() !== hourUtc) return;
    try {
      await run();
    } catch (error) {
      console.error('[design-brain] nightly consolidate failed:', error);
    }
  };

  return setInterval(tick, msPerHour);
}
