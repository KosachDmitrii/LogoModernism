import './load-env';
import { db, disconnect } from '../src';

const organizationId = process.env.LEGACY_ORGANIZATION_ID?.trim();
const projectId = process.env.LEGACY_PROJECT_ID?.trim();
if (!organizationId) {
  throw new Error('LEGACY_ORGANIZATION_ID is required');
}

async function main(): Promise<void> {
  const organization = await db.maybeOne<{ id: string }>(
    'SELECT id FROM organizations WHERE id = $1',
    [organizationId],
  );
  if (!organization) throw new Error(`Organization not found: ${organizationId}`);

  if (projectId) {
    const project = await db.maybeOne<{ id: string }>(
      'SELECT id FROM projects WHERE id = $1 AND organization_id = $2',
      [projectId, organizationId],
    );
    if (!project) throw new Error('LEGACY_PROJECT_ID does not belong to the organization');
  }

  const counts = await db.transaction(async (tx) => {
    const values = [organizationId, projectId ?? null];
    const prompts = await tx.query(
      `UPDATE generated_prompts
       SET organization_id = $1, project_id = $2, updated_at = NOW()
       WHERE organization_id IS NULL`,
      values,
    );
    const experiences = await tx.query(
      `UPDATE design_brain_experiences
       SET organization_id = $1, project_id = $2, updated_at = NOW()
       WHERE organization_id IS NULL`,
      values,
    );
    const signals = await tx.query(
      `UPDATE design_brain_taste_signals
       SET organization_id = $1, project_id = $2
       WHERE organization_id IS NULL`,
      values,
    );
    const principles = await tx.query(
      `UPDATE learned_design_principles
       SET organization_id = $1, project_id = $2, updated_at = NOW()
       WHERE organization_id IS NULL`,
      values,
    );
    return { prompts, experiences, signals, principles };
  });
  console.log(
    JSON.stringify({
      organizationId,
      projectId: projectId ?? null,
      updated: {
        generatedPrompts: counts.prompts.rowCount,
        brainExperiences: counts.experiences.rowCount,
        tasteSignals: counts.signals.rowCount,
        learnedPrinciples: counts.principles.rowCount,
      },
    }),
  );
}

void main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnect());
