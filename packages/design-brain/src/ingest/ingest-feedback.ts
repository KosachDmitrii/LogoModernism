import type { BrainFeedbackInput, BrainIngestResult } from '@logo-platform/shared';
import { randomUUID } from 'node:crypto';
import type {
  BrainExperienceRow,
  BrainTasteSignalRow,
  DatabaseClient,
  LearnedPrincipleRow,
} from '../storage/database-types';
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
  client: DatabaseClient,
  input: BrainFeedbackInput,
): Promise<BrainIngestResult> {
  if (!input.organizationId) {
    throw new Error('Organization scope is required for feedback ingest');
  }
  const linkedValues: unknown[] = input.experienceId
    ? [input.experienceId, input.organizationId]
    : [];
  const linkedFilters = ['id = $1', 'organization_id = $2'];
  if (input.projectId) {
    linkedValues.push(input.projectId);
    linkedFilters.push(`project_id = $${linkedValues.length}`);
  }
  const linked = input.experienceId
    ? await client.maybeOne<BrainExperienceRow>(
        `SELECT * FROM design_brain_experiences WHERE ${linkedFilters.join(' AND ')}`,
        linkedValues,
      )
    : null;
  if (input.experienceId && !linked) {
    throw new Error('Experience not found in the active organization');
  }

  const structured = normalizeStructuredFeedback(input);
  const normalizedMetadata = structuredFeedbackMetadata(
    structured,
    (input.metadata ?? {}) as Record<string, unknown>,
  );

  const tasteSignal = await client.one<BrainTasteSignalRow>(
    `INSERT INTO design_brain_taste_signals
       (id, experience_id, signal_type, score, context, metadata, organization_id, project_id, created_at)
     VALUES ($1, $2, $3::"TasteSignalType", $4, $5, $6::jsonb, $7, $8, NOW())
     RETURNING *`,
    [
      randomUUID(),
      input.experienceId ?? null,
      input.signalType,
      input.score,
      input.context,
      JSON.stringify(normalizedMetadata),
      input.organizationId,
      input.projectId ?? null,
    ],
  );

  const experience = await createExperience(client, {
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
  await upsertExperienceEmbedding(client, experience.id, embedding);

  if (linked) {
    const principleIds = Array.isArray((linked?.metadata as Record<string, unknown>)?.principleIds)
      ? ((linked?.metadata as Record<string, unknown>).principleIds as string[])
      : [];

    const delta = scoreDelta(input.signalType, input.score);
    for (const principleId of principleIds) {
      const values: unknown[] = [input.organizationId, principleId];
      const filters = ['organization_id = $1', '(id = $2 OR prompt_fragment = $2)'];
      if (input.projectId) {
        values.push(input.projectId);
        filters.push(`project_id = $${values.length}`);
      }
      const principle = await client.maybeOne<LearnedPrincipleRow>(
        `SELECT * FROM learned_design_principles
         WHERE ${filters.join(' AND ')}
         ORDER BY created_at ASC
         LIMIT 1`,
        values,
      );
      if (!principle) continue;

      await client.query(
        `UPDATE learned_design_principles
         SET weight = $2, confidence = $3, updated_at = NOW()
         WHERE id = $1`,
        [
          principle.id,
          Math.max(0.1, Math.min(3, principle.weight + delta * 0.1)),
          Math.max(0.1, Math.min(1, principle.confidence + delta * 0.05)),
        ],
      );
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
