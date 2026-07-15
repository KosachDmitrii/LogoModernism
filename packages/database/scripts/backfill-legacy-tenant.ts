import './load-env';
import { prisma } from '../src';

const organizationId = process.env.LEGACY_ORGANIZATION_ID?.trim();
const projectId = process.env.LEGACY_PROJECT_ID?.trim();
if (!organizationId) {
  throw new Error('LEGACY_ORGANIZATION_ID is required');
}

async function main(): Promise<void> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!organization) throw new Error(`Organization not found: ${organizationId}`);

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });
    if (!project) throw new Error('LEGACY_PROJECT_ID does not belong to the organization');
  }

  const [prompts, experiences, signals, principles] = await prisma.$transaction([
    prisma.composedPromptRecord.updateMany({
      where: { organizationId: null },
      data: { organizationId, projectId },
    }),
    prisma.brainExperience.updateMany({
      where: { organizationId: null },
      data: { organizationId, projectId },
    }),
    prisma.brainTasteSignal.updateMany({
      where: { organizationId: null },
      data: { organizationId, projectId },
    }),
    prisma.learnedPrinciple.updateMany({
      where: { organizationId: null },
      data: { organizationId, projectId },
    }),
  ]);
  console.log(
    JSON.stringify({
      organizationId,
      projectId: projectId ?? null,
      updated: {
        generatedPrompts: prompts.count,
        brainExperiences: experiences.count,
        tasteSignals: signals.count,
        learnedPrinciples: principles.count,
      },
    }),
  );
}

void main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
