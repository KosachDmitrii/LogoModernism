import type { BrainConsolidateResult, BrainTenantScope } from '@logo-platform/shared';
import type {
  BrainExperienceRow,
  BrainTasteSignalRow,
  DatabaseClient,
  LearnedPrincipleRow,
} from '../storage/database-types';
import { embedText } from '../embedding/embedding.service';
import { searchExperienceEmbeddings } from '../storage/pgvector';

function normalizeFragment(fragment: string): string {
  return fragment.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export async function consolidateBrain(
  client: DatabaseClient,
  scope?: BrainTenantScope,
): Promise<BrainConsolidateResult> {
  let mergedPrinciples = 0;
  let prunedPrinciples = 0;
  let deduplicatedExperiences = 0;
  let updatedWeights = 0;

  const principleScope = scopedWhere(scope);
  const { rows: principles } = await client.query<LearnedPrincipleRow>(
    `SELECT * FROM learned_design_principles
     ${principleScope.clause}
     ORDER BY weight DESC, confidence DESC`,
    principleScope.values,
  );

  const fragmentIndex = new Map<string, string>();

  for (const principle of principles) {
    const key = normalizeFragment(principle.promptFragment);
    const existingId = fragmentIndex.get(key);

    if (existingId && existingId !== principle.id) {
      const keeper = await client.maybeOne<LearnedPrincipleRow>(
        'SELECT * FROM learned_design_principles WHERE id = $1',
        [existingId],
      );
      if (!keeper) continue;

      await client.query(
        `UPDATE learned_design_principles
         SET weight = $2, confidence = $3, source_ids = $4, anti_patterns = $5,
             tags = $6, updated_at = NOW()
         WHERE id = $1`,
        [
          keeper.id,
          Math.min(3, keeper.weight + principle.weight * 0.25),
          Math.min(1, (keeper.confidence + principle.confidence) / 2),
          [...new Set([...keeper.sourceIds, ...principle.sourceIds])],
          [...new Set([...keeper.antiPatterns, ...principle.antiPatterns])],
          [...new Set([...keeper.tags, ...principle.tags])],
        ],
      );

      await client.query('DELETE FROM learned_design_principles WHERE id = $1', [principle.id]);
      mergedPrinciples += 1;
      updatedWeights += 1;
      continue;
    }

    fragmentIndex.set(key, principle.id);
  }

  const weakScope = scopedWhere(scope, 2);
  const { rows: weak } = await client.query<LearnedPrincipleRow>(
    `SELECT * FROM learned_design_principles
     WHERE weight < $1 AND confidence < $2
       ${weakScope.filters.length ? `AND ${weakScope.filters.join(' AND ')}` : ''}`,
    [0.35, 0.25, ...weakScope.values],
  );

  for (const principle of weak) {
    if (principle.sourceIds.length > 2) continue;
    await client.query('DELETE FROM learned_design_principles WHERE id = $1', [principle.id]);
    prunedPrinciples += 1;
  }

  const signalScope = scopedWhere(scope);
  const { rows: tasteSignals } = await client.query<BrainTasteSignalRow>(
    `SELECT * FROM design_brain_taste_signals
     ${signalScope.clause}
     ORDER BY created_at DESC
     LIMIT 200`,
    signalScope.values,
  );

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
      const matchScope = scopedWhere(scope, 1);
      const principle = await client.maybeOne<LearnedPrincipleRow>(
        `SELECT * FROM learned_design_principles
         WHERE (id = $1 OR prompt_fragment = $1)
           ${matchScope.filters.length ? `AND ${matchScope.filters.join(' AND ')}` : ''}
         ORDER BY created_at ASC
         LIMIT 1`,
        [principleId, ...matchScope.values],
      );
      if (!principle) continue;

      await client.query(
        `UPDATE learned_design_principles
         SET weight = $2, confidence = $3, updated_at = NOW()
         WHERE id = $1`,
        [
          principle.id,
          Math.max(0.1, Math.min(3, principle.weight + delta)),
          Math.max(0.1, Math.min(1, principle.confidence + delta * 0.5)),
        ],
      );
      updatedWeights += 1;
    }
  }

  const experienceScope = scopedWhere(scope);
  const { rows: experiences } = await client.query<BrainExperienceRow>(
    `SELECT * FROM design_brain_experiences
     ${experienceScope.clause}
     ORDER BY created_at DESC
     LIMIT 100`,
    experienceScope.values,
  );

  for (const experience of experiences) {
    try {
      const embedding = await embedText(`${experience.title ?? ''}\n${experience.summary ?? ''}\n${experience.content.slice(0, 400)}`);
      const matches = await searchExperienceEmbeddings(
        client,
        embedding,
        3,
        undefined,
        scope?.organizationId,
        scope?.projectId,
      );
      const duplicate = matches.find(
        (match) => match.experienceId !== experience.id && match.similarity > 0.97,
      );

      if (duplicate) {
        await client.query('DELETE FROM design_brain_experiences WHERE id = $1', [experience.id]);
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

function scopedWhere(
  scope?: BrainTenantScope,
  parameterOffset = 0,
): { clause: string; filters: string[]; values: unknown[] } {
  const values: unknown[] = [];
  const filters: string[] = [];
  if (scope?.organizationId) {
    values.push(scope.organizationId);
    filters.push(`organization_id = $${parameterOffset + values.length}`);
  }
  if (scope?.projectId) {
    values.push(scope.projectId);
    filters.push(`project_id = $${parameterOffset + values.length}`);
  }
  return {
    clause: filters.length ? `WHERE ${filters.join(' AND ')}` : '',
    filters,
    values,
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
